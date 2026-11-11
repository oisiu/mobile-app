import React, { useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { useHomeDates } from '../src/features/home/useHomeDates';
import { addDays } from '../src/utils/dates';

const mocks = vi.hoisted(() => ({ events: vi.fn(), setValue: vi.fn() }));
vi.mock('react-native', () => ({
  Animated: {
    Value: class {
      setValue = mocks.setValue;
    },
    multiply: (value: unknown, factor: number) => ({ value, factor }),
    event: mocks.events.mockImplementation(
      (mapping: unknown, config: { listener: (event: unknown) => void }) => config.listener,
    ),
  },
}));
let renderer: ReactTestRenderer;
let timeline: ReturnType<typeof useHomeDates>;
const scrollTo = vi.fn();
const event = (x: number) => ({ nativeEvent: { contentOffset: { x } } });
function Harness({ width, today = '2026-09-08' }: { width: number; today?: string }) {
  const current = useHomeDates(today, width);
  useLayoutEffect(() => {
    timeline = current;
  });
  return React.createElement('Snapshot', { days: current.days });
}
async function setup(width = 407) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  await act(async () => {
    renderer = create(<Harness width={width} />);
  });
  timeline.dateScroll.current = { scrollTo } as unknown as NonNullable<typeof timeline.dateScroll.current>;
}
const scroll = async (index: number) => {
  await act(async () => timeline.onDateScroll(event(index * timeline.dayWidth)));
};
const expectVisible = (index: number) => {
  for (let i = 0; i < 5; i++) expect(timeline.days).toContain(addDays('2026-09-08', -index - i));
};
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.clearAllMocks();
  scrollTo.mockReset();
});

it('moves header and value tracks with the native driver and starts at today', async () => {
  await setup();
  expect(timeline.firstDay).toBe(0);
  expect(timeline.dayWidth).toBe(50);
  expectVisible(0);
  expect(timeline.dateTrackX).toMatchObject({ factor: -1 });
  expect(mocks.events).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ useNativeDriver: true }));
  expect(scrollTo).not.toHaveBeenCalled();
});

it('renders the destination of a fast swipe before drag or momentum ends', async () => {
  await setup();
  await scroll(42);
  await scroll(95);
  expect(timeline.firstDay).toBe(95);
  expectVisible(95);
  expect(timeline.range.start).toBeGreaterThan(0);
  expect(timeline.historyDays).toBeGreaterThan(60);
});

it('extends older history during momentum and keeps rendering bounded through repeated swipes', async () => {
  await setup();
  for (const index of [15, 40, 65, 90, 115, 140, 165, 190]) {
    await scroll(index);
    expectVisible(index);
    expect(timeline.days.length).toBeLessThanOrEqual(120);
    expect(timeline.historyDays).toBeGreaterThanOrEqual(index + 100);
  }
});

it('reuses mounted days within the same scroll chunk', async () => {
  await setup();
  await scroll(20);
  const days = timeline.days;
  await scroll(21);
  expect(timeline.days).toBe(days);
  await scroll(39);
  expect(timeline.days).toBe(days);
  await scroll(40);
  expect(timeline.days).not.toBe(days);
  expectVisible(40);
});

it('uses the final native event even when no intermediate scroll events arrive', async () => {
  await setup();
  await act(async () => timeline.finishDateScroll(event(37 * timeline.dayWidth)));
  expect(timeline.firstDay).toBe(37);
  expectVisible(37);
  const history = timeline.historyDays;
  await act(async () => {
    timeline.finishDateScroll(event(37 * timeline.dayWidth));
    timeline.finishDateScroll(event(37 * timeline.dayWidth));
  });
  expect(timeline.historyDays).toBe(history);
});

it('mounts Today before snapping back from distant history', async () => {
  await setup();
  await scroll(50);
  await scroll(100);
  expect(timeline.days).not.toContain('2026-09-08');
  scrollTo.mockImplementation(() => {
    const days = renderer.root.findByType('Snapshot' as React.ElementType).props.days;
    expect(days).toContain('2026-09-08');
  });
  await act(async () => timeline.goToToday());
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: false });
  expect(mocks.setValue).toHaveBeenLastCalledWith(0);
  expectVisible(0);
});

it('preserves the visible date and corrects the native offset after a width change', async () => {
  await setup();
  await scroll(30);
  const days = timeline.days;
  await act(async () => renderer.update(<Harness width={607} />));
  expect(timeline.dayWidth).toBe(90);
  expect(timeline.firstDay).toBe(30);
  expect(timeline.days).toBe(days);
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 2700, animated: false });
  expect(mocks.setValue).toHaveBeenLastCalledWith(2700);
});

it('ignores layout widths that cannot show the date columns', async () => {
  await setup(100);
  expect(timeline.dayWidth).toBe(1);
  await act(async () => timeline.moveDates(-5));
  expect(scrollTo).not.toHaveBeenCalled();
  await act(async () => renderer.update(<Harness width={407} />));
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 250, animated: true });
  expectVisible(5);
});

it('navigates from the current visible position before a scroll-end event', async () => {
  await setup();
  await scroll(30);
  await act(async () => timeline.moveDates(-5));
  expect(timeline.firstDay).toBe(35);
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 1750, animated: true });
  await act(async () => timeline.moveDates(5));
  expect(timeline.firstDay).toBe(30);
  expectVisible(30);
});

it('coalesces rapid accessible steps and snaps long jumps without traversing unmounted dates', async () => {
  await setup();
  await act(async () => {
    for (let i = 0; i < 10; i++) timeline.moveDates(-5);
  });
  expect(timeline.firstDay).toBe(50);
  expectVisible(50);
  expect(scrollTo).toHaveBeenCalledOnce();
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 2500, animated: false });
});

it('clamps native overscroll and accessible navigation at today', async () => {
  await setup();
  await scroll(-10);
  expect(timeline.firstDay).toBe(0);
  await act(async () => timeline.moveDates(5));
  expect(timeline.firstDay).toBe(0);
  await scroll(10000);
  expect(timeline.firstDay).toBe(115);
  expectVisible(115);
});

it('rebases dates when the local day changes while preserving the historical position', async () => {
  await setup();
  await scroll(25);
  await act(async () => renderer.update(<Harness width={407} today="2026-09-09" />));
  expect(timeline.firstDay).toBe(25);
  expect(timeline.days).toContain(addDays('2026-09-09', -25));
});

it('does not leave a queued jump after a next-period action at today', async () => {
  await setup();
  await act(async () => timeline.moveDates(5));
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: true });
  scrollTo.mockClear();
  await scroll(30);
  expect(timeline.firstDay).toBe(30);
  expectVisible(30);
  expect(scrollTo).not.toHaveBeenCalled();
});

it('restores the historical header offset when columns remount at the same width', async () => {
  await setup();
  await scroll(30);
  scrollTo.mockClear();
  await act(async () => renderer.update(<Harness width={100} />));
  expect(scrollTo).not.toHaveBeenCalled();
  await act(async () => timeline.finishDateScroll(event(1500)));
  expect(timeline.firstDay).toBe(30);
  await act(async () => renderer.update(<Harness width={407} />));
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 1500, animated: false });
  expect(mocks.setValue).toHaveBeenLastCalledWith(1500);
  expectVisible(30);
});
