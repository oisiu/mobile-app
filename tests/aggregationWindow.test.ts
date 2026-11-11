import { expect, it } from 'vitest';
import { aggregate, aggregateByDate } from '../src/domain/aggregation';
import type { Entry, Habit } from '../src/domain/types';

const habit = (id: string, parentId: string | null, type: Habit['type']): Habit => ({
  id,
  parentId,
  type,
  name: id,
  emoji: '',
  sortOrder: 0,
  isGeneral: false,
  archivedAt: null,
  createdAt: '',
  updatedAt: '',
});
const entry = (habitId: string, value: number, localDate: string): Entry => ({
  id: habitId + localDate,
  habitId,
  value,
  localDate,
  occurredAt: '',
  timezone: 'UTC',
  createdAt: '',
  updatedAt: '',
});

it.each(['boolean', 'number', 'duration'] as const)(
  'preserves %s daily totals across deep, General, archived and unrelated records',
  type => {
    const habits = [
      habit('root', null, type),
      habit('branch', 'root', type),
      habit('leaf', 'branch', type),
      { ...habit('general', 'branch', type), isGeneral: true },
      { ...habit('archived', 'root', type), archivedAt: '2026-01-01' },
      habit('other', null, type),
    ];
    const entries = [
      entry('leaf', type === 'boolean' ? 1 : 4, '2026-01-02'),
      entry('general', type === 'boolean' ? 1 : 2, '2026-01-02'),
      entry('archived', type === 'boolean' ? 1 : 3, '2026-01-02'),
      entry('leaf', 0, '2026-01-03'),
      entry('branch', 99, '2026-01-02'),
      entry('other', 99, '2026-01-02'),
    ];
    const dates = ['2026-01-03', '2026-01-02', '2026-01-01'];
    const values = aggregateByDate(habits, entries, 'root', dates);
    expect([...values]).toEqual([
      ['2026-01-03', 0],
      ['2026-01-02', type === 'boolean' ? 1 : 9],
      ['2026-01-01', 0],
    ]);
    for (const id of habits.map(habit => habit.id))
      for (const date of dates) {
        expect(aggregateByDate(habits, entries, id, dates).get(date)).toBe(
          aggregate(habits, entries, id, new Set([date])),
        );
      }
  },
);

it('returns zero for unknown habits, preserves requested order, and accepts empty windows', () => {
  expect([...aggregateByDate([], [], 'missing', ['2026-01-02', '2026-01-01'])]).toEqual([
    ['2026-01-02', 0],
    ['2026-01-01', 0],
  ]);
  expect(aggregateByDate([habit('root', null, 'number')], [], 'root', []).size).toBe(0);
});
