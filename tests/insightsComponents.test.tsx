import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Entry, Habit } from '../src/domain/types';
import { EntryRefreshError } from '../src/features/entryWriteError';
import { CalendarDialog } from '../src/features/insights/CalendarDialog';
import { ChartHeader, FilterModal, TimeGroupingMenu } from '../src/features/insights/DetailControls';
import { Frequency, Streaks } from '../src/features/insights/DetailStatistics';
import { t } from '../src/i18n';
import { light } from '../src/theme';

const mocks = vi.hoisted(() => ({ app: {} as Record<string, unknown>, alert: vi.fn(), scrollToEnd: vi.fn() }));
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'Button',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Modal: 'Modal',
  Alert: { alert: mocks.alert },
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
vi.mock('../src/features/AppProvider', () => ({ useApp: () => mocks.app }));
vi.mock('../src/features/SelectionPopover', () => ({
  SelectionPopover: ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement('Popover', props, children),
}));
vi.mock('../src/features/insights/CalendarWeekTimeline', () => ({ CalendarTimeline: 'Timeline' }));
vi.mock('../src/features/insights/CalendarEntryModal', () => ({ CalendarEntryModal: 'Editor' }));
vi.mock('../src/domain/entries', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/domain/entries')>();
  return { ...actual, todayLocal: (date?: Date) => (date ? actual.todayLocal(date) : '2026-09-08') };
});

const root: Habit = {
  id: 'root',
  name: 'Root',
  parentId: null,
  type: 'number',
  emoji: '📖',
  sortOrder: 0,
  isGeneral: false,
  archivedAt: null,
  createdAt: '',
  updatedAt: '',
};
const child = { ...root, id: 'child', name: 'Child', parentId: 'root' };
const record = (habitId: string, value: number, localDate = '2026-09-08'): Entry => ({
  id: habitId + localDate,
  habitId,
  value,
  localDate,
  occurredAt: '',
  timezone: 'UTC',
  createdAt: '',
  updatedAt: '',
});
let renderer: ReactTestRenderer;
async function render(element: React.ReactElement, measured = false) {
  await act(async () => {
    renderer = create(element, {
      createNodeMock: node =>
        node.type === 'Button' && measured
          ? {
              measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
                callback(11, 22, 100, 40),
            }
          : node.type === 'ScrollView'
            ? { scrollToEnd: mocks.scrollToEnd }
            : null,
    });
  });
  return renderer.root;
}
const native = (type: string) => renderer.root.findByType(type as React.ElementType);
const button = (label: string) =>
  renderer.root.find(node => (node.type as unknown) === 'Button' && node.props.accessibilityLabel === label);
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.app = { habits: [root], entries: [], palette: light, changeEntry: vi.fn().mockResolvedValue(undefined) };
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.clearAllMocks();
});

it.each([true, false])('anchors the chart filter using native measurement when available (%s)', async measured => {
  const filter = vi.fn();
  await render(<ChartHeader chart="history" label="Root selection" onFilter={filter} c={light} />, measured);
  const trigger = renderer.root.find(node => (node.type as unknown) === 'Button' && !node.props.accessibilityLabel);
  await act(async () => trigger.props.onPress());
  expect(filter).toHaveBeenCalledWith(...(measured ? [{ x: 11, y: 22, width: 100, height: 40 }] : []));
});

it.each([true, false])('selects a grouping and dismisses its anchored popover (measurement: %s)', async measured => {
  const choose = vi.fn();
  await render(<TimeGroupingMenu scale="day" label="Grouping" onChoose={choose} c={light} pill={measured} />, measured);
  expect(button('Grouping').findAllByType('Icon' as React.ElementType)[0].props).toMatchObject({
    name: 'calendar-outline',
    accessible: false,
  });
  expect(
    button('Grouping')
      .findAllByType('Text' as React.ElementType)
      .map(node => node.props.children),
  ).toEqual([t('day')]);
  await act(async () => button('Grouping').props.onPress());
  expect(button('Grouping').props.accessibilityState.expanded).toBe(true);
  if (measured) expect(native('Popover').props.anchor).toEqual({ x: 11, y: 22, width: 100, height: 40 });
  expect(button(t('day')).props.accessibilityState.selected).toBe(true);
  await act(async () => button(t('quarter')).props.onPress());
  expect(choose).toHaveBeenCalledWith('quarter');
  expect(renderer.root.findAllByType('Popover' as React.ElementType)).toHaveLength(0);
  await act(async () => button('Grouping').props.onPress());
  await act(async () => native('Popover').props.onClose());
  expect(button('Grouping').props.accessibilityState.expanded).toBe(false);
});

