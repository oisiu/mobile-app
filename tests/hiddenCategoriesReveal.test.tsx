import React, { useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { useHiddenCategoriesReveal } from '../src/features/home/useHiddenCategoriesReveal';
import { t } from '../src/i18n';

const mocks = vi.hoisted(() => ({ path: '/', focus: null as null | (() => () => void), success: vi.fn() }));
vi.mock('expo-router', () => ({
  usePathname: () => mocks.path,
  useFocusEffect: (effect: () => () => void) => {
    mocks.focus = effect;
  },
}));
let renderer: ReactTestRenderer, reveal: ReturnType<typeof useHiddenCategoriesReveal>, blur: () => void;
function Harness() {
  const current = useHiddenCategoriesReveal(mocks.success);
  useLayoutEffect(() => {
    reveal = current;
  });
  return null;
}
async function setup() {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.path = '/';
  await act(async () => {
    renderer = create(<Harness />);
  });
  await act(async () => {
    blur = mocks.focus!();
  });
}
async function path(value: string) {
  mocks.path = value;
  await act(async () => renderer.update(<Harness />));
}
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

it('keeps the revealed list through hidden Insights and Back, then hides it on the next ordinary departure', async () => {
  await setup();
  await act(async () => {
    reveal.tapTitle();
    reveal.tapTitle();
    reveal.tapTitle();
  });
  expect(reveal.visible).toBe(true);
  expect(mocks.success).toHaveBeenCalledExactlyOnceWith(t('hiddenCategoriesVisible'));
  await act(async () => {
    reveal.openDetail();
    blur();
  });
  await path('/insight/root');
  expect(reveal.visible).toBe(true);
  await path('/');
  await act(async () => {
    blur = mocks.focus!();
  });
  expect(reveal.visible).toBe(true);
  await act(async () => blur());
  expect(reveal.visible).toBe(false);
  expect(mocks.success).toHaveBeenCalledOnce();
});

it.each(['/calendar', '/settings', '/insights', '/habit/root'])(
  'ends temporary visibility when leaving the detail visit for %s',
  async destination => {
    await setup();
    await act(async () => {
      reveal.toggle();
      reveal.openDetail();
      blur();
    });
    await path('/insight/root');
    expect(reveal.visible).toBe(true);
    await path(destination);
    expect(reveal.visible).toBe(false);
    await path('/');
    await act(async () => {
      blur = mocks.focus!();
    });
    expect(reveal.visible).toBe(false);
  },
);

it('preserves no partial triple tap across the detail visit and allows hiding again immediately', async () => {
  await setup();
  await act(async () => {
    reveal.toggle();
    reveal.tapTitle();
    reveal.tapTitle();
    reveal.openDetail();
    blur();
  });
  await path('/insight/root');
  await path('/');
  await act(async () => {
    blur = mocks.focus!();
  });
  await act(async () => reveal.tapTitle());
  expect(reveal.visible).toBe(true);
  await act(async () => {
    reveal.tapTitle();
    reveal.tapTitle();
  });
  expect(reveal.visible).toBe(false);
  expect(mocks.success).toHaveBeenLastCalledWith(t('hiddenCategoriesConcealed'));
});

it('resets slow taps and hides ordinary reveals on blur', async () => {
  let now = 1000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  await setup();
  await act(async () => {
    reveal.tapTitle();
    now += 501;
    reveal.tapTitle();
    now += 1;
    reveal.tapTitle();
  });
  expect(reveal.visible).toBe(false);
  await act(async () => reveal.tapTitle());
  expect(reveal.visible).toBe(true);
  await act(async () => blur());
  expect(reveal.visible).toBe(false);
});
