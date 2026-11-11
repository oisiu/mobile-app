import { BranchEdit, planBranchEdit } from '@/domain/branchDay';
import { assertCalendarThreshold } from '@/domain/calendarThreshold';
import { validateEntry } from '@/domain/entries';
import { assertHabitAppearance } from '@/domain/habitAppearance';
import { assertHabitName } from '@/domain/habitName';
import type { HabitTypeChange } from '@/domain/habitTypeChange';
import { assertRootOnlyVisibility } from '@/domain/habitVisibility';
import { planImport, validateImport } from '@/domain/import';
import { archivedBranchIds, descendants, validateMove } from '@/domain/tree';
import type { TreeAttachment } from '@/domain/treeAttachments';
import { CreateHabitInput, Entry, EntryInput, ExportData, Habit } from '@/domain/types';
import { makeId } from '@/utils/id';
import { SQLiteDatabase } from 'expo-sqlite';
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
import { writeHabitTree } from './treeWrites';

export type { TreeDraftCreate, TreeDraftUpdate } from './treeDraft';

type HabitPatch = Partial<Pick<Habit, 'name' | 'emoji' | 'color' | 'calendarThreshold'>>;

const NEW_ROOT_KEY = '__new_root__';
const timestamp = () => new Date().toISOString();
const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'local';

function assertCreateInput(input: CreateHabitInput) {
  assertHabitName(input.name);
  assertCalendarThreshold(input.type, input.calendarThreshold);
  assertHabitAppearance(input.emoji, input.color);
  const isRoot = input.parentId === null;
  assertRootOnlyVisibility('hideFromOverview', input.hideFromOverview, isRoot);
  assertRootOnlyVisibility('isHidden', input.isHidden, isRoot);
}

function assertCreationParent(all: Habit[], parentId: string, type: Habit['type']) {
  const parent = all.find(habit => habit.id === parentId);
  if (!parent) throw new Error('Parent not found');
  if (parent.isGeneral || archivedBranchIds(all).has(parent.id)) throw new Error('Invalid creation destination');
  if (parent.type !== type) throw new Error('A branch must use one type');
}

/** Direct input on a parent is stored on its General child. */
function entryTarget(all: Habit[], habit: Habit): Habit {
  const children = all.filter(item => item.parentId === habit.id);
  if (!children.length) return habit;
  const general = children.find(item => item.isGeneral);
  if (!general) throw new Error('General child missing');
  return general;
}

export class HabitRepository {
  constructor(private db: SQLiteDatabase) {}

  habits() {
    return loadHabits(this.db);
  }

  entries(from?: string, to?: string) {
    return loadEntries(this.db, from, to);
  }