it.each(['score', 'history', 'calendar', 'streaks', 'frequency'] as const)(
  'dispatches %s selection to the matching multi or single control',
  async filter => {
    const toggle = vi.fn(),
      single = vi.fn(),
      close = vi.fn();
    await render(
      <FilterModal
        anchor={null}
        filter={filter}
        setFilter={close}
        candidates={[root, child]}
        scoreIds={new Set(['root'])}
        historyIds={new Set(['root'])}
        calendarIds={new Set(['root'])}
        currentSingle="root"
        toggleMulti={toggle}
        setSingle={single}
        c={light}
      />,
    );
    const buttons = renderer.root.findAllByType('Button' as React.ElementType),
      multi = ['score', 'history', 'calendar'].includes(filter);
    expect(buttons[0].props.accessibilityRole).toBe(multi ? 'checkbox' : 'radio');
    expect(buttons[0].props.accessibilityState.checked).toBe(true);
    expect(buttons[1].props.accessibilityState.checked).toBe(false);
    await act(async () => buttons[1].props.onPress());
    expect(multi ? toggle : single).toHaveBeenCalledWith('child');
    expect(multi ? single : toggle).not.toHaveBeenCalled();
    await act(async () => native('Popover').props.onClose());
    expect(close).toHaveBeenCalledWith(null);
  },
);

it('retains the original date and deleted value through Calendar refresh-only recovery', async () => {
  const change = vi.fn().mockRejectedValueOnce(new EntryRefreshError()).mockResolvedValue(undefined),
    close = vi.fn();
  mocks.app = { ...mocks.app, entries: [record(root.id, 5)], changeEntry: change };
  await render(
    <CalendarDialog initialDate="2026-09-08" calendarHabits={[root]} color={light.accent} onClose={close} />,
  );
  await act(async () => native('Modal').props.onShow());
  await act(async () => native('Timeline').props.onSelectDate('2026-09-08'));
  await act(async () => native('Editor').props.onClear());
  expect(native('Editor').props.locked).toBe(true);
  await act(async () =>
    native('Editor').props.setEditor((current: Record<string, unknown>) => ({
      ...current,
      date: '2026-09-07',
      value: '99',
    })),
  );
  await act(async () => native('Timeline').props.onSelectDate('2026-09-07'));
  expect(native('Editor').props.editor.date).toBe('2026-09-08');
  expect(native('Editor').props.editor.value).toBe('5');
  await act(async () => native('Editor').props.onSave());
  expect(change.mock.calls).toEqual([
    [root.id, '2026-09-08', null],
    [root.id, '2026-09-08', null],
  ]);
  expect(renderer.root.findAllByType('Editor' as React.ElementType)).toHaveLength(0);
  expect(close).not.toHaveBeenCalled();
});

it('keeps Calendar dismissal and duplicate writes blocked until a pending save completes', async () => {
  let complete = () => {};
  const change = vi.fn(
      () =>
        new Promise<void>(resolve => {
          complete = resolve;
        }),
    ),
    close = vi.fn();
  mocks.app = { ...mocks.app, changeEntry: change };
  await render(
    <CalendarDialog initialDate="2026-09-08" calendarHabits={[root, child]} color={light.accent} onClose={close} />,
  );
  await act(async () => native('Modal').props.onShow());
  await act(async () => native('Timeline').props.onSelectDate('2026-09-08'));
  await act(async () =>
    native('Editor').props.setEditor((current: Record<string, unknown>) => ({ ...current, value: '2' })),
  );
  let pending: Promise<void>;
  await act(async () => {
    pending = native('Editor').props.onSave();
  });
  expect(native('Editor').props.saving).toBe(true);
  expect(button(child.name).props.disabled).toBe(true);
  await act(async () => {
    void native('Editor').props.onSave();
    native('Modal').props.onRequestClose();
    native('Editor').props.setEditor(null);
  });
  expect(change).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled();
  expect(native('Editor')).toBeDefined();
  await act(async () => {
    complete();
    await pending!;
  });
  expect(renderer.root.findAllByType('Editor' as React.ElementType)).toHaveLength(0);
  await act(async () => native('Modal').props.onRequestClose());
  expect(close).toHaveBeenCalledOnce();
});

