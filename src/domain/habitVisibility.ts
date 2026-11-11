import { Entry, Habit } from './types';

export function visibleHabitSnapshot(habits: Habit[], entries: Entry[], revealedRootId?: string) {
  const revealedRoot =
    revealedRootId === undefined
      ? undefined
      : habits.find(
          habit => habit.id === revealedRootId && habit.parentId === null && !habit.isGeneral && !habit.archivedAt,
        );
  const hidden = new Set(
    habits.filter(habit => habit.isHidden && habit.id !== revealedRoot?.id).map(habit => habit.id),
  );
  if (!hidden.size) return { habits, entries };
  const children = new Map<string, string[]>();
  for (const habit of habits)
    if (habit.parentId) {
      const ids = children.get(habit.parentId) ?? [];
      ids.push(habit.id);
      children.set(habit.parentId, ids);
    }
  const pending = [...hidden];
  while (pending.length)
    for (const id of children.get(pending.pop()!) ?? [])
      if (!hidden.has(id)) {
        hidden.add(id);
        pending.push(id);
      }
  return {
    habits: habits.filter(habit => !hidden.has(habit.id)),
    entries: entries.filter(entry => !hidden.has(entry.habitId)),
  };
}

const rootOnlyMessages = {
  hideFromOverview: 'Only top-level habits can be hidden from overview',
  isHidden: 'Only top-level habits can be hidden',
} as const;

/** Visibility flags are optional booleans that only a root habit may enable. */
export function assertRootOnlyVisibility(flag: keyof typeof rootOnlyMessages, value: unknown, isRoot: boolean) {
  if (value === undefined) return;
  if (typeof value !== 'boolean' || (value && !isRoot)) throw new Error(rootOnlyMessages[flag]);
}