  async deleteAllData() {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM entries');
      await this.db.runAsync('DELETE FROM habits');
    });
  }

  async create(input: CreateHabitInput) {
    assertCreateInput(input);
    const now = timestamp();
    const id = makeId();
    await this.db.withTransactionAsync(async () => {
      if (input.parentId) {
        assertCreationParent(await this.habits(), input.parentId, input.type);
        await ensureGeneralChild(this.db, input.parentId, input.type, now);
      }
      await insertHabit(this.db, {
        id,
        parentId: input.parentId,
        name: input.name.trim(),
        emoji: input.emoji,
        type: input.type,
        sortOrder: await countChildren(this.db, input.parentId),
        color: input.color,
        calendarThreshold: input.calendarThreshold,
        hideFromOverview: input.hideFromOverview,
        isHidden: input.isHidden,
        createdAt: now,
      });
    });
    return id;
  }

  async update(id: string, patch: HabitPatch) {
    const previous = (await this.habits()).find(habit => habit.id === id);
    // An unchanged emoji may be a legacy value, so it is validated as empty.
    const emoji = patch.emoji === undefined || patch.emoji === previous?.emoji ? '' : patch.emoji;
    assertHabitAppearance(emoji, patch.color);
    assertCalendarThreshold(previous?.type ?? 'boolean', patch.calendarThreshold);
    if (patch.name !== undefined) assertHabitName(patch.name, previous?.name);
    await this.db.runAsync(
      'UPDATE habits SET name=COALESCE(?,name),emoji=COALESCE(?,emoji),color=CASE WHEN ? THEN ? ELSE color END,calendar_threshold=CASE WHEN ? THEN ? ELSE calendar_threshold END,updated_at=? WHERE id=?',
      [
        patch.name?.trim() ?? null,
        patch.emoji ?? null,
        Number(patch.color !== undefined),
        patch.color ?? null,
        Number(patch.calendarThreshold !== undefined),
        patch.calendarThreshold ?? null,
        timestamp(),
        id,
      ],
    );
  }

  async createTree(
    input: CreateHabitInput,
    updates: TreeDraftUpdate[],
    creates: TreeDraftCreate[],
    moves: TreeAttachment[],
    rootKey = NEW_ROOT_KEY,
  ) {
    const id = makeId();
    const resolveParent = <T extends { parentKey: string }>(item: T): T => ({
      ...item,
      parentKey: item.parentKey === rootKey ? id : item.parentKey,
    });
    await writeHabitTree(this.db, id, updates, creates.map(resolveParent), [], moves.map(resolveParent), input);
    return id;
  }

  async editTree(
    rootId: string,
    updates: TreeDraftUpdate[],
    creates: TreeDraftCreate[],
    deletes: string[],
    moves: TreeAttachment[] = [],
    typeChange?: HabitTypeChange,
  ) {
    await writeHabitTree(this.db, rootId, updates, creates, deletes, moves, undefined, typeChange);
  }

  async saveEntry(input: EntryInput) {
    const all = await this.habits();
    const habit = all.find(item => item.id === input.habitId);
    if (!habit) throw new Error('Habit not found');
    if (archivedBranchIds(all).has(habit.id)) throw new Error('Archived habits cannot receive entries');
    const error = validateEntry(habit.type, input.value, input.localDate);
    if (error) throw new Error(error);
    const target = entryTarget(all, habit);
    const now = timestamp();
    await this.db.runAsync(
      'INSERT INTO entries(id,habit_id,value,occurred_at,local_date,timezone,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(habit_id,local_date) DO UPDATE SET value=excluded.value,occurred_at=excluded.occurred_at,timezone=excluded.timezone,updated_at=excluded.updated_at',
      [
        makeId(),
        target.id,
        input.value,
        input.occurredAt ?? now,
        input.localDate,
        input.timezone ?? deviceTimezone(),
        now,
        now,
      ],
    );
  }

  async editBranchDay(habitId: string, date: string, expected: Entry[], edits: BranchEdit[], destination: string) {
    await this.db.withTransactionAsync(async () => {
      const habits = await this.habits();
      const root = habits.find(habit => habit.id === habitId);
      if (!root) throw new Error('BRANCH_DAY_CHANGED');
      const changes = planBranchEdit(habits, await this.entries(), root, date, expected, edits, destination);
      const now = timestamp();
      for (const { entry, value } of changes) {
        if (value === null) {
          await this.db.runAsync('DELETE FROM entries WHERE id=? AND local_date=?', [entry.id, date]);
        } else if (value !== entry.value || destination !== date) {
          await this.db.runAsync('UPDATE entries SET value=?,local_date=?,updated_at=? WHERE id=?', [
            value,
            destination,
            now,
            entry.id,
          ]);
        }
      }
    });
  }

  async clearEntry(habitId: string, date: string) {
    const all = await this.habits();
    const target = all.find(habit => habit.parentId === habitId && habit.isGeneral)?.id ?? habitId;
    await this.db.runAsync('DELETE FROM entries WHERE habit_id=? AND local_date=?', [target, date]);
  }

  async move(id: string, parentId: string | null, index: number) {
    if (!Number.isInteger(index)) throw new Error('Invalid move position');
    await this.db.withTransactionAsync(async () => {
      const all = await this.habits();
      const error = validateMove(all, id, parentId);
      if (error) throw new Error(error);
      const item = all.find(habit => habit.id === id)!;
      const parent = all.find(habit => habit.id === parentId);
      if (item.isGeneral || parent?.isGeneral || (parent && archivedBranchIds(all).has(parent.id))) {
        throw new Error('Invalid move destination');
      }
      const now = timestamp();
      const changesParent = item.parentId !== parentId;
      if (changesParent && parentId) await ensureGeneralChild(this.db, parentId, item.type, now);

      const siblings = all
        .filter(habit => habit.parentId === parentId && !habit.isGeneral && habit.id !== id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, item);

      // Root-only visibility flags are cleared when a habit leaves the top level.
      const isRoot = parentId === null;
      await this.db.runAsync(
        'UPDATE habits SET parent_id=?,hide_from_overview=?,is_hidden=?,updated_at=? WHERE id=?',
        [
          parentId,
          Number(isRoot && !!item.hideFromOverview),
          Number(isRoot && !!item.isHidden),
          changesParent ? now : item.updatedAt,
          id,
        ],
      );
      await normalizeSiblingOrder(this.db, item.parentId);
      for (let position = 0; position < siblings.length; position++) {
        await this.db.runAsync('UPDATE habits SET sort_order=? WHERE id=?', [position, siblings[position].id]);
      }
      if (changesParent) await collapseGeneralChild(this.db, item.parentId);
    });
  }

  async setHidden(id: string, hidden: boolean) {
    const habit = (await this.habits()).find(item => item.id === id);
    if (!habit || habit.parentId !== null || habit.isGeneral) throw new Error('Top-level habit not found');
    await this.db.runAsync('UPDATE habits SET is_hidden=?,updated_at=? WHERE id=?', [Number(hidden), timestamp(), id]);
  }

  async archive(id: string, archived: boolean) {
    const ids = await this.branchIds(id);
    const time = archived ? timestamp() : null;
    await this.db.withTransactionAsync(async () => {
      for (const habitId of ids) {
        await this.db.runAsync('UPDATE habits SET archived_at=? WHERE id=?', [time, habitId]);
      }
    });
  }

  async remove(id: string) {
    const item = (await this.habits()).find(habit => habit.id === id);
    if (!item) return;
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM habits WHERE id=?', [id]);
      await normalizeSiblingOrder(this.db, item.parentId);
      await collapseGeneralChild(this.db, item.parentId);
    });
  }

  async deletionImpact(id: string) {
    const all = await this.habits();
    const ids = [id, ...descendants(all, id).map(habit => habit.id)];
    const placeholders = ids.map(() => '?').join(',');
    const row = await this.db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) n FROM entries WHERE habit_id IN (${placeholders})`,
      ids,
    );
    return {
      habits: all.filter(habit => ids.includes(habit.id) && !habit.isGeneral).length,
      entries: row?.n ?? 0,
    };
  }

  async export(): Promise<ExportData> {
    return {
      version: 1,
      exportedAt: timestamp(),
      habits: await this.habits(),
      entries: await this.entries(),
    };
  }

  async import(raw: unknown) {
    const incoming = validateImport(raw);
    await this.db.withTransactionAsync(async () => {
      const existing = await this.export();
      const merged = planImport(existing, incoming);
      await this.insertNewHabits(existing.habits, merged.habits);
      await this.mergeEntries(existing.entries, merged.entries);
    });
  }

  private async branchIds(id: string) {
    return [id, ...descendants(await this.habits(), id).map(habit => habit.id)];
  }

  private async insertNewHabits(existing: Habit[], merged: Habit[]) {
    const known = new Set(existing.map(habit => habit.id));
    const pending = merged.filter(habit => !known.has(habit.id));
    // Parents must precede children even when the file array is unordered.
    while (pending.length) {
      const index = pending.findIndex(habit => !habit.parentId || known.has(habit.parentId));
      const [habit] = pending.splice(index, 1);
      await insertHabit(this.db, habit);
      known.add(habit.id);
    }
  }

  private async mergeEntries(existing: Entry[], merged: Entry[]) {
    const previous = new Map(existing.map(entry => [entry.id, entry]));
    for (const entry of merged) {
      const saved = previous.get(entry.id);
      if (!saved) {
        await this.db.runAsync('INSERT INTO entries VALUES(?,?,?,?,?,?,?,?)', [
          entry.id,
          entry.habitId,
          entry.value,
          entry.occurredAt,
          entry.localDate,
          entry.timezone,
          entry.createdAt,
          entry.updatedAt,
        ]);
      } else if (saved.habitId !== entry.habitId) {
        // A leaf that gained children hands its records to General.
        await this.db.runAsync('UPDATE entries SET habit_id=? WHERE id=?', [entry.habitId, entry.id]);
      }
    }
  }
}
