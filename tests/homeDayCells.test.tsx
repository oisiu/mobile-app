import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import type { HabitNode } from '../src/domain/types';
import { HOME_CHUNK_DAYS, homeDateWindow, homeDayChunks, homeHistoryDays } from '../src/features/home/dateWindow';
import { HomeDateCells, HomeDayCells } from '../src/features/home/HomeDayCells';
import { light } from '../src/theme';
import { addDays } from '../src/utils/dates';

vi.mock('react-native', () => ({ Pressable: 'Pressable', View: 'View', Text: 'Text', Platform: { OS: 'android' } }));
vi.mock('../src/theme/Typography', () => ({ Text: 'Text' }));
vi.mock('../src/features/home/homeStyles', () => ({ s: { cell: {}, cellText: {}, day: {}, dayNum: {} } }));
vi.mock('../src/i18n', () => ({ t: (key: string) => key }));

const today = '2026-09-08';
const habit: HabitNode = {
  id: 'reading',
  parentId: null,
  name: 'Reading',
  emoji: '📖',
  type: 'boolean',
  sortOrder: 0,
  isGeneral: false,
  archivedAt: null,
  createdAt: today,
  updatedAt: today,
  children: [],
};
const onToggle = vi.fn();
const onBranch = vi.fn();

/** Mounted chunks and values for a first visible day, as the Home screen derives them. */
function windowAt(firstDay: number, active: string[] = []) {
  const range = homeDateWindow(firstDay, homeHistoryDays(firstDay, 60));
  const days = Array.from({ length: range.end - range.start }, (_, index) => addDays(today, -range.start - index));
  return { chunks: homeDayChunks(days), values: new Map(days.map(date => [date, active.includes(date) ? '✓' : '–'])) };
}

function Row({ firstDay, active }: { firstDay: number; active?: string[] }) {
  const { chunks, values } = windowAt(firstDay, active);
  return (
    <>
      {chunks.map(dates => (
        <React.Fragment key={dates[0]}>
          <HomeDateCells dates={dates} today={today} c={light} dayWidth={50} />
          <HomeDayCells
            habit={habit}
            dates={dates}
            values={values}
            today={today}
            c={light}
            dayWidth={50}
            onToggle={onToggle}
            onBranch={onBranch}
          />
        </React.Fragment>
      ))}
    </>
  );
}

let renderer: ReactTestRenderer;
const cells = () => renderer.root.findAllByType('Pressable' as React.ElementType);
const cell = (date: string) => cells().find(node => node.props.accessibilityLabel.startsWith(`Reading, ${date},`));
const render = async (firstDay: number, active?: string[]) => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  await act(async () => {
    if (renderer) renderer.update(<Row firstDay={firstDay} active={active} />);
    else renderer = create(<Row firstDay={firstDay} active={active} />);
  });
};

afterEach(async () => {
  await act(async () => renderer.unmount());
  renderer = undefined as unknown as ReactTestRenderer;
  vi.clearAllMocks();
});

it('renders every mounted day with its value and routes presses to the habit and date', async () => {
  await render(0, [today]);
  expect(cells()).toHaveLength(4 * HOME_CHUNK_DAYS);
  expect(cell(today)!.props.accessibilityLabel).toBe(`Reading, ${today}, ✓`);
  const yesterday = cell(addDays(today, -1))!;
  await act(async () => yesterday.props.onPress());
  expect(onToggle).toHaveBeenCalledWith(habit, addDays(today, -1));
  await act(async () => yesterday.props.onLongPress());
  await act(async () => yesterday.props.onAccessibilityAction());
  expect(onBranch).toHaveBeenCalledTimes(2);
  expect(onBranch).toHaveBeenLastCalledWith(habit, addDays(today, -1));
});

it('leaves overlapping chunks untouched when the window shifts, even years into the past', async () => {
  for (const firstDay of [100, 1500, 20000]) {
    await render(firstDay);
    const kept = addDays(today, -firstDay);
    const before = cell(kept)!.props;
    // Crossing into the next chunk rebuilds the values map but keeps five of the six chunks.
    await render(firstDay + HOME_CHUNK_DAYS);
    expect(cell(kept)!.props).toBe(before);
    expect(cells()).toHaveLength(6 * HOME_CHUNK_DAYS);
    expect(cell(addDays(today, -firstDay - 5 * HOME_CHUNK_DAYS + 1))).toBeDefined();
  }
});

it('re-renders only the chunk whose value changed', async () => {
  const changed = addDays(today, -105);
  const untouched = addDays(today, -130);
  await render(100);
  const before = { changed: cell(changed)!.props, untouched: cell(untouched)!.props };
  await render(100, [changed]);
  expect(cell(changed)!.props).not.toBe(before.changed);
  expect(cell(changed)!.props.accessibilityLabel).toBe(`Reading, ${changed}, ✓`);
  expect(cell(untouched)!.props).toBe(before.untouched);
});

it('marks today in the date header and keeps header chunks aligned with value chunks', async () => {
  await render(0);
  const headers = renderer.root.findAll(
    node => node.type === ('View' as React.ElementType) && node.props.style?.[1]?.width === 50,
  );
  expect(headers).toHaveLength(cells().length);
  const numbers = renderer.root.findAllByType('Text' as React.ElementType).filter(node => node.props.style?.[1]?.color);
  expect(numbers.filter(node => node.props.style[1].color === light.accent)).toHaveLength(2);
});
