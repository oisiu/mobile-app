import { aggregate } from '@/domain/aggregation';
import { branchRecords } from '@/domain/branchDay';
import type { HabitNode } from '@/domain/types';
import { useApp } from '@/features/AppProvider';
import {
  calendarDraft,
  calendarEntry,
  calendarInputValue,
  type CalendarDraft,
} from '@/features/insights/calendarEntry';
import { useRetryableEntryWrite } from '@/features/useRetryableEntryWrite';
import { t } from '@/i18n';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

type DraftUpdate = CalendarDraft | null | ((current: CalendarDraft | null) => CalendarDraft | null);

export function useHomeEntries(today: string) {
  const { habits, entries } = useApp();
  const write = useRetryableEntryWrite();
  const { run, isBusy } = write;
  const [dialog, setDialog] = useState<(CalendarDraft & { habit: HabitNode }) | null>(null);
  const [branchDialog, setBranchDialog] = useState<{ habit: HabitNode; date: string } | null>(null);

  const openBranch = useCallback(
    (habit: HabitNode, date: string) => {
      if (!isBusy()) setBranchDialog({ habit, date });
    },
    [isBusy],
  );

  const toggle = useCallback(
    async (habit: HabitNode, date: string) => {
      if (date > today || isBusy()) return;
      const hasDescendantRecords = branchRecords(habits, entries, habit, date).some(
        record => !record.direct && (habit.type !== 'boolean' || record.entry.value > 0),
      );
      if (hasDescendantRecords) {
        setBranchDialog({ habit, date });
        return;
      }
      if (habit.type !== 'boolean') {
        setDialog({ ...calendarDraft(habit, date, calendarEntry(habit, habits, entries, date)?.value ?? null), habit });
        return;
      }
      const active = aggregate(habits, entries, habit.id, new Set([date]));
      // A tap has no editor to retry from, so a failed refresh is only reported.
      const saved = await run({ habitId: habit.id, date, value: active ? null : 1 }, { retryable: false, quiet: true });
      if (saved) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    },
    [today, habits, entries, run, isBusy],
  );

  const persist = async (value: number | null) => {
    if (!dialog) return;
    if (await run({ habitId: dialog.habit.id, date: dialog.date, value })) setDialog(null);
  };

  const save = async () => {
    if (!dialog) return;
    const pending = write.pending();
    if (pending) {
      await persist(pending.value);
      return;
    }
    const value = calendarInputValue(dialog.habit, dialog);
    if (value === null) return Alert.alert(t('invalidNumber'));
    await persist(value);
  };

  const updateEditor = (update: DraftUpdate) => {
    // A committed entry locks the draft; only dismissing it is allowed.
    if (isBusy() || (update !== null && write.pending())) return;
    if (update === null) {
      write.reset();
      setDialog(null);
      return;
    }
    setDialog(current => {
      const next = typeof update === 'function' ? update(current) : update;
      return current && next ? { ...next, habit: current.habit } : null;
    });
  };

  return {
    toggle,
    openBranch,
    dialog,
    branchDialog,
    saving: write.saving,
    entryNeedsRefresh: write.needsRefresh,
    updateEditor,
    save,
    clear: () => persist(null),
    closeBranch: () => setBranchDialog(null),
    hasRecord: !!dialog && !!calendarEntry(dialog.habit, habits, entries, dialog.date),
  };
}
