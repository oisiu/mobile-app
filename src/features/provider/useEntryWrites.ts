import type { HabitRepository } from '@/data/repository';
import type { BranchEdit } from '@/domain/branchDay';
import type { Entry, Habit } from '@/domain/types';
import { EntryRefreshError } from '@/features/entryWriteError';
import { t } from '@/i18n';
import { useCallback, useRef } from 'react';

type Options = {
  repo: HabitRepository | null;
  habits: Habit[];
  refresh: () => Promise<void>;
  showSuccess: (message: string) => void;
};
const branchErrors = {
  BRANCH_DAY_CHANGED: 'branchChangedError',
  BRANCH_CONFLICT: 'branchConflictHelp',
  BRANCH_DATE: 'branchDateError',
  BRANCH_VALUE: 'invalidNumber',
} as const;

function entryHabitName(habits: Habit[], habitId: string) {
  const habit = habits.find(item => item.id === habitId);
  const visibleHabit = habit?.isGeneral ? habits.find(item => item.id === habit.parentId) : habit;
  return visibleHabit ? `${visibleHabit.emoji} ${visibleHabit.name}`.trim() : t('habitName');
}

export function useEntryWrites({ repo, habits, refresh, showSuccess }: Options) {
  // Retain committed requests until their refreshed snapshot is published.
  const pendingEntryWrites = useRef(new Map<string, () => void>());
  const publishEntryWrite = useCallback(
    async (key: string) => {
      try {
        await refresh();
      } catch {
        throw new EntryRefreshError();
      }
      const notify = pendingEntryWrites.current.get(key);
      pendingEntryWrites.current.delete(key);
      notify?.();
    },
    [refresh],
  );

  const changeEntry = useCallback(
    async (habitId: string, date: string, value: number | null) => {
      if (!repo) return;
      const key = JSON.stringify(['entry', habitId, date, value]);
      if (pendingEntryWrites.current.has(key)) {
        await publishEntryWrite(key);
        return;
      }
      const currentHabits = await repo.habits();
      const target = currentHabits.find(habit => habit.parentId === habitId && habit.isGeneral)?.id ?? habitId;
      const currentEntries = await repo.entries(date, date);
      const previous = currentEntries.find(entry => entry.habitId === target)?.value ?? null;
      if (previous === value) {
        await refresh();
        return;
      }

      if (value === null) await repo.clearEntry(habitId, date);
      else await repo.saveEntry({ habitId, value, localDate: date });
      const name = entryHabitName(currentHabits, habitId);
      const message = previous === null ? 'recordAdded' : value === null ? 'recordRemoved' : 'recordUpdated';
      pendingEntryWrites.current.set(key, () => showSuccess(t(message, { name })));
      await publishEntryWrite(key);
    },
    [repo, refresh, showSuccess, publishEntryWrite],
  );

  const changeBranchDay = useCallback(
    async (habitId: string, date: string, expected: Entry[], edits: BranchEdit[], destination: string) => {
      if (!repo) throw new Error(t('couldNotSave'));
      const key = JSON.stringify(['branch', habitId, date, expected, edits, destination]);
      if (pendingEntryWrites.current.has(key)) {
        await publishEntryWrite(key);
        return;
      }
      try {
        await repo.editBranchDay(habitId, date, expected, edits, destination);
      } catch (error) {
        if (error instanceof Error) {
          const message = branchErrors[error.message as keyof typeof branchErrors];
          if (message) throw new Error(t(message));
        }
        throw error;
      }
      const habit = habits.find(item => item.id === habitId);
      const name = habit ? `${habit.emoji} ${habit.name}` : t('habitName');
      pendingEntryWrites.current.set(key, () => showSuccess(t('branchChanged', { name })));
      await publishEntryWrite(key);
    },
    [repo, publishEntryWrite, habits, showSuccess],
  );

  return { changeEntry, changeBranchDay };
}
