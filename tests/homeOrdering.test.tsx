import React, { useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { buildTree } from '../src/domain/tree';
import type { Habit } from '../src/domain/types';
import { visibleHomeHabits } from '../src/features/home/homeMatrix';
import { useHomeOrdering } from '../src/features/home/useHomeOrdering';

const mocks = vi.hoisted(() => ({
  app: {} as Record<string, unknown>,
  move: vi.fn(),
  refresh: vi.fn(),
  alert: vi.fn(),
  haptic: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('react-native', () => ({ Alert: { alert: mocks.alert } }));
vi.mock('expo-haptics', () => ({ impactAsync: mocks.haptic, ImpactFeedbackStyle: { Light: 'light' } }));
vi.mock('../src/features/AppProvider', () => ({ useApp: () => mocks.app }));
const habit = (id: string, sortOrder: number, parentId: string | null = null): Habit => ({
  id,
  name: id,
  sortOrder,
  parentId,
  type: 'boolean',
  emoji: '',
  isGeneral: false,
  archivedAt: null,
  createdAt: '',
  updatedAt: '',
});
let renderer: ReactTestRenderer;
let ordering: ReturnType<typeof useHomeOrdering>;
function Harness({ habits, expanded }: { habits: Habit[]; expanded: Set<string> }) {
  const tree = React.useMemo(() => buildTree(habits).filter(item => !item.isHidden), [habits]);
  const items = React.useMemo(() => visibleHomeHabits(tree, expanded), [tree, expanded]);
  const current = useHomeOrdering(tree, items);
  useLayoutEffect(() => {
    ordering = current;
  });
  return null;
}
async function setup(habits = [habit('a', 0), habit('b', 1), habit('c', 2)], expanded = new Set<string>()) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.move.mockResolvedValue(undefined);
  mocks.refresh.mockResolvedValue(undefined);
  mocks.app = { habits, repo: { move: mocks.move }, refresh: mocks.refresh };
  await act(async () => {
    renderer = create(<Harness habits={habits} expanded={expanded} />);
  });
}
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.clearAllMocks();
  mocks.move.mockReset();
  mocks.refresh.mockReset();
});

it('moves complete expanded groups using their visible height and saved sibling position', async () => {
  await setup(
    [habit('a', 0), habit('child', 0, 'a'), habit('deep', 0, 'child'), habit('b', 1), habit('c', 2)],
    new Set(['a', 'child']),
  );
  await act(async () => ordering.startDrag('c'));
  await act(async () => ordering.moveDrag(-220));
  expect(ordering.drag?.target).toBe(0);
  await act(async () => ordering.finishDrag());
  expect(mocks.move).toHaveBeenCalledWith('c', null, 0);
  expect(mocks.refresh).toHaveBeenCalledOnce();
  expect(ordering.drag).toBeNull();
});

it('preserves hidden siblings when calculating a visible category move', async () => {
  await setup([habit('a', 0), { ...habit('hidden', 1), isHidden: true }, habit('b', 2), habit('c', 3)]);
  await act(async () => ordering.reorder('a', 1));
  expect(mocks.move).toHaveBeenCalledWith('a', null, 2);
});

it('cancels drag without saving and ignores move/end events without an active drag', async () => {
  await setup();
  await act(async () => {
    ordering.moveDrag(100);
    ordering.finishDrag();
  });
  await act(async () => ordering.startDrag('a'));
  await act(async () => ordering.moveDrag(200));
  expect(ordering.drag?.target).toBe(2);
  await act(async () => ordering.cancelDrag());
  await act(async () => ordering.finishDrag());
  expect(ordering.drag).toBeNull();
  expect(mocks.move).not.toHaveBeenCalled();
});

it('blocks overlapping reorders and new drags during a write', async () => {
  await setup();
  let finish = () => {};
  mocks.move.mockImplementation(
    () =>
      new Promise<void>(resolve => {
        finish = resolve;
      }),
  );
  let pending: Promise<void>;
  await act(async () => {
    pending = ordering.reorder('a', 2);
  });
  expect(ordering.ordering).toBe(true);
  await act(async () => {
    void ordering.reorder('b', 0);
    ordering.startDrag('b');
  });
  expect(mocks.move).toHaveBeenCalledOnce();
  expect(ordering.drag).toBeNull();
  await act(async () => {
    finish();
    await pending!;
  });
  expect(ordering.ordering).toBe(false);
});

it('retains saved order after a failed move and releases the write guard', async () => {
  await setup();
  mocks.move.mockRejectedValueOnce(new Error('Move failed'));
  await act(async () => ordering.reorder('a', 2));
  expect(mocks.alert).toHaveBeenCalled();
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(ordering.ordering).toBe(false);
  await act(async () => ordering.reorder('a', 2));
  expect(mocks.move).toHaveBeenCalledTimes(2);
  expect(mocks.refresh).toHaveBeenCalledOnce();
});

it('skips unchanged and unavailable targets', async () => {
  await setup();
  await act(async () => {
    void ordering.reorder('a', 0);
    void ordering.reorder('a', 99);
  });
  expect(mocks.move).not.toHaveBeenCalled();
  expect(ordering.ordering).toBe(false);
  mocks.app = { ...mocks.app, repo: null };
  await act(async () => renderer.update(<Harness habits={[habit('a', 0), habit('b', 1)]} expanded={new Set()} />));
  await act(async () => ordering.reorder('a', 1));
  expect(mocks.move).not.toHaveBeenCalled();
});

it('rejects stale source callbacks after a category is hidden or removed', async () => {
  const habits = [habit('a', 0), habit('b', 1)];
  await setup(habits);
  const updated = [{ ...habits[0], isHidden: true }, habits[1]];
  mocks.app = { ...mocks.app, habits: updated };
  await act(async () => renderer.update(<Harness habits={updated} expanded={new Set()} />));
  await act(async () => {
    ordering.startDrag('a');
    void ordering.reorder('a', 0);
  });
  expect(ordering.drag).toBeNull();
  expect(mocks.move).not.toHaveBeenCalled();
  expect(mocks.haptic).not.toHaveBeenCalled();
});

it('cancels active dragging when the hierarchy changes before release', async () => {
  const habits = [habit('a', 0), habit('b', 1), habit('c', 2)];
  await setup(habits);
  await act(async () => ordering.startDrag('a'));
  await act(async () => ordering.moveDrag(200));
  expect(ordering.drag?.target).toBe(2);
  const updated = habits.filter(item => item.id !== 'b');
  mocks.app = { ...mocks.app, habits: updated };
  await act(async () => renderer.update(<Harness habits={updated} expanded={new Set()} />));
  expect(ordering.drag).toBeNull();
  await act(async () => ordering.finishDrag());
  expect(mocks.move).not.toHaveBeenCalled();
});

it('keeps distant drag destinations correct across many expanded categories', async () => {
  const roots = Array.from({ length: 30 }, (_, index) => habit(`root${index}`, index));
  const children = roots.flatMap(root => [habit(`${root.id}-one`, 0, root.id), habit(`${root.id}-two`, 1, root.id)]);
  await setup([...roots, ...children], new Set(roots.map(root => root.id)));
  await act(async () => ordering.startDrag('root0'));
  await act(async () => ordering.moveDrag(10000));
  expect(ordering.drag?.target).toBe(29);
  await act(async () => ordering.finishDrag());
  expect(mocks.move).toHaveBeenCalledWith('root0', null, 29);
});
