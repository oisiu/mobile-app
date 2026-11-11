import { TreeDraftCreate, TreeDraftUpdate } from '@/data/repository';
import { isValidCalendarThreshold } from '@/domain/calendarThreshold';
import { HabitColor, isSingleEmoji } from '@/domain/habitAppearance';
import { habitNameError, habitNameLimit } from '@/domain/habitName';
import { HabitType } from '@/domain/types';
import { CalendarThresholdInput } from '@/features/CalendarThresholdInput';
import { HabitTypeSelector } from '@/features/HabitTypeConversion';
import { useDraftGuard } from '@/features/useDraftGuard';
import { useHabitMutation } from '@/features/useHabitMutation';
import { t } from '@/i18n';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { ChildList } from './ChildList';
import { HabitInputs } from './EditorFields';
import { EditorScreen } from './EditorScreen';
import { HabitVisibility } from './HabitVisibility';
import { addNode, draftKey, dropNode, flatten, invalidThresholds, type DraftNode } from './draftTree';
import type { EditorServices } from './editorTypes';

const DEFAULT_EMOJI = '✨';

const blankNode = (): DraftNode => ({
  key: draftKey(),
  name: '',
  emoji: DEFAULT_EMOJI,
  color: null,
  calendarThreshold: null,
  children: [],
});

export function NewHabitEditor({ c, repo, refresh, showSuccess }: EditorServices) {
  const [isHidden, setIsHidden] = useState(false),
    [hideFromOverview, setHideFromOverview] = useState(false),
    [name, setName] = useState(''),
    [emoji, setEmoji] = useState(DEFAULT_EMOJI),
    [type, setType] = useState<HabitType>('boolean'),
    [color, setColor] = useState<HabitColor | null>(null),
    [calendarThreshold, setCalendarThreshold] = useState<number | null>(null);
  const [rootKey] = useState(draftKey);
  const [nodes, setNodes] = useState<DraftNode[]>([]);
  const mutation = useHabitMutation(refresh);
  const dirty =
    nodes.length > 0 ||
    name !== '' ||
    emoji !== DEFAULT_EMOJI ||
    type !== 'boolean' ||
    color !== null ||
    hideFromOverview ||
    isHidden ||
    calendarThreshold !== null;
  const allowLeave = useDraftGuard(dirty, mutation.pending);

  const add = (parentKey?: string) =>
    setNodes(current => (parentKey ? addNode(current, parentKey, blankNode(), true) : [blankNode(), ...current]));
  const remove = (node: DraftNode) => setNodes(current => dropNode(current, node.key));
  const changeType = (next: HabitType) => {
    if (next === type) return;
    // Thresholds are type-specific, so they reset; names and sub-habits are kept.
    setNodes(current => clearThresholds(current));
    setCalendarThreshold(null);
    setType(next);
  };

  const validationError = (creates: TreeDraftCreate[]) => {
    const nameError = habitNameError(name) ?? creates.map(item => habitNameError(item.name)).find(Boolean);
    if (nameError) return t(nameError, { limit: habitNameLimit });
    if (!isSingleEmoji(emoji) || creates.some(item => !isSingleEmoji(item.emoji))) return t('invalidEmoji');
    if (!isValidCalendarThreshold(type, calendarThreshold) || invalidThresholds(nodes, type)) {
      return t('invalidCalendarThreshold');
    }
    return null;
  };

  const save = async () => {
    try {
      if (mutation.needsRefresh) {
        await mutation.retry();
        return;
      }
      if (!repo) return;
      const updates: TreeDraftUpdate[] = [],
        creates: TreeDraftCreate[] = [];
      flatten(nodes, rootKey, updates, creates);
      const error = validationError(creates);
      if (error) return Alert.alert(error);
      const input = {
        name,
        emoji,
        color,
        ...(calendarThreshold !== null ? { calendarThreshold } : {}),
        type,
        parentId: null,
        ...(hideFromOverview ? { hideFromOverview: true } : {}),
        ...(isHidden ? { isHidden: true } : {}),
      };
      await mutation.run(
        () => (nodes.length ? repo.createTree(input, updates, creates, [], rootKey) : repo.create(input)),
        () => {
          allowLeave();
          showSuccess(t('habitCreated', { name: `${emoji} ${name.trim()}`.trim() }));
          router.dismissTo('/(tabs)');
        },
      );
    } catch (error) {
      Alert.alert(t('couldNotSave'), error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <EditorScreen c={c} title={t('add')} onSave={save} busy={mutation.busy} locked={mutation.needsRefresh}>
      <HabitInputs
        name={name}
        emoji={emoji}
        color={color ?? null}
        onName={setName}
        onEmoji={setEmoji}
        onColor={setColor}
        c={c}
      />
      <HabitTypeSelector type={type} onType={changeType} c={c} />
      <CalendarThresholdInput
        key={type}
        type={type}
        value={calendarThreshold}
        onChange={setCalendarThreshold}
        c={c}
        name={name}
      />
      <HabitVisibility
        hideFromOverview={hideFromOverview}
        onOverviewChange={setHideFromOverview}
        isHidden={isHidden}
        onHiddenChange={setIsHidden}
        c={c}
      />
      <ChildList type={type} nodes={nodes} setNodes={setNodes} onAdd={add} onRemove={remove} c={c} />
    </EditorScreen>
  );
}

const clearThresholds = (nodes: DraftNode[]): DraftNode[] =>
  nodes.map(node => ({ ...node, calendarThreshold: null, children: clearThresholds(node.children) }));
