import { branchRecords, validBranchDate } from '@/domain/branchDay';
import { sanitizeDecimalInput } from '@/domain/entries';
import type { Habit } from '@/domain/types';
import { useApp } from '@/features/AppProvider';
import { EntryRefreshError, entryErrorTitle } from '@/features/entryWriteError';
import {
  calendarDraft,
  calendarEntry,
  calendarInputValue,
  changeCalendarUnit,
  type CalendarDraft,
} from '@/features/insights/calendarEntry';
import { t } from '@/i18n';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';

export type BranchRecord = ReturnType<typeof branchRecords>[number];
export type BranchConflict = BranchRecord & { destinationValue: number };

export function useBranchDayEditor(habit: Habit, date: string, onClose: () => void) {
  const { habits, entries, changeEntry, changeBranchDay, palette } = useApp();
  // Keep the reviewed snapshot stable until the dialog closes or retries publication.
  const [records] = useState(() => branchRecords(habits, entries, habit, date));
  const [drafts, setDrafts] = useState(() =>
    records.map(record => calendarDraft(record.habit, date, record.entry.value)),
  );
  const [removed, setRemoved] = useState(new Set<string>());
  const [saving, setSaving] = useState(false),
    busy = useRef(false);
  const [refreshOnly, setRefreshOnly] = useState(false);
  const [destination, setDestination] = useState(date);
  const [moving, setMoving] = useState(false),
    [pickingDate, setPickingDate] = useState(false);
  const [directEditor, setDirectEditor] = useState<CalendarDraft | null>(null);
  const directCommitted = useRef<{ value: number | null } | null>(null);
  const locked = saving || refreshOnly;
  const target = moving ? destination : date;
  const edits = records.map((record, index) => ({
    id: record.entry.id,
    value: removed.has(record.entry.id) ? null : calendarInputValue(record.habit, drafts[index]),
  }));
  const invalid = records.some((record, index) => !removed.has(record.entry.id) && edits[index].value === null);
  const changed = target !== date || edits.some((edit, index) => edit.value !== records[index].entry.value);
  const conflictRecords: BranchConflict[] =
    target === date
      ? []
      : records.flatMap((record, index) => {
          if (edits[index].value === null) return [];
          const conflict = entries.find(entry => entry.habitId === record.entry.habitId && entry.localDate === target);
          return conflict ? [{ ...record, destinationValue: conflict.value }] : [];
        });
  const original =
    habit.type === 'boolean'
      ? Number(records.some(record => record.entry.value > 0))
      : records.reduce((sum, record) => sum + record.entry.value, 0);
  const total =
    habit.type === 'boolean'
      ? Number(edits.some(edit => (edit.value ?? 0) > 0))
      : edits.reduce((sum, edit) => sum + (edit.value ?? 0), 0);
  const saveDisabled =
    saving || (!refreshOnly && (!changed || invalid || !validBranchDate(target) || conflictRecords.length > 0));

  const reportError = (error: unknown) =>
    Alert.alert(entryErrorTitle(error), error instanceof Error ? error.message : String(error));
  const close = () => {
    if (busy.current) return;
    if (directEditor) {
      directCommitted.current = null;
      setRefreshOnly(false);
      setDirectEditor(null);
    } else onClose();
  };
  const save = async () => {
    if (busy.current) return;
    if (!refreshOnly && invalid) return Alert.alert(t('invalidNumber'));
    if (!refreshOnly && !validBranchDate(target)) return Alert.alert(t('branchDateError'));
    if (!refreshOnly && conflictRecords.length) return;
    busy.current = true;
    setSaving(true);
    try {
      await changeBranchDay(
        habit.id,
        date,
        records.map(record => record.entry),
        edits,
        target,
      );
      onClose();
    } catch (error) {
      if (error instanceof EntryRefreshError) setRefreshOnly(true);
      reportError(error);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const persistDirect = async (value: number | null) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      await changeEntry(habit.id, date, directCommitted.current ? directCommitted.current.value : value);
      directCommitted.current = null;
      onClose();
    } catch (error) {
      if (error instanceof EntryRefreshError) {
        directCommitted.current ??= { value };
        setRefreshOnly(true);
      }
      reportError(error);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const saveDirect = async () => {
    if (directCommitted.current) {
      await persistDirect(directCommitted.current.value);
      return;
    }
    if (!directEditor) return;
    const value = calendarInputValue(habit, directEditor);
    if (value === null) return Alert.alert(t('invalidNumber'));
    await persistDirect(value);
  };
  const updateDirectEditor = (
    update: CalendarDraft | null | ((current: CalendarDraft | null) => CalendarDraft | null),
  ) => {
    if (busy.current || (update !== null && directCommitted.current)) return;
    if (update === null) {
      directCommitted.current = null;
      setRefreshOnly(false);
    }
    setDirectEditor(update);
  };
  const updateDraft = (index: number, update: (draft: CalendarDraft) => CalendarDraft) => {
    if (busy.current || refreshOnly) return;
    setDrafts(previous => previous.map((draft, i) => (i === index ? update(draft) : draft)));
  };
  const toggleRecord = (index: number, checked: boolean) => {
    if (busy.current || refreshOnly) return;
    const id = records[index].entry.id;
    setRemoved(previous => {
      const next = new Set(previous);
      if (checked) next.delete(id);
      else next.add(id);
      return next;
    });
    if (habit.type === 'boolean' && checked) updateDraft(index, draft => ({ ...draft, value: '1' }));
  };
  const clearRecords = () => {
    if (!busy.current && !refreshOnly) setRemoved(new Set(records.map(record => record.entry.id)));
  };
  const toggleDatePicker = () => {
    if (!busy.current && !refreshOnly) setPickingDate(value => !value);
  };
  const selectDate = (value: string) => {
    if (busy.current || refreshOnly) return;
    setDestination(value);
    setMoving(value !== date);
    setPickingDate(false);
  };
  const keepDate = () => {
    if (!busy.current && !refreshOnly) {
      setMoving(false);
      setDestination(date);
    }
  };
  const openDirectEditor = () => {
    if (busy.current || refreshOnly || changed) return;
    setDirectEditor(calendarDraft(habit, date, calendarEntry(habit, habits, entries, date)?.value ?? null));
  };
  return {
    palette,
    records,
    drafts,
    removed,
    saving,
    refreshOnly,
    locked,
    destination,
    moving,
    pickingDate,
    target,
    edits,
    invalid,
    changed,
    conflictRecords,
    original,
    total,
    saveDisabled,
    directEditor,
    close,
    save,
    saveDirect,
    clearDirect: () => persistDirect(null),
    updateDirectEditor,
    hasDirectRecord: !!calendarEntry(habit, habits, entries, date),
    toggleRecord,
    clearRecords,
    toggleDatePicker,
    selectDate,
    keepDate,
    openDirectEditor,
    updateValue: (index: number, value: string) =>
      updateDraft(index, draft => ({ ...draft, value: sanitizeDecimalInput(value) })),
    changeUnit: (index: number, unit: CalendarDraft['unit']) =>
      updateDraft(index, draft => changeCalendarUnit(draft, unit)),
  };
}
