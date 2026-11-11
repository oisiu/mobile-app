import { assertCalendarThreshold } from '@/domain/calendarThreshold';
import { assertHabitAppearance } from '@/domain/habitAppearance';
import { assertHabitName } from '@/domain/habitName';
import { planHabitTypeChange, type HabitTypeChange } from '@/domain/habitTypeChange';
import { assertRootOnlyVisibility } from '@/domain/habitVisibility';
import { archivedBranchIds, descendants, validateMove } from '@/domain/tree';
import { validateAttachments, type TreeAttachment } from '@/domain/treeAttachments';
import type { CreateHabitInput, Habit } from '@/domain/types';
import { makeId } from '@/utils/id';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  collapseGeneralChild,
  countChildren,
  ensureGeneralChild,
  insertHabit,
  loadEntries,
  loadHabits,
  normalizeSiblingOrder,
} from './habitRows';
import type { TreeDraftCreate, TreeDraftUpdate } from './treeDraft';
import { applyTreeOrder } from './treeOrder';

interface TreeDraft {
  updates: TreeDraftUpdate[];
  creates: TreeDraftCreate[];
  deletes: string[];
  moves: TreeAttachment[];
}

const timestamp = () => new Date().toISOString();

const isInvalidPosition = (index: number | undefined) =>
  index !== undefined && (!Number.isSafeInteger(index) || index < 0);

const isOptionalBoolean = (value: unknown) => value === undefined || typeof value === 'boolean';

// This boundary keeps all hierarchy edits and conversions in one transaction.
export async function writeHabitTree(
  db: SQLiteDatabase,
  rootId: string,
  updates: TreeDraftUpdate[],
  creates: TreeDraftCreate[],
  deletes: string[],
  moves: TreeAttachment[],
  input?: CreateHabitInput,
  typeChange?: HabitTypeChange,
) {
  const draft: TreeDraft = { updates, creates, deletes, moves };
  await db.withTransactionAsync(async () => {
    if (input) await insertRoot(db, rootId, input);
    if (typeChange) await applyTypeChange(db, rootId, typeChange);

    const all = await loadHabits(db);
    const root = all.find(habit => habit.id === rootId && !habit.parentId && !habit.isGeneral);
    if (!root) throw new Error('Top-level habit not found');
    const deletedTree = validateDraft(all, root, draft);

    const now = timestamp();
    await applyUpdates(db, all, updates, deletedTree, now);
    await applyDeletes(db, all, deletes);
    const createdIds = await applyCreates(db, root, creates, now);
    await applyMoves(db, root, moves, createdIds, now);
    await applyTreeOrder(db, await loadHabits(db), updates, creates, moves, createdIds, deletedTree);
  });
}

async function insertRoot(db: SQLiteDatabase, rootId: string, input: CreateHabitInput) {
  assertHabitName(input.name);
  if (input.parentId !== null || !input.name.trim()) throw new Error('Invalid root');
  assertHabitAppearance(input.emoji, input.color);
  assertCalendarThreshold(input.type, input.calendarThreshold);
  if (!isOptionalBoolean(input.isHidden) || !isOptionalBoolean(input.hideFromOverview)) {
    throw new Error('Invalid visibility');
  }
  await insertHabit(db, {
    id: rootId,
    parentId: null,
    name: input.name.trim(),
    emoji: input.emoji,
    type: input.type,
    sortOrder: await countChildren(db, null),
    color: input.color,
    calendarThreshold: input.calendarThreshold,
    hideFromOverview: input.hideFromOverview,
    isHidden: input.isHidden,
    createdAt: timestamp(),
  });
}

async function applyTypeChange(db: SQLiteDatabase, rootId: string, typeChange: HabitTypeChange) {
  const plan = planHabitTypeChange(await loadHabits(db), await loadEntries(db), rootId, typeChange);
  const now = timestamp();
  for (const id of plan.habitIds) {
    await db.runAsync('UPDATE habits SET type=?,calendar_threshold=NULL,updated_at=? WHERE id=?', [
      typeChange.to,
      now,
      id,
    ]);
  }
  for (const { entry, value } of plan.entries) {
    if (entry.value === value) continue;
    await db.runAsync('UPDATE entries SET value=?,updated_at=? WHERE id=?', [value, now, entry.id]);
  }
}