it('keeps Calendar activity-mode edits in the original duration units and rejects invalid drafts', async () => {
  const duration = { ...root, type: 'duration' as const },
    close = vi.fn();
  mocks.app = { ...mocks.app, habits: [duration], entries: [record(root.id, 3600)] };
  await render(
    <CalendarDialog
      booleanView
      initialDate="2026-09-08"
      calendarHabits={[duration]}
      color={light.accent}
      onClose={close}
    />,
  );
  await act(async () => native('Modal').props.onShow());
  expect(native('Timeline').props.habit.type).toBe('boolean');
  await act(async () => native('Timeline').props.onSelectDate('2026-09-08'));
  expect(native('Editor').props.habit.type).toBe('duration');
  expect(native('Editor').props.editor).toMatchObject({ unit: 'hours', value: '1' });
  await act(async () =>
    native('Editor').props.setEditor((current: Record<string, unknown>) => ({ ...current, value: 'invalid' })),
  );
  await act(async () => native('Editor').props.onSave());
  expect(mocks.alert).toHaveBeenCalledWith(t('invalidNumber'));
  expect(mocks.app.changeEntry).not.toHaveBeenCalled();
  await act(async () => native('Modal').props.onRequestClose());
  expect(close).not.toHaveBeenCalled();
  expect(renderer.root.findAllByType('Editor' as React.ElementType)).toHaveLength(0);
});

it('renders Frequency history only for the selected branch and excludes future years', async () => {
  const other = { ...root, id: 'other' },
    entries = [
      record('child', 1, '2012-09-04'),
      record('child', 2),
      record('other', 1, '2000-01-01'),
      record('child', 1, '2027-01-01'),
    ];
  await render(
    <Frequency
      habit={root}
      habits={[root, child, other]}
      entries={entries}
      today="2026-09-08"
      color={light.accent}
      onFilter={vi.fn()}
      c={light}
    />,
  );
  const labels = renderer.root.findAll(node => (node.type as unknown) === 'Text').map(node => node.props.children);
  expect(labels).toContain('2012');
  expect(labels).not.toContain('2000');
  expect(labels).not.toContain('2027');
  const cells = renderer.root.findAll(node => (node.type as unknown) === 'View' && node.props.accessibilityLabel);
  expect(cells.some(node => /^2026, .*: 1 \/ /.test(node.props.accessibilityLabel))).toBe(true);
  expect(mocks.scrollToEnd).toHaveBeenCalledWith({ animated: false });
  await act(async () => {
    native('ScrollView').props.onLayout();
    native('ScrollView').props.onContentSizeChange();
  });
  expect(mocks.scrollToEnd).toHaveBeenCalledTimes(3);
});

it('shows no streak for zero, unrelated, or future activity', async () => {
  const other = { ...root, id: 'other' };
  await render(
    <Streaks
      habit={root}
      habits={[root, child, other]}
      entries={[record('child', 0), record('other', 1), record('child', 1, '2026-09-09')]}
      today="2026-09-08"
      color={light.accent}
      onFilter={vi.fn()}
      c={light}
    />,
  );
  expect(
    renderer.root.findAll(node => (node.type as unknown) === 'Text' && node.props.children === t('noStreaks')),
  ).toHaveLength(1);
});

it.each(['future', 'archived'] as const)('rejects %s dates or habits at the Calendar editor boundary', async reason => {
  const habit = reason === 'archived' ? { ...root, archivedAt: '2026-09-01' } : root;
  mocks.app = { ...mocks.app, habits: [habit] };
  await render(
    <CalendarDialog initialDate="2026-09-08" calendarHabits={[habit]} color={light.accent} onClose={vi.fn()} />,
  );
  await act(async () => native('Modal').props.onShow());
  await act(async () => native('Timeline').props.onSelectDate(reason === 'future' ? '2026-09-09' : '2026-09-08'));
  expect(renderer.root.findAllByType('Editor' as React.ElementType)).toHaveLength(0);
  expect(mocks.app.changeEntry).not.toHaveBeenCalled();
});
