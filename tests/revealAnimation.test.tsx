import { useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useRevealAnimation } from '../src/features/useRevealAnimation';

const mocks = vi.hoisted(() => {
  const state = {
    reduceMotion: Promise.resolve(false) as Promise<boolean>,
    listener: undefined as undefined | ((value: boolean) => void),
    remove: vi.fn(),
    finish: undefined as undefined | ((result: { finished: boolean }) => void),
    timing: vi.fn(),
    setValue: vi.fn(),
    stopAnimation: vi.fn(),
  };
  return state;
});
vi.mock('react-native', () => ({
  AccessibilityInfo: {
    isReduceMotionEnabled: () => mocks.reduceMotion,
    addEventListener: (_event: string, listener: (value: boolean) => void) => {
      mocks.listener = listener;
      return { remove: mocks.remove };
    },
  },
  Animated: {
    Value: class {
      constructor(public initial: number) {}
      setValue = mocks.setValue;
      stopAnimation = mocks.stopAnimation;
    },
    timing: (value: unknown, config: unknown) => {
      mocks.timing(value, config);
      return { start: (done: (result: { finished: boolean }) => void) => (mocks.finish = done) };
    },
  },
}));

type Props = { waiting: boolean; initial?: 0 | 1; resetWhileWaiting?: boolean };
const onShown = vi.fn();
let renderer: ReactTestRenderer;
let value: { initial: number };
function Harness({ waiting, initial = 0, resetWhileWaiting }: Props) {
  const current = useRevealAnimation({
    waiting,
    initial,
    resetWhileWaiting,
    timing: { duration: 400, useNativeDriver: true },
    onShown,
  });
  useLayoutEffect(() => {
    value = current as unknown as { initial: number };
  });
  return null;
}
const render = async (props: Props) => {
  await act(async () => {
    if (renderer) renderer.update(<Harness {...props} />);
    else renderer = create(<Harness {...props} />);
  });
};

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  mocks.reduceMotion = Promise.resolve(false);
  mocks.listener = undefined;
  mocks.finish = undefined;
});
afterEach(async () => {
  await act(async () => renderer.unmount());
  renderer = undefined as unknown as ReactTestRenderer;
});

it('stays at its initial value while waiting and does not animate', async () => {
  await render({ waiting: true, initial: 1 });
  expect(value.initial).toBe(1);
  expect(mocks.timing).not.toHaveBeenCalled();
  expect(mocks.setValue).not.toHaveBeenCalled();
});

it('hides the content again while waiting only when asked to', async () => {
  await render({ waiting: true, resetWhileWaiting: true });
  expect(mocks.setValue).toHaveBeenCalledExactlyOnceWith(0);
});

it('animates to shown once ready and reports completion', async () => {
  await render({ waiting: false });
  expect(mocks.timing).toHaveBeenCalledExactlyOnceWith(value, { toValue: 1, duration: 400, useNativeDriver: true });
  expect(onShown).not.toHaveBeenCalled();
  await act(async () => mocks.finish!({ finished: true }));
  expect(onShown).toHaveBeenCalledOnce();
});

it('does not report completion for an interrupted animation', async () => {
  await render({ waiting: false });
  await act(async () => mocks.finish!({ finished: false }));
  expect(onShown).not.toHaveBeenCalled();
});

it.each(['enabled', 'unavailable'] as const)('shows the content immediately when Reduce Motion is %s', async mode => {
  mocks.reduceMotion = mode === 'enabled' ? Promise.resolve(true) : Promise.reject(new Error('unavailable'));
  await render({ waiting: false });
  expect(mocks.timing).not.toHaveBeenCalled();
  expect(mocks.setValue).toHaveBeenCalledExactlyOnceWith(1);
  expect(onShown).toHaveBeenCalledOnce();
});

it('jumps to shown when Reduce Motion is turned on mid-animation', async () => {
  await render({ waiting: false });
  await act(async () => mocks.listener!(true));
  expect(mocks.stopAnimation).toHaveBeenCalledOnce();
  expect(mocks.setValue).toHaveBeenLastCalledWith(1);
  expect(onShown).toHaveBeenCalledOnce();
  mocks.setValue.mockClear();
  await act(async () => mocks.listener!(false));
  expect(mocks.setValue).not.toHaveBeenCalled();
});

it('starts the reveal when waiting ends and cleans up on unmount', async () => {
  await render({ waiting: true, resetWhileWaiting: true });
  expect(mocks.timing).not.toHaveBeenCalled();
  await render({ waiting: false, resetWhileWaiting: true });
  expect(mocks.timing).toHaveBeenCalledOnce();
  const finish = mocks.finish!;
  await act(async () => renderer.unmount());
  expect(mocks.stopAnimation).toHaveBeenCalled();
  expect(mocks.remove).toHaveBeenCalledOnce();
  // A callback arriving after unmount must not report completion.
  finish({ finished: true });
  expect(onShown).not.toHaveBeenCalled();
  await render({ waiting: true });
});
