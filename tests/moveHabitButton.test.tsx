import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Entry, Habit } from '../src/domain/types';
import { MoveHabitButton } from '../src/features/MoveHabitButton';
import { t } from '../src/i18n';
import { light } from '../src/theme';

const mocks = vi.hoisted(() => ({
  habits: [] as Habit[],
  entries: [] as Entry[],
  move: vi.fn(),
  refresh: vi.fn(),
  showSuccess: vi.fn(),
  alert: vi.fn(),
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
vi.mock('react-native', () => ({
  Alert: { alert: mocks.alert },
  Keyboard: { dismiss: vi.fn() },
  Platform: { OS: 'android' },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'Button',
  View: 'View',
}));
vi.mock('../src/theme/Typography', () => ({ Text: 'Text', TextInput: 'TextInput' }));
vi.mock('../src/features/AnchoredPopover', () => ({
  openPopover: (_event: unknown, onOpen: (anchor: null) => void) => onOpen(null),
  AnchoredPopover: ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) =>
    React.createElement('Popover', { onClose }, children),
}));
vi.mock('../src/features/AppProvider', () => ({
  useApp: () => ({
    habits: mocks.habits,
    entries: mocks.entries,
    repo: { move: mocks.move },
    refresh: mocks.refresh,
    showSuccess: mocks.showSuccess,
    palette: light,
  }),
}));

const now = '2026-01-01T00:00:00.000Z';
const habit = (id: string, parentId: string | null = null, extra: Partial<Habit> = {}): Habit => ({
  id,
  parentId,
  name: id,
  emoji: '',
  type: 'boolean',
  sortOrder: 0,
  isGeneral: false,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
  ...extra,
});
const entry = (id: string, habitId: string): Entry => ({
  id,
  habitId,
  value: 1,
  localDate: '2026-01-01',
  occurredAt: now,
  timezone: 'UTC',
  createdAt: now,
  updatedAt: now,
});

let renderer: ReactTestRenderer;
const find = (id: string) => mocks.habits.find(item => item.id === id)!;
const render = async (id: string) => {
  await act(async () => {
    renderer = create(<MoveHabitButton habit={find(id)} />);
  });
};
const trigger = () => renderer.root.findByType('Pressable' as React.ElementType);
const open = () => act(async () => trigger().props.onPress());
const isOpen = () => renderer.root.findAllByType('Popover' as React.ElementType).length === 1;
const options = () =>
  renderer.root.findAll(node => (node.type as unknown) === 'Button' && node.props.accessibilityRole === 'radio');
const option = (label: string) => options().find(node => node.props.accessibilityLabel === label)!;
const button = (label: string) =>
  renderer.root
    .findAll(node => (node.type as unknown) === 'Button' && node.props.accessibilityRole === 'button')
    .find(
      node =>
        node.props.accessibilityLabel === label ||
        node.findAll(child => (child.type as unknown) === 'Text').some(child => child.props.children === label),
    )!;
const texts = () =>
  renderer.root.findAllByType('Text' as React.ElementType).map(node => [node.props.children].flat().join(''));

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  mocks.move.mockResolvedValue(undefined);
  mocks.refresh.mockResolvedValue(undefined);
  mocks.habits = [
    habit('Sport', null, { sortOrder: 0 }),
    habit('Sport general', 'Sport', { isGeneral: true, sortOrder: -1 }),
    habit('Gym', 'Sport'),
    habit('Legs', 'Gym'),
    habit('Health', null, { sortOrder: 1 }),
    habit('Reading', null, { type: 'number', sortOrder: 2 }),
    habit('Old', null, { archivedAt: now, sortOrder: 3 }),
  ];
  mocks.entries = [entry('a', 'Gym'), entry('b', 'Legs'), entry('c', 'Health')];
});
afterEach(async () => {
  await act(async () => renderer.unmount());
});

it('offers the action for active habits only', async () => {
  await render('Gym');
  expect(trigger().props.accessibilityLabel).toBe(t('moveHabitTo', { name: 'Gym' }));
  for (const id of ['Sport general', 'Old']) {
    await act(async () => renderer.update(<MoveHabitButton habit={find(id)} />));
    expect(renderer.root.findAllByType('Pressable' as React.ElementType)).toHaveLength(0);
  }
});

it('lists the top level and compatible habits, and stays disabled until one is chosen', async () => {
  await render('Gym');
  expect(isOpen()).toBe(false);
  await open();
  expect(options().map(node => node.props.accessibilityLabel)).toEqual([t('topLevel'), 'Health']);
  expect(button(t('moveConfirm')).props.disabled).toBe(true);
  expect(renderer.root.findAllByType('TextInput' as React.ElementType)).toHaveLength(0);
  await act(async () => button(t('moveConfirm')).props.onPress());
  expect(mocks.move).not.toHaveBeenCalled();
});

