import type { Habit } from '@/domain/types';
import { useApp } from '@/features/AppProvider';
import { useRetryableEntryWrite } from '@/features/useRetryableEntryWrite';
import { t } from '@/i18n';
import { useState } from 'react';
import { Alert } from 'react-native';
import {
  calendarDraft,
  calendarEntry,
  calendarInputValue,
  toggledCalendarValue,
  type CalendarDraft,
} from './calendarEntry';

type DraftUpdate = CalendarDraft | null | ((current: CalendarDraft | null) => CalendarDraft | null);

export function useCalendarEditor(habit: Habit, today: string, onClose: () => void) {
  const { habits, entries } = useApp();
  const write = useRetryableEntryWrite();
  const [editor, setEditor] = useState<CalendarDraft | null>(null);
  const directEntry = (date: string) => calendarEntry(habit, habits, entries, date);
  const editable = (date: string) => date <= today && !habit.archivedAt;
  const resetDraft = () => {
    write.reset();
    setEditor(null);
  };

  const persist = async (date: string, value: number | null) => {
    if (!editable(date)) return;
    // Only an open form can retry; a Boolean tap has nothing to retry from.
    if (await write.run({ habitId: habit.id, date, value }, { retryable: !!editor })) setEditor(null);
  };

  const openDate = (date: string) => {
    if (write.isBusy() || write.pending() || !editable(date)) return;
    if (habit.type === 'boolean') {
      void persist(date, toggledCalendarValue(habit, habits, entries, date));
      return;
    }
    setEditor(calendarDraft(habit, date, directEntry(date)?.value ?? null));
  };

  const updateEditor = (update: DraftUpdate) => {
    if (write.isBusy() || (update !== null && write.pending())) return;
    if (update === null) resetDraft();
    else setEditor(update);
  };

  const save = async () => {
    if (!editor || write.isBusy()) return;
    const pending = write.pending();
    if (pending) {
      await persist(pending.date, pending.value);
      return;
    }
    const value = calendarInputValue(habit, editor);
    if (value === null) {
      Alert.alert(t('invalidNumber'));
      return;
    }
    await persist(editor.date, value);
  };

  const clear = async () => {
    if (editor) await persist(editor.date, null);
  };

  const close = () => {
    if (write.isBusy()) return;
    if (editor) resetDraft();
    else onClose();
  };

  return {
    editor,
    needsRefresh: write.needsRefresh,
    saving: write.saving,
    savingDate: write.savingDate,
    hasRecord: !!editor && !!directEntry(editor.date),
    openDate,
    updateEditor,
    save,
    clear,
    close,
  };
}
