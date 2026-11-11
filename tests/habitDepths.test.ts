import { expect, it } from 'vitest';
import type { Habit } from '../src/domain/types';
import { habitDepths } from '../src/features/insights/habitDepths';
const habit = (id: string, parentId: string | null): Habit => ({
  id,
  parentId,
  name: id,
  type: 'boolean',
  emoji: '',
  sortOrder: 0,
  isGeneral: false,
  archivedAt: null,
  createdAt: '',
  updatedAt: '',
});

it('resolves unordered candidate paths relative to the available ancestors', () => {
  const candidates = [
    habit('deep', 'child'),
    habit('other', null),
    habit('child', 'root'),
    habit('root', 'outside'),
    habit('orphan', 'absent'),
  ];
  const depths = habitDepths(candidates);
  expect(candidates.map(item => depths.get(item.id))).toEqual([2, 0, 1, 0, 0]);
  expect(habitDepths([]).size).toBe(0);
});

it('handles large reversed hierarchies without recursion or repeated ancestor walks', () => {
  const candidates = Array.from({ length: 15000 }, (_, index) =>
    habit(String(index), index ? String(index - 1) : null),
  ).reverse();
  const depths = habitDepths(candidates);
  expect(depths.size).toBe(15000);
  for (let index = 0; index < 15000; index++) expect(depths.get(String(index))).toBe(index);
});
