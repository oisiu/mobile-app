import React, { useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { calendarScrollOffset } from '../src/features/insights/calendarScroll';
import { useCalendarNavigation } from '../src/features/insights/useCalendarNavigation';

vi.mock('react-native', () => ({}));
let renderer: ReactTestRenderer;
let navigation: ReturnType<typeof useCalendarNavigation>;
const scrollToOffset = vi.fn();
function Harness({ cellSize, initialDate }: { cellSize: number; initialDate?: string }) {
  const current = useCalendarNavigation('2026-09-08', cellSize, initialDate);
  useLayoutEffect(() => {
    navigation = current;
  });
  return null;
}
async function setup(cellSize = 18, initialDate?: string) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  await act(async () => {
    renderer = create(<Harness cellSize={cellSize} initialDate={initialDate} />);
  });
  navigation.scroll.current = { scrollToOffset } as unknown as NonNullable<typeof navigation.scroll.current>;
}
const contentWidth = (cellSize = 18) => navigation.weeks.length * (cellSize + 3) - 3;
const initialize = () => {
  navigation.onLayout(350);
  navigation.onContentSizeChange(contentWidth());
};
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.clearAllMocks();
});

it.each(['layout', 'content'] as const)(
  'opens the compact calendar at the latest weeks when %s arrives first',
  async first => {
    await setup();
    const width = contentWidth();
    if (first === 'layout') navigation.onLayout(350);
    else navigation.onContentSizeChange(width);
    expect(scrollToOffset).not.toHaveBeenCalled();
    if (first === 'layout') navigation.onContentSizeChange(width);
    else navigation.onLayout(350);
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: width - 350, animated: false });
    navigation.onLayout(400);
    navigation.onContentSizeChange(width);
    expect(scrollToOffset).toHaveBeenCalledOnce();
  },
);

it.each([18, 44])('centers a selected historical week with %s point cells', async cellSize => {
  const selected = '2025-06-18';
  await setup(cellSize, selected);
  const width = contentWidth(cellSize),
    week = Math.floor(navigation.dates.indexOf(selected) / 7);
  navigation.onContentSizeChange(width);
  navigation.onLayout(350);
  expect(scrollToOffset).toHaveBeenCalledWith({
    offset: calendarScrollOffset(week, cellSize + 3, cellSize, 350, width),
    animated: false,
  });
  expect(navigation.weeks[navigation.initialWeek + 3]).toContain(selected);
});

it('ignores scrolling and month actions until both measurements are ready', async () => {
  await setup();
  const start = navigation.start;
  await act(async () => {
    navigation.loadEarlier();
    navigation.moveMonth(-1);
  });
  navigation.onContentSizeChange(contentWidth());
  await act(async () => navigation.loadEarlier());
  expect(navigation.start).toBe(start);
  expect(scrollToOffset).not.toHaveBeenCalled();
});

it('keeps short content at zero without negative offsets', async () => {
  await setup();
  navigation.onLayout(2000);
  navigation.onContentSizeChange(contentWidth());
  expect(scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: false });
});

it('loads one history batch for overlapping drag, momentum and duplicate size events', async () => {
  await setup();
  initialize();
  const original = navigation.weeks,
    initialWeek = navigation.initialWeek,
    oldWidth = contentWidth();
  navigation.onScroll(0);
  await act(async () => {
    navigation.loadEarlier();
    navigation.loadEarlier();
  });
  const extended = navigation.weeks;
  expect(extended.length).toBeGreaterThan(original.length);
  expect(extended.slice(-original.length)).toEqual(original);
  expect(navigation.initialWeek).toBe(initialWeek);
  navigation.onContentSizeChange(oldWidth);
  await act(async () => {
    navigation.loadEarlier();
    navigation.moveMonth(-1);
  });
  expect(navigation.weeks).toBe(extended);
  navigation.onContentSizeChange(contentWidth());
  navigation.onScroll(300);
  await act(async () => navigation.loadEarlier());
  expect(navigation.weeks).toBe(extended);
  navigation.onScroll(0);
  await act(async () => navigation.loadEarlier());
  expect(navigation.weeks.length).toBeGreaterThan(extended.length);
  // Native maintainVisibleContentPosition owns viewport preservation on prepend.
  expect(scrollToOffset).toHaveBeenCalledOnce();
});

it('loads older history for month navigation and waits before positioning its target', async () => {
  await setup();
  initialize();
  navigation.onScroll(0);
  scrollToOffset.mockClear();
  const oldWidth = contentWidth();
  await act(async () => navigation.moveMonth(-1));
  const extended = navigation.weeks;
  navigation.onContentSizeChange(oldWidth);
  await act(async () => navigation.moveMonth(-1));
  expect(navigation.weeks).toBe(extended);
  expect(scrollToOffset).not.toHaveBeenCalled();
  navigation.onContentSizeChange(contentWidth());
  const target = navigation.dates.findIndex(date => date >= '2026-03-01');
  expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: Math.floor(target / 7) * 21, animated: false });
  navigation.onContentSizeChange(contentWidth());
  expect(scrollToOffset).toHaveBeenCalledOnce();
});

it('uses the new programmatic position for repeated month navigation', async () => {
  await setup();
  initialize();
  const index = navigation.weeks.findIndex(week => week.includes('2026-07-01'));
  navigation.onScroll(index * 21);
  navigation.moveMonth(-1);
  const first = scrollToOffset.mock.lastCall![0].offset;
  navigation.moveMonth(-1);
  const second = scrollToOffset.mock.lastCall![0].offset;
  expect(second).toBeLessThan(first);
  expect(scrollToOffset.mock.lastCall![0].animated).toBe(true);
});

it('clamps future month navigation to the current month and loaded bounds', async () => {
  await setup();
  initialize();
  navigation.onScroll(100000);
  navigation.moveMonth(1);
  const target = navigation.dates.findIndex(date => date >= '2026-09-01');
  expect(scrollToOffset).toHaveBeenLastCalledWith({
    offset: Math.min(Math.floor(target / 7) * 21, contentWidth() - 350),
    animated: true,
  });
});

it('treats negative native overscroll as the beginning of history', async () => {
  await setup();
  initialize();
  const start = navigation.start;
  navigation.onScroll(-40);
  await act(async () => navigation.loadEarlier());
  expect(navigation.start < start).toBe(true);
});
