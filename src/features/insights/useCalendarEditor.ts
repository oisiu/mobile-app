import type { Habit } from '@/domain/types';
import { useApp } from '@/features/AppProvider';
import { entryErrorTitle, EntryRefreshError } from '@/features/entryWriteError';
import { t } from '@/i18n';
import { useRef, useState } from 'react';
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
  const { habits, entries, changeEntry } = useApp();
  const [editor, setEditor] = useState<CalendarDraft | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const savingRef = useRef(false);
  const committed = useRef<{ date: string; value: number | null } | null>(null);
  const directEntry = (date: string) => calendarEntry(habit, habits, entries, date);
  const resetDraft = () => {
    committed.current = null;
    setNeedsRefresh(false);
    setEditor(null);
  };

  const persist = async (date: string, value: number | null) => {
    if (savingRef.current || date > today || habit.archivedAt) return;
    savingRef.current = true;
    setSavingDate(date);
    const operation = committed.current ?? { date, value };
    try {
      await changeEntry(habit.id, operation.date, operation.value);
      resetDraft();
    } catch (error) {
      if (error instanceof EntryRefreshError && editor) {
        committed.current ??= operation;
        setNeedsRefresh(true);
      }
      Alert.alert(entryErrorTitle(error), error instanceof Error ? error.message : String(error));
    } finally {
      savingRef.current = false;
      setSavingDate(null);
    }
  };
  const openDate = (date: string) => {
    if (savingRef.current || committed.current || date > today || habit.archivedAt) return;
    if (habit.type === 'boolean') {
      void persist(date, toggledCalendarValue(habit, habits, entries, date));
      return;
    }
    setEditor(calendarDraft(habit, date, directEntry(date)?.value ?? null));
  };
  const updateEditor = (update: DraftUpdate) => {
    if (savingRef.current || (update !== null && committed.current)) return;
    if (update === null) resetDraft();
    else setEditor(update);
  };
  const save = async () => {
    if (!editor || savingRef.current) return;
    if (committed.current) {
      await persist(committed.current.date, committed.current.value);
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
    if (savingRef.current) return;
    if (editor) resetDraft();
    else onClose();
  };
  return {
    editor,
    needsRefresh,
    saving: savingDate !== null,
    savingDate,
    hasRecord: !!editor && !!directEntry(editor.date),
    openDate,
    updateEditor,
    save,
    clear,
    close,
  };
}
