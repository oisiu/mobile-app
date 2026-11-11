import { TreeDraftCreate, TreeDraftUpdate } from '@/data/repository';
import { isValidCalendarThreshold } from '@/domain/calendarThreshold';
import { isSingleEmoji } from '@/domain/habitAppearance';
import { habitNameError, habitNameLimit } from '@/domain/habitName';
import { HabitTypeChange, validHistoryValue } from '@/domain/habitTypeChange';
import { buildTree, descendants } from '@/domain/tree';
import { TreeAttachment } from '@/domain/treeAttachments';
import { HabitNode, HabitType } from '@/domain/types';
import { CalendarDraft, calendarInputValue } from '@/features/insights/calendarEntry';
import { useDraftGuard } from '@/features/useDraftGuard';
import { useHabitMutation } from '@/features/useHabitMutation';
import { language, t } from '@/i18n';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  addNode,
  attachmentPositions,
  draftKey,
  dropNode,
  flatten,
  fromNode,
  invalidThresholds,
  nodeKeys,
  type DraftNode,
} from './draftTree';
import type { ExistingEditorProps } from './editorTypes';
import { createRootActions } from './rootActions';

export function useExistingHabitEditor({ root, habits, entries, repo, refresh, showSuccess }: ExistingEditorProps) {
  const [type, setType] = useState(root.type),
    [historyDraft, setHistoryDraft] = useState<CalendarDraft>({ date: '', value: '', unit: 'minutes' });
  const mutation = useHabitMutation(refresh),
    savingRef = useRef(false),
    confirming = useRef(false);
  const [reviewing, setReviewing] = useState(false);
  const thresholdBackup = useRef<{ root: number | null; values: Map<string, number | null> } | null>(null);
  const [moves, setMoves] = useState<TreeAttachment[]>([]);
  const [isHidden, setIsHidden] = useState(!!root.isHidden),
    [hideFromOverview, setHideFromOverview] = useState(!!root.hideFromOverview);
  const rootNode = buildTree(habits).find(item => item.id === root.id),
    [name, setName] = useState(root.name),
    [emoji, setEmoji] = useState(root.emoji),
    [color, setColor] = useState(root.color ?? null),
    [calendarThreshold, setCalendarThreshold] = useState(root.calendarThreshold ?? null),
    [nodes, setNodes] = useState<DraftNode[]>(() => rootNode?.children.map(fromNode) ?? []),
    [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [initial] = useState(() =>
    JSON.stringify({
      type: root.type,
      name: root.name,
      emoji: root.emoji,
      color: root.color ?? null,
      calendarThreshold: root.calendarThreshold ?? null,
      hideFromOverview: !!root.hideFromOverview,
      isHidden: !!root.isHidden,
      nodes: rootNode?.children.map(fromNode) ?? [],
    }),
  );
  const dirty =
    JSON.stringify({ type, name, emoji, color, calendarThreshold, hideFromOverview, isHidden, nodes }) !== initial ||
    !isValidCalendarThreshold(type, calendarThreshold) ||
    invalidThresholds(nodes, type);
  const allowLeave = useDraftGuard(dirty, {
    get current() {
      return savingRef.current || mutation.pending.current || confirming.current;
    },
  });
  const historicalIds = new Set([root.id, ...descendants(habits, root.id).map(h => h.id)]),
    hasHistory = entries.some(entry => historicalIds.has(entry.habitId));
  const blank = (): DraftNode => ({
    key: draftKey(),
    name: '',
    emoji: '✨',
    color: null,
    calendarThreshold: null,
    children: [],
  });
  const add = (parentKey?: string) =>
    setNodes(current => (parentKey ? addNode(current, parentKey, blank(), true) : [blank(), ...current]));
  const excluded = new Set([root.id, ...nodeKeys(rootNode?.children.map(fromNode) ?? []), ...nodeKeys(nodes)]);
  const attach = (habit: HabitNode, parentKey: string) => {
    setNodes(current =>
      parentKey === root.id ? [...current, fromNode(habit)] : addNode(current, parentKey, fromNode(habit)),
    );
    setMoves(current => [...current, { id: habit.id, parentKey, expectedParentId: habit.parentId }]);
  };
  const remove = async (node: DraftNode) => {
    if (savingRef.current || mutation.pending.current || confirming.current) return;
    if (moves.some(move => move.id === node.id)) {
      const keys = new Set([node.key, ...nodeKeys(node.children)]);
      setNodes(current => dropNode(current, node.key));
      setMoves(current => current.filter(move => !keys.has(move.id)));
      return;
    }
    const commit = () => {
      const keys = new Set([node.key, ...nodeKeys(node.children)]);
      setNodes(current => dropNode(current, node.key));
      setMoves(current => current.filter(move => !keys.has(move.id)));
      if (node.id) setDeletedIds(current => [...current, node.id!]);
    };
    if (!node.id) return commit();
    if (!repo) return;
    confirming.current = true;
    setReviewing(true);
    try {
      const impact = await repo.deletionImpact(node.id);
      const confirmed = await new Promise<boolean>(resolve =>
        Alert.alert(
          `${t('delete')} “${node.name}”?`,
          t('deletionSummary', { habits: impact.habits, entries: impact.entries }),
          [
            { text: t('cancel'), style: 'cancel', onPress: () => resolve(false) },
            { text: t('delete'), style: 'destructive', onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        ),
      );
      if (confirmed) commit();
    } catch (error) {
      Alert.alert(t('couldNotSave'), error instanceof Error ? error.message : String(error));
    } finally {
      confirming.current = false;
      setReviewing(false);
    }
  };
  const changeType = (next: HabitType) => {
    if (next === type) return;
    const remaining = moves.reduce((items, move) => dropNode(items, move.id), nodes);
    const visit = (items: DraftNode[], values: Map<string, number | null>) => {
      for (const item of items) {
        values.set(item.key, item.calendarThreshold);
        visit(item.children, values);
      }
    };
    const thresholds = (items: DraftNode[], values?: Map<string, number | null>): DraftNode[] =>
      items.map(item => ({
        ...item,
        calendarThreshold: values?.get(item.key) ?? null,
        children: thresholds(item.children, values),
      }));
    if (type === root.type) {
      const values = new Map<string, number | null>();
      visit(remaining, values);
      thresholdBackup.current = { root: calendarThreshold, values };
    }
    if (next === root.type) {
      setCalendarThreshold(thresholdBackup.current?.root ?? null);
      setNodes(thresholds(remaining, thresholdBackup.current?.values));
      thresholdBackup.current = null;
    } else {
      setCalendarThreshold(null);
      setNodes(thresholds(remaining));
    }
    setMoves([]);
    setType(next);
    setHistoryDraft({ date: '', value: '', unit: 'minutes' });
  };
  const save = async () => {
    try {
      if (mutation.needsRefresh) {
        await mutation.retry();
        return;
      }
      if (confirming.current || mutation.pending.current) return;
      if (!repo) return;
      const nameError = habitNameError(name, root.name);
      if (nameError) return Alert.alert(t(nameError, { limit: habitNameLimit }));
      const updates: TreeDraftUpdate[] = [
          {
            id: root.id,
            name,
            emoji,
            color,
            calendarThreshold,
            ...(hideFromOverview !== !!root.hideFromOverview ? { hideFromOverview } : {}),
            ...(isHidden !== !!root.isHidden ? { isHidden } : {}),
          },
        ],
        creates: TreeDraftCreate[] = [];
      flatten(nodes, root.id, updates, creates, habits);
      if ([...updates, ...creates].some(item => !isValidCalendarThreshold(type, item.calendarThreshold)))
        return Alert.alert(t('invalidCalendarThreshold'));
      const childNameError = [
        ...updates.map(item => habitNameError(item.name, habits.find(h => h.id === item.id)?.name)),
        ...creates.map(item => habitNameError(item.name)),
      ].find(Boolean);
      if (childNameError) return Alert.alert(t(childNameError, { limit: habitNameLimit }));
      if (
        updates.some(item => item.emoji !== habits.find(h => h.id === item.id)?.emoji && !isSingleEmoji(item.emoji)) ||
        creates.some(item => !isSingleEmoji(item.emoji))
      )
        return Alert.alert(t('invalidEmoji'));
      let conversion: HabitTypeChange | undefined;
      if (type !== root.type) {
        const measureType = root.type === 'boolean' ? type : 'duration',
          value = type === 'boolean' ? undefined : calendarInputValue({ ...root, type: measureType }, historyDraft);
        if (hasHistory && type !== 'boolean' && !validHistoryValue(measureType, value, root.type === 'boolean'))
          return Alert.alert(t(root.type === 'boolean' ? 'invalidHistoryValue' : 'invalidUnitDuration'));
        const branch = [root, ...descendants(habits, root.id)],
          ids = new Set(branch.map(h => h.id));
        conversion = {
          from: root.type,
          to: type,
          expectedHabitIds: [...ids],
          expectedEntries: entries.filter(entry => ids.has(entry.habitId)),
          ...(root.type === 'boolean'
            ? { trueValue: value ?? undefined }
            : type !== 'boolean'
              ? { unitDurationSeconds: value ?? undefined }
              : {}),
        };
        const formattedValue = new Intl.NumberFormat(language, {
          maximumFractionDigits: 20,
          useGrouping: false,
        }).format(Number(historyDraft.value));
        const valueLabel =
          measureType === 'duration'
            ? formattedValue + ' ' + t(historyDraft.unit).toLocaleLowerCase(language)
            : formattedValue;
        const message = t(
          !hasHistory
            ? 'confirmEmptyHistory'
            : type === 'boolean'
              ? 'confirmBooleanConversion'
              : root.type === 'boolean'
                ? 'confirmBooleanHistory'
                : 'confirmNumericHistory',
          {
            name,
            habits: branch.filter(h => !h.isGeneral).length,
            records: conversion.expectedEntries.length,
            type: t(type),
            value: valueLabel,
          },
        );
        const confirmed = await new Promise<boolean>(resolve =>
          Alert.alert(
            t('confirmHabitTypeChange'),
            message,
            [
              { text: t('cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('convertAndSave'), style: 'destructive', onPress: () => resolve(true) },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
          ),
        );
        if (!confirmed) return;
      }
      await mutation.run(
        async () => {
          if (conversion)
            await repo.editTree(root.id, updates, creates, deletedIds, attachmentPositions(nodes, moves), conversion);
          else if (moves.length)
            await repo.editTree(root.id, updates, creates, deletedIds, attachmentPositions(nodes, moves));
          else await repo.editTree(root.id, updates, creates, deletedIds);
        },
        () => {
          allowLeave();
          showSuccess(t('habitUpdated', { name: (emoji + ' ' + name.trim()).trim() }));
          router.dismissTo('/(tabs)');
        },
      );
    } catch (error) {
      Alert.alert(
        t('couldNotSave'),
        error instanceof Error && error.message === 'TYPE_CHANGE_STALE'
          ? t('typeChangeStaleHelp')
          : type !== root.type
            ? t('typeChangeFailedHelp')
            : moves.length
              ? t('categoryMoveFailedHelp')
              : error instanceof Error
                ? error.message
                : String(error),
      );
    }
  };
  const { restoreRoot, removeRoot } = createRootActions({
    root,
    repo,
    mutation,
    dirty,
    savingRef,
    confirming,
    setReviewing,
    allowLeave,
    showSuccess,
  });
  return {
    type,
    historyDraft,
    setHistoryDraft,
    mutation,
    savingRef,
    reviewing,
    isHidden,
    setIsHidden,
    hideFromOverview,
    setHideFromOverview,
    name,
    setName,
    emoji,
    setEmoji,
    color,
    setColor,
    calendarThreshold,
    setCalendarThreshold,
    nodes,
    setNodes,
    moves,
    excluded,
    add,
    attach,
    remove,
    changeType,
    hasHistory,
    save,
    restoreRoot,
    removeRoot,
  };
}
