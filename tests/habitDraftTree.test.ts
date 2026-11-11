import { expect, it } from 'vitest';
import type { TreeDraftCreate, TreeDraftUpdate } from '../src/data/repository';
import type { HabitNode } from '../src/domain/types';
import {
  addNode,
  changeNode,
  dropNode,
  flatten,
  fromNode,
  invalidThresholds,
  reorderNode,
  type DraftNode,
} from '../src/features/habitEditor/draftTree';

const draft = (key: string, children: DraftNode[] = []): DraftNode => ({
  key,
  name: key,
  emoji: '✨',
  color: null,
  calendarThreshold: null,
  children,
});
const stored = (id: string, children: HabitNode[] = []): HabitNode => ({
  id,
  name: id,
  emoji: '🌱',
  type: 'number',
  parentId: null,
  sortOrder: 0,
  isGeneral: false,
  archivedAt: null,
  createdAt: '',
  updatedAt: '',
  children,
});

it('copies saved hierarchy values into independent drafts with normalized optional fields', () => {
  const source = {
    ...stored('root', [{ ...stored('child'), color: 'green' as const, calendarThreshold: 3 }]),
    calendarThreshold: 2,
  };
  const result = fromNode(source);
  expect(result).toMatchObject({ key: 'root', id: 'root', color: null, calendarThreshold: 2 });
  expect(result.children[0]).toMatchObject({ key: 'child', id: 'child', color: 'green', calendarThreshold: 3 });
  const changed = changeNode([result], 'child', { name: 'Renamed', calendarThreshold: 4 });
  expect(changed[0].children[0].name).toBe('Renamed');
  expect(result.children[0].name).toBe('child');
  expect(source.children[0].calendarThreshold).toBe(3);
});

it('adds at either edge of a nested sibling group without moving other branches', () => {
  const initial = [draft('parent', [draft('one'), draft('two')]), draft('other')];
  const first = addNode(initial, 'parent', draft('new-first'), true);
  const last = addNode(first, 'parent', draft('new-last'));
  expect(last[0].children.map(node => node.key)).toEqual(['new-first', 'one', 'two', 'new-last']);
  expect(initial[0].children.map(node => node.key)).toEqual(['one', 'two']);
  expect(last[1]).toEqual(initial[1]);
  expect(addNode(initial, 'missing', draft('unused'))).toEqual(initial);
});

const nodeKeys = (nodes: DraftNode[]): string[] => nodes.flatMap(node => [node.key, ...nodeKeys(node.children)]);

it('removes a nested subtree while retaining siblings and source drafts', () => {
  const initial = [draft('root', [draft('removed', [draft('deep')]), draft('retained')])];
  const result = dropNode(initial, 'removed');
  expect(nodeKeys(result)).toEqual(['root', 'retained']);
  expect(nodeKeys(initial)).toEqual(['root', 'removed', 'deep', 'retained']);
  expect(dropNode(initial, 'missing')).toEqual(initial);
});

it('reorders whole subtrees only within their sibling group and ignores boundary moves', () => {
  const initial = [draft('root', [draft('one', [draft('deep')]), draft('two')]), draft('other')];
  const result = reorderNode(initial, 'one', 1);
  expect(result[0].children.map(node => node.key)).toEqual(['two', 'one']);
  expect(result[0].children[1]).toBe(initial[0].children[0]);
  expect(initial[0].children.map(node => node.key)).toEqual(['one', 'two']);
  expect(result[1]).toEqual(initial[1]);
  expect(reorderNode(initial, 'root', -1)).toBe(initial);
  expect(reorderNode(initial, 'other', 1)).toBe(initial);
  expect(reorderNode(initial, 'missing', 1)).toBe(initial);
  expect(result[1]).toBe(initial[1]);
});

it('flattens mixed existing and new nodes in preorder with exact sibling positions', () => {
  const existing = { ...draft('existing', [draft('new-child')]), id: 'existing' };
  const nodes = [draft('new-first'), existing, draft('new-last')];
  const updates: TreeDraftUpdate[] = [],
    creates: TreeDraftCreate[] = [];
  flatten(nodes, 'root', updates, creates);
  expect(updates.map(item => item.id)).toEqual(['existing']);
  expect(creates.map(({ key, parentKey, index }) => ({ key, parentKey, index }))).toEqual([
    { key: 'new-first', parentKey: 'root', index: 0 },
    { key: 'new-child', parentKey: 'existing', index: 0 },
    { key: 'new-last', parentKey: 'root', index: 2 },
  ]);
  expect(updates[0]).toMatchObject({ name: 'existing', color: null, calendarThreshold: null });
});

it('emits reordered existing positions among new and attached nodes without inventing reorders after insertion or deletion', () => {
  const one = { ...stored('one'), parentId: 'root', sortOrder: 0 },
    two = { ...stored('two'), parentId: 'root', sortOrder: 1 },
    removed = { ...stored('removed'), parentId: 'root', sortOrder: 2 };
  const nodes = [fromNode(two), draft('new'), fromNode({ ...stored('attached'), parentId: null }), fromNode(one)];
  const updates: TreeDraftUpdate[] = [],
    creates: TreeDraftCreate[] = [];
  flatten(nodes, 'root', updates, creates, [removed, two, one, stored('root')]);
  expect(updates.map(({ id, index }) => ({ id, index }))).toEqual([
    { id: 'two', index: 0 },
    { id: 'attached', index: 2 },
    { id: 'one', index: 3 },
  ]);
  expect(creates[0]).toMatchObject({ key: 'new', parentKey: 'root', index: 1 });
  const unchanged: TreeDraftUpdate[] = [];
  flatten([draft('new'), fromNode(one)], 'root', unchanged, [], [one, two, removed]);
  expect(unchanged[0].index).toBeUndefined();
});

it('validates nested thresholds without inheriting a parent threshold', () => {
  const valid = [{ ...draft('parent', [draft('child')]), calendarThreshold: 2 }];
  expect(invalidThresholds(valid, 'number')).toBe(false);
  expect(invalidThresholds(changeNode(valid, 'child', { calendarThreshold: 0 }), 'number')).toBe(true);
  expect(invalidThresholds(valid, 'boolean')).toBe(true);
  expect(invalidThresholds([], 'number')).toBe(false);
});
