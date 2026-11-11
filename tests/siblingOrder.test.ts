import { expect, it } from 'vitest';
import { planSiblingOrder, type SiblingPosition } from '../src/domain/siblingOrder';
import type { Habit } from '../src/domain/types';

const habit = (id: string, parentId: string | null, sortOrder = 0, isGeneral = false): Habit => ({
  id,
  parentId,
  sortOrder,
  isGeneral,
  name: id,
  emoji: '',
  type: 'number',
  archivedAt: null,
  createdAt: '',
  updatedAt: '',
});
const habits = [
  habit('root', null),
  habit('general', 'root', -1, true),
  habit('a', 'root'),
  habit('b', 'root', 1),
  habit('c', 'root', 2),
  habit('deep', 'a'),
  habit('deep2', 'a', 1),
];

it('plans independent sibling groups without changing the input or General', () => {
  const before = structuredClone(habits),
    positions = [
      { id: 'c', parentId: 'root', index: 0 },
      { id: 'a', parentId: 'root', index: 2 },
      { id: 'deep2', parentId: 'a', index: 0 },
    ];
  expect(planSiblingOrder(habits, positions)).toEqual([
    { id: 'c', index: 0 },
    { id: 'b', index: 1 },
    { id: 'a', index: 2 },
    { id: 'deep2', index: 0 },
    { id: 'deep', index: 1 },
  ]);
  expect(habits).toEqual(before);
  expect(positions[0].id).toBe('c');
  expect(planSiblingOrder(habits, [])).toEqual([]);
});

it('clamps a distant insertion to the end while preserving unmentioned siblings', () => {
  expect(planSiblingOrder(habits, [{ id: 'a', parentId: 'root', index: 99 }])).toEqual([
    { id: 'b', index: 0 },
    { id: 'c', index: 1 },
    { id: 'a', index: 2 },
  ]);
});

it.each([
  { id: 'missing', parentId: 'root', index: 0 },
  { id: 'general', parentId: 'root', index: 0 },
  { id: 'root', parentId: 'root', index: 0 },
  { id: 'a', parentId: 'wrong', index: 0 },
  ...[-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map(index => ({ id: 'a', parentId: 'root', index })),
])('rejects invalid position %j', position => {
  expect(() => planSiblingOrder(habits, [position])).toThrow('Invalid draft position');
});

it.each([
  [
    { id: 'a', parentId: 'root', index: 0 },
    { id: 'a', parentId: 'root', index: 1 },
  ],
  [
    { id: 'a', parentId: 'root', index: 0 },
    { id: 'b', parentId: 'root', index: 0 },
  ],
] satisfies SiblingPosition[][])('rejects duplicate habits or conflicting sibling slots', (...positions) => {
  expect(() => planSiblingOrder(habits, positions)).toThrow(/draft position/);
});
