import { describe, expect, it } from 'vitest';
import { buildFrequency, buildFrequencyBuckets } from '../src/domain/frequency';
import { Entry, Habit } from '../src/domain/types';
const now = '2026-09-08T12:00:00Z';
const habit: Habit = {
  id: 'a',
  name: 'Reading',
  emoji: '📖',
  type: 'boolean',
  parentId: null,
  isGeneral: false,
  sortOrder: 0,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
};
const entry = (date: string, value = 1, habitId = 'a'): Entry => ({
  id: habitId + date,
  habitId,
  localDate: date,
  value,
  occurredAt: now,
  timezone: 'UTC',
  createdAt: now,
  updatedAt: now,
});

const bucket = (...dates: string[]) => ({ key: dates[0] ?? 'empty', label: 'Period', dates: new Set(dates) });
describe('Frequency chart', () => {
  it('counts only selected elapsed dates and excludes outside records', () => {
    const { rows } = buildFrequency(
      habit,
      [habit],
      [entry('2026-09-01'), entry('2026-09-08'), entry('2026-09-15')],
      [bucket('2026-09-01', '2026-09-08')],
    );
    expect(rows[1][0]).toMatchObject({ count: 2, possible: 2, intensity: 1, size: 22 });
    expect(rows[0][0]).toMatchObject({ possible: 0, intensity: 0, size: 4 });
  });
  it('keeps no activity at the smallest size and handles empty periods', () => {
    expect(
      buildFrequency(habit, [habit], [], [bucket('2026-09-08'), bucket()])
        .rows.flat()
        .every(cell => cell.count === 0 && cell.size === 4 && cell.intensity === 0),
    ).toBe(true);
    expect(buildFrequency(habit, [habit], [], []).rows).toEqual(Array.from({ length: 7 }, () => []));
  });
  it('scales partial activity against the dates in each independent bucket', () => {
    const { rows } = buildFrequency(
      habit,
      [habit],
      [entry('2026-09-01'), entry('2026-10-06')],
      [bucket('2026-09-01', '2026-09-08'), bucket('2026-10-06')],
    );
    expect(rows[1][0]).toMatchObject({ count: 1, possible: 2, intensity: 0.5, size: 13 });
    expect(rows[1][1]).toMatchObject({ count: 1, possible: 1, intensity: 1, size: 22 });
  });
  it('accounts for leap dates and excludes zero records', () => {
    const { rows } = buildFrequency(
      habit,
      [habit],
      [entry('2024-02-01'), entry('2024-02-08', 0), entry('2024-02-29')],
      [bucket('2024-02-01', '2024-02-08', '2024-02-29')],
    );
    expect(rows[3][0]).toMatchObject({ possible: 3, count: 2, intensity: 2 / 3 });
  });
  it('counts a parent once per active date across its children', () => {
    const children = [
      { ...habit, id: 'b', parentId: 'a' },
      { ...habit, id: 'c', parentId: 'a' },
    ];
    const result = buildFrequency(
      habit,
      [habit, ...children],
      [entry('2026-09-01', 1, 'b'), entry('2026-09-01', 1, 'c'), entry('2026-09-08', 1, 'b')],
      [bucket('2026-09-01', '2026-09-08')],
    );
    expect(result.rows[1][0].count).toBe(2);
  });
});

it('shows twelve months without records and clips the current month to today', () => {
  const buckets = buildFrequencyBuckets([entry('2030-01-01')], '2026-02-08');
  expect(buckets).toHaveLength(12);
  expect(buckets[0].key).toBe('2025-03-01');
  expect(buckets.at(-2)?.key).toBe('2026-01-01');
  expect(buckets.at(-2)?.dates.size).toBe(31);
  expect(buckets.at(-1)?.key).toBe('2026-02-01');
  expect(buckets.at(-1)?.dates.size).toBe(8);
});

it('extends to the first recorded month and counts only elapsed occurrences of each weekday', () => {
  const entries = [entry('2024-02-29'), entry('2026-02-05'), entry('2026-02-12')];
  const buckets = buildFrequencyBuckets(entries, '2026-02-08');
  expect(buckets[0].key).toBe('2024-02-01');
  expect(buckets).toHaveLength(25);
  const { rows } = buildFrequency(habit, [habit], entries, buckets);
  expect(rows[3][0]).toMatchObject({ count: 1, possible: 5, intensity: 0.2 });
  expect(rows[3].at(-1)).toMatchObject({ count: 1, possible: 1, intensity: 1 });
});
