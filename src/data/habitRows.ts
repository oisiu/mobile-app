import type { Entry, Habit, HabitType } from '@/domain/types';
import { makeId } from '@/utils/id';
import type { SQLiteDatabase } from 'expo-sqlite';

interface HabitRow {
  id: string;
  parent_id: string | null;
  name: string;
  emoji: string;
  color: Habit['color'];
  calendar_threshold: number | null;
  hide_from_overview: number;
  is_hidden: number;
  type: HabitType;
  sort_order: number;
  is_general: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface EntryRow {
  id: string;
  habit_id: string;
  value: number;
  occurred_at: string;
  local_date: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

/** Fields needed to insert a habit; optional preferences default to unset. */
export type NewHabit = Pick<Habit, 'id' | 'parentId' | 'name' | 'emoji' | 'type' | 'sortOrder'> &
  Partial<Pick<Habit, 'isGeneral' | 'archivedAt' | 'color' | 'calendarThreshold' | 'hideFromOverview' | 'isHidden'>> & {
    createdAt: string;
    updatedAt?: string;
  };

const GENERAL_NAME = 'General';
const GENERAL_EMOJI = '•';
const GENERAL_SORT_ORDER = -1;

// Optional preferences are omitted rather than stored as null/false so exports stay minimal.
function toHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    emoji: row.emoji,
    ...(row.color ? { color: row.color } : {}),
    ...(row.hide_from_overview ? { hideFromOverview: true } : {}),
    ...(row.is_hidden ? { isHidden: true } : {}),
    ...(row.calendar_threshold != null ? { calendarThreshold: row.calendar_threshold } : {}),
    type: row.type,
    sortOrder: row.sort_order,
    isGeneral: !!row.is_general,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    habitId: row.habit_id,
    value: row.value,
    occurredAt: row.occurred_at,
    localDate: row.local_date,
    timezone: row.timezone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadHabits(db: SQLiteDatabase): Promise<Habit[]> {
  const rows = await db.getAllAsync<HabitRow>('SELECT * FROM habits ORDER BY parent_id,sort_order');
  return rows.map(toHabit);
}

export async function loadEntries(db: SQLiteDatabase, from?: string, to?: string): Promise<Entry[]> {
  const rows =
    from && to
      ? await db.getAllAsync<EntryRow>('SELECT * FROM entries WHERE local_date BETWEEN ? AND ?', [from, to])
      : await db.getAllAsync<EntryRow>('SELECT * FROM entries');
  return rows.map(toEntry);
}

export async function insertHabit(db: SQLiteDatabase, habit: NewHabit): Promise<void> {
  await db.runAsync(
    'INSERT INTO habits(id,parent_id,name,emoji,type,sort_order,is_general,archived_at,created_at,updated_at,color,calendar_threshold,hide_from_overview,is_hidden) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [
      habit.id,
      habit.parentId,
      habit.name,
      habit.emoji,
      habit.type,
      habit.sortOrder,
      Number(habit.isGeneral ?? false),
      habit.archivedAt ?? null,
      habit.createdAt,
      habit.updatedAt ?? habit.createdAt,
      habit.color ?? null,
      habit.calendarThreshold ?? null,
      Number(habit.hideFromOverview ?? false),
      Number(habit.isHidden ?? false),
    ],
  );
}

/** Counts real (non-General) children; `null` counts roots. */
export async function countChildren(db: SQLiteDatabase, parentId: string | null): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) n FROM habits WHERE parent_id IS ? AND is_general=0',
    [parentId],
  );
  return row?.n ?? 0;
}

/** Rewrites real sibling positions as `0..n-1`, keeping their current relative order. */
export async function normalizeSiblingOrder(db: SQLiteDatabase, parentId: string | null): Promise<void> {
  const rows = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM habits WHERE parent_id IS ? AND is_general=0 ORDER BY sort_order,id',
    [parentId],
  );
  for (let index = 0; index < rows.length; index++) {
    await db.runAsync('UPDATE habits SET sort_order=? WHERE id=?', [index, rows[index].id]);
  }
}

async function findGeneralChildId(db: SQLiteDatabase, parentId: string): Promise<string | undefined> {
  const row = await db.getFirstAsync<{ id: string }>('SELECT id FROM habits WHERE parent_id=? AND is_general=1', [
    parentId,
  ]);
  return row?.id;
}

/**
 * A habit about to gain children needs a General child to own its direct records.
 * Creates one if missing and moves the parent's records onto it.
 */
export async function ensureGeneralChild(
  db: SQLiteDatabase,
  parentId: string,
  type: HabitType,
  now: string,
): Promise<void> {
  if (await findGeneralChildId(db, parentId)) return;
  const generalId = makeId();
  await insertHabit(db, {
    id: generalId,
    parentId,
    name: GENERAL_NAME,
    emoji: GENERAL_EMOJI,
    type,
    sortOrder: GENERAL_SORT_ORDER,
    isGeneral: true,
    createdAt: now,
  });
  await db.runAsync('UPDATE entries SET habit_id=? WHERE habit_id=?', [generalId, parentId]);
}

/**
 * A habit that lost its last real child becomes a leaf again:
 * its General records move back onto it and General is removed.
 */
export async function collapseGeneralChild(db: SQLiteDatabase, parentId: string | null): Promise<void> {
  if (!parentId || (await countChildren(db, parentId))) return;
  const generalId = await findGeneralChildId(db, parentId);
  if (!generalId) return;
  await db.runAsync('UPDATE entries SET habit_id=? WHERE habit_id=?', [parentId, generalId]);
  await db.runAsync('DELETE FROM habits WHERE id=?', [generalId]);
}