it('previews the new path and what moves with the habit before confirming', async () => {
  await render('Gym');
  await open();
  await act(async () => option('Health').props.onPress());
  expect(option('Health').props.accessibilityState.selected).toBe(true);
  expect(texts()).toContain('Sport / Gym → Health / Gym');
  expect(texts()).toContain(t('moveSummary', { habits: 1, records: 2 }));
  await act(async () => option(t('topLevel')).props.onPress());
  expect(texts()).toContain('Sport / Gym → Gym');
});

it('moves under the chosen habit after its other sub-habits, refreshes and confirms', async () => {
  await render('Gym');
  await open();
  await act(async () => option('Health').props.onPress());
  await act(async () => button(t('moveConfirm')).props.onPress());
  expect(mocks.move).toHaveBeenCalledExactlyOnceWith('Gym', 'Health', Number.MAX_SAFE_INTEGER);
  expect(mocks.refresh).toHaveBeenCalledOnce();
  expect(mocks.showSuccess).toHaveBeenCalledWith(t('habitMoved', { name: 'Gym', destination: 'Health' }));
  expect(isOpen()).toBe(false);
});

it('moves a sub-habit back to the top level', async () => {
  await render('Legs');
  await open();
  await act(async () => option(t('topLevel')).props.onPress());
  await act(async () => button(t('moveConfirm')).props.onPress());
  expect(mocks.move).toHaveBeenCalledExactlyOnceWith('Legs', null, Number.MAX_SAFE_INTEGER);
  expect(mocks.showSuccess).toHaveBeenCalledWith(t('habitMoved', { name: 'Legs', destination: t('topLevel') }));
});

it('does not offer the top level to a habit that is already there', async () => {
  await render('Health');
  await open();
  expect(options().map(node => node.props.accessibilityLabel)).toEqual(['Sport', 'Sport / Gym', 'Sport / Gym / Legs']);
});

it('explains when there is nowhere to move a habit', async () => {
  await render('Reading');
  await open();
  expect(options()).toHaveLength(0);
  expect(texts()).toContain(t('noMoveDestinations'));
});

it('keeps the sheet open and reports a failed move without claiming success', async () => {
  mocks.move.mockRejectedValue(new Error('Invalid move destination'));
  await render('Gym');
  await open();
  await act(async () => option('Health').props.onPress());
  await act(async () => button(t('moveConfirm')).props.onPress());
  expect(mocks.alert).toHaveBeenCalledWith(t('couldNotSave'), 'Invalid move destination');
  expect(mocks.showSuccess).not.toHaveBeenCalled();
  expect(isOpen()).toBe(true);
  expect(option('Health').props.accessibilityState.selected).toBe(true);
});

it('ignores repeated confirmation while a move is in progress', async () => {
  let finish!: () => void;
  mocks.move.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
  await render('Gym');
  await open();
  await act(async () => option('Health').props.onPress());
  await act(async () => {
    void button(t('moveConfirm')).props.onPress();
    void button(t('moveConfirm')).props.onPress();
  });
  expect(mocks.move).toHaveBeenCalledOnce();
  await act(async () => renderer.root.findByType('Popover' as React.ElementType).props.onClose());
  expect(isOpen()).toBe(true);
  await act(async () => finish());
  expect(isOpen()).toBe(false);
});

it('discards the selection when canceled', async () => {
  await render('Gym');
  await open();
  await act(async () => option('Health').props.onPress());
  await act(async () => button(t('cancel')).props.onPress());
  expect(isOpen()).toBe(false);
  expect(mocks.move).not.toHaveBeenCalled();
  await open();
  expect(options().every(node => !node.props.accessibilityState.selected)).toBe(true);
});

it('adds search for long lists and matches against the full path', async () => {
  mocks.habits = [
    habit('Target'),
    habit('Group', null, { sortOrder: 1 }),
    ...Array.from({ length: 8 }, (_, index) => habit(`Item ${index}`, 'Group', { sortOrder: index })),
  ];
  await render('Target');
  await open();
  const search = renderer.root.findByType('TextInput' as React.ElementType);
  expect(options()).toHaveLength(9);
  await act(async () => search.props.onChangeText('group / item 3'));
  expect(options().map(node => node.props.accessibilityLabel)).toEqual(['Group / Item 3']);
  await act(async () => search.props.onChangeText('nothing'));
  expect(options()).toHaveLength(0);
  expect(texts()).toContain(t('noMatchingHabits'));
});
