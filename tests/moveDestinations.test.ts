import { describe, expect, it } from 'vitest';
import { canMoveHabit, moveDestinations, moveSummary } from '../src/domain/moveDestinations';
import type { Habit, HabitType } from '../src/domain/types';

const now = '2026-01-01T00:00:00.000Z';
const habit = (id: string, parentId: string | null = null, extra: Partial<Habit> = {}): Habit => ({
  id,
  parentId,
  name: id,
  emoji: '',
  type: 'boolean' as HabitType,
  sortOrder: 0,
  isGeneral: false,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
  ...extra,
});

/**
 * Sport → Gym → Legs, Sport → Run
 * Health → Recovery
 * Reading (quantity), Old (archived) → Dusty
 */
const habits: Habit[] = [
  habit('Sport', null, { sortOrder: 0 }),
  habit('Sport general', 'Sport', { isGeneral: true, sortOrder: -1 }),
  habit('Gym', 'Sport', { sortOrder: 0 }),
  habit('Legs', 'Gym'),
  habit('Run', 'Sport', { sortOrder: 1 }),
  habit('Health', null, { sortOrder: 1 }),
  habit('Recovery', 'Health'),
  habit('Reading', null, { type: 'number', sortOrder: 2 }),
  habit('Old', null, { archivedAt: now, sortOrder: 3 }),
  habit('Dusty', 'Old'),
];
const paths = (id: string) => moveDestinations(habits, id).map(item => item.path);

describe('Move destinations', () => {
  it('offers same-type habits outside the branch, in display order with full paths', () => {
    expect(paths('Gym')).toEqual(['Sport / Run', 'Health', 'Health / Recovery']);
  });

  it('leaves out the current parent, the habit itself and its own sub-habits', () => {
    const offered = paths('Gym');
    expect(offered).not.toContain('Sport');
    expect(offered).not.toContain('Sport / Gym');
    expect(offered).not.toContain('Sport / Gym / Legs');
  });

  it('leaves out other types, General placeholders and archived branches', () => {
    const offered = paths('Health');
    expect(offered).toEqual(['Sport', 'Sport / Gym', 'Sport / Gym / Legs', 'Sport / Run']);
    expect(paths('Reading')).toEqual([]);
  });

  it('returns nothing for an unknown habit', () => {
    expect(moveDestinations(habits, 'missing')).toEqual([]);
  });

  it('handles very deep trees without recursion limits', () => {
    const deep: Habit[] = [habit('target')];
    for (let level = 0; level < 5000; level++) deep.push(habit(`level${level}`, level ? `level${level - 1}` : null));
    expect(moveDestinations(deep, 'target')).toHaveLength(5000);
  });
});

describe('Movable habits', () => {
  it('allows active habits at any depth', () => {
    expect(canMoveHabit(habits, 'Sport')).toBe(true);
    expect(canMoveHabit(habits, 'Legs')).toBe(true);
  });

  it('blocks General placeholders, archived branches and unknown habits', () => {
    expect(canMoveHabit(habits, 'Sport general')).toBe(false);
    expect(canMoveHabit(habits, 'Old')).toBe(false);
    expect(canMoveHabit(habits, 'Dusty')).toBe(false);
    expect(canMoveHabit(habits, 'missing')).toBe(false);
  });
});

describe('Move summary', () => {
  it('counts real sub-habits and every record in the branch, including General', () => {
    const entries = [
      { habitId: 'Sport general' },
      { habitId: 'Legs' },
      { habitId: 'Legs' },
      { habitId: 'Run' },
      { habitId: 'Recovery' },
    ];
    expect(moveSummary(habits, entries, 'Sport')).toEqual({ habits: 3, records: 4 });
    expect(moveSummary(habits, entries, 'Gym')).toEqual({ habits: 1, records: 2 });
    expect(moveSummary(habits, entries, 'Run')).toEqual({ habits: 0, records: 1 });
  });
});