/** Rejects an inconsistent draft before any write; returns every habit id removed by `deletes`. */
function validateDraft(all: Habit[], root: Habit, { updates, creates, deletes, moves }: TreeDraft) {
  const byId = new Map(all.map(habit => [habit.id, habit]));

  for (const item of updates) {
    // An unchanged emoji may be a legacy value, so it is validated as empty.
    assertHabitAppearance(item.emoji === byId.get(item.id)?.emoji ? '' : item.emoji, item.color);
  }
  for (const item of creates) {
    assertHabitAppearance(item.emoji, item.color);
    assertCalendarThreshold(root.type, item.calendarThreshold);
    if (isInvalidPosition(item.index)) throw new Error('Invalid draft position');
  }
  for (const item of updates) assertCalendarThreshold(root.type, item.calendarThreshold);
  for (const item of updates) assertHabitName(item.name, byId.get(item.id)?.name);
  for (const item of creates) assertHabitName(item.name);

  const allowed = validateAttachments(all, root.id, creates, moves);
  const deletedTree = new Set(deletes.flatMap(id => [id, ...descendants(all, id).map(habit => habit.id)]));
  if (deletes.some(id => id === root.id || !allowed.has(id))) throw new Error('Invalid subtree deletion');
  for (const item of updates) assertRootOnlyVisibility('hideFromOverview', item.hideFromOverview, item.id === root.id);
  for (const item of updates) assertRootOnlyVisibility('isHidden', item.isHidden, item.id === root.id);
  if (moves.some(item => deletedTree.has(item.id) || deletedTree.has(item.parentKey))) {
    throw new Error('Deleted attachment destination');
  }
  if (updates.some(item => !allowed.has(item.id))) throw new Error('Invalid habit update');
  const hasFixedPosition = (id: string) => id === root.id || !!byId.get(id)?.isGeneral;
  if (updates.some(item => isInvalidPosition(item.index) || (item.index !== undefined && hasFixedPosition(item.id)))) {
    throw new Error('Invalid draft position');
  }

  const archived = archivedBranchIds(all);
  const draftKeys = new Set<string>();
  for (const item of creates) {
    const parentKnown = allowed.has(item.parentKey) || draftKeys.has(item.parentKey);
    const keyTaken = byId.has(item.key) || draftKeys.has(item.key);
    if (keyTaken || !parentKnown || deletedTree.has(item.parentKey) || archived.has(item.parentKey)) {
      throw new Error('Invalid draft hierarchy');
    }
    draftKeys.add(item.key);
  }
  return deletedTree;
}

async function applyUpdates(
  db: SQLiteDatabase,
  all: Habit[],
  updates: TreeDraftUpdate[],
  deletedTree: Set<string>,
  now: string,
) {
  const byId = new Map(all.map(habit => [habit.id, habit]));
  for (const item of updates) {
    if (deletedTree.has(item.id)) continue;
    const saved = byId.get(item.id);
    // `undefined` keeps the saved preference; `null` clears it.
    const color = item.color === undefined ? (saved?.color ?? null) : item.color;
    const threshold =
      item.calendarThreshold === undefined ? (saved?.calendarThreshold ?? null) : item.calendarThreshold;
    await db.runAsync(
      'UPDATE habits SET name=?,emoji=?,color=?,hide_from_overview=?,is_hidden=?,calendar_threshold=?,updated_at=? WHERE id=?',
      [
        item.name.trim(),
        item.emoji,
        color,
        Number(item.hideFromOverview ?? saved?.hideFromOverview ?? false),
        Number(item.isHidden ?? saved?.isHidden ?? false),
        threshold,
        now,
        item.id,
      ],
    );
  }
}

async function applyDeletes(db: SQLiteDatabase, all: Habit[], deletes: string[]) {
  // Deleting a subtree root cascades, so nested selections are skipped.
  const isNested = (id: string) =>
    deletes.some(other => other !== id && descendants(all, other).some(habit => habit.id === id));
  const affectedParents = new Set<string>();
  for (const id of deletes.filter(item => !isNested(item))) {
    const parentId = all.find(habit => habit.id === id)?.parentId;
    if (parentId) affectedParents.add(parentId);
    await db.runAsync('DELETE FROM habits WHERE id=?', [id]);
  }
  for (const parentId of affectedParents) {
    const parent = await db.getFirstAsync<{ id: string }>('SELECT id FROM habits WHERE id=?', [parentId]);
    if (!parent) continue;
    await normalizeSiblingOrder(db, parentId);
    await collapseGeneralChild(db, parentId);
  }
}

/** Inserts draft children in preorder and returns their draft key → saved id map. */
async function applyCreates(db: SQLiteDatabase, root: Habit, creates: TreeDraftCreate[], now: string) {
  const ids = new Map<string, string>();
  for (const item of creates) {
    const parentId = ids.get(item.parentKey) ?? item.parentKey;
    const parent = await db.getFirstAsync<{ type: Habit['type']; archived_at: string | null }>(
      'SELECT type,archived_at FROM habits WHERE id=?',
      [parentId],
    );
    if (!parent || parent.archived_at) throw new Error('Parent not found');
    if (parent.type !== root.type) throw new Error('A branch must use one type');
    await ensureGeneralChild(db, parentId, root.type, now);
    const id = makeId();
    ids.set(item.key, id);
    await insertHabit(db, {
      id,
      parentId,
      name: item.name.trim(),
      emoji: item.emoji,
      type: root.type,
      sortOrder: await countChildren(db, parentId),
      color: item.color,
      calendarThreshold: item.calendarThreshold,
      createdAt: now,
    });
  }
  return ids;
}

async function applyMoves(
  db: SQLiteDatabase,
  root: Habit,
  moves: TreeAttachment[],
  createdIds: Map<string, string>,
  now: string,
) {
  for (const item of moves) {
    const parentId = createdIds.get(item.parentKey) ?? item.parentKey;
    const snapshot = await loadHabits(db);
    const error = validateMove(snapshot, item.id, parentId);
    const parent = snapshot.find(habit => habit.id === parentId);
    if (error || !parent || parent.isGeneral || parent.archivedAt) {
      throw new Error(error ?? 'Invalid attachment destination');
    }
    await ensureGeneralChild(db, parentId, root.type, now);
    // Attached roots lose their root-only visibility flags and inherit the destination's.
    await db.runAsync(
      'UPDATE habits SET parent_id=?,sort_order=?,hide_from_overview=0,is_hidden=0,updated_at=? WHERE id=?',
      [parentId, await countChildren(db, parentId), now, item.id],
    );
    await normalizeSiblingOrder(db, item.expectedParentId);
    await collapseGeneralChild(db, item.expectedParentId);
  }
}
