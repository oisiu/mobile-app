import React, { useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { usePrefetchRoutes, useResponsiveNavigation } from '../src/features/useResponsiveNavigation';

const mocks = vi.hoisted(() => ({ push: vi.fn(), prefetch: vi.fn(), focus: null as null | (() => () => void) }));
vi.mock('expo-router', () => ({
  router: { push: mocks.push, prefetch: mocks.prefetch },
  useFocusEffect: (effect: () => () => void) => {
    mocks.focus = effect;
  },
}));
let renderer: ReactTestRenderer;
let navigation: ReturnType<typeof useResponsiveNavigation>;
function NavigationHarness() {
  const current = useResponsiveNavigation();
  useLayoutEffect(() => {
    navigation = current;
  });
  return null;
}
function PrefetchHarness({ routes }: { routes: string[] }) {
  usePrefetchRoutes(routes);
  return null;
}
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
const cancel = vi.fn((id: number) => frames.delete(id));
async function setup() {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal('cancelAnimationFrame', cancel);
  await act(async () => {
    renderer = create(<NavigationHarness />);
  });
  let blur = () => {};
  await act(async () => {
    blur = mocks.focus!();
  });
  return blur;
}
async function flushFrame() {
  const [id, callback] = [...frames.entries()][0];
  frames.delete(id);
  await act(async () => callback(0));
}
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  frames.clear();
  frameId = 0;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it('exposes pending navigation immediately and dispatches only the first tap on the next frame', async () => {
  await setup();
  await act(async () => {
    navigation.push('/habit/new');
    navigation.push('/insight/other');
  });
  expect(navigation.pending).toBe('/habit/new');
  expect(frames.size).toBe(1);
  expect(mocks.push).not.toHaveBeenCalled();
  await flushFrame();
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith('/habit/new');
  await act(async () => navigation.push('/insight/other'));
  expect(frames.size).toBe(0);
  expect(mocks.push).toHaveBeenCalledOnce();
});

it('cancels a queued route on blur and accepts a new route when focus returns', async () => {
  const blur = await setup();
  await act(async () => navigation.push('/insight/canceled'));
  await act(async () => blur());
  expect(cancel).toHaveBeenCalledWith(1);
  expect(frames.size).toBe(0);
  await act(async () => {
    mocks.focus!();
  });
  expect(navigation.pending).toBeNull();
  await act(async () => navigation.push('/insight/current'));
  await flushFrame();
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith('/insight/current');
});

it('does not cancel a completed frame when leaving after navigation', async () => {
  const blur = await setup();
  await act(async () => navigation.push('/habit/new'));
  await flushFrame();
  await act(async () => blur());
  expect(cancel).not.toHaveBeenCalled();
  await act(async () => {
    mocks.focus!();
  });
  await act(async () => navigation.push('/insight/next'));
  await flushFrame();
  expect(mocks.push.mock.calls).toEqual([['/habit/new'], ['/insight/next']]);
});

it('prefetches available routes, skips empty entries and reuses equivalent route arrays', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  await act(async () => {
    renderer = create(<PrefetchHarness routes={['/habit/new', '', '/insight/root']} />);
  });
  expect(mocks.prefetch.mock.calls).toEqual([['/habit/new'], ['/insight/root']]);
  await act(async () => renderer.update(<PrefetchHarness routes={['/habit/new', '', '/insight/root']} />));
  expect(mocks.prefetch).toHaveBeenCalledTimes(2);
  await act(async () => renderer.update(<PrefetchHarness routes={['/insight/child']} />));
  expect(mocks.prefetch).toHaveBeenLastCalledWith('/insight/child');
  expect(mocks.prefetch).toHaveBeenCalledTimes(3);
  await act(async () => renderer.update(<PrefetchHarness routes={[]} />));
  expect(mocks.prefetch).toHaveBeenCalledTimes(3);
});
