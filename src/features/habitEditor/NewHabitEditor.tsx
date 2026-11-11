import { TreeDraftCreate, TreeDraftUpdate } from '@/data/repository';
import { isValidCalendarThreshold } from '@/domain/calendarThreshold';
import { HabitColor, isSingleEmoji } from '@/domain/habitAppearance';
import { habitNameError, habitNameLimit } from '@/domain/habitName';
import { TreeAttachment } from '@/domain/treeAttachments';
import { HabitNode, HabitType } from '@/domain/types';
import { CalendarThresholdInput } from '@/features/CalendarThresholdInput';
import { MoveHabitPicker } from '@/features/MoveHabitPicker';
import { useDraftGuard } from '@/features/useDraftGuard';
import { useHabitMutation } from '@/features/useHabitMutation';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';
import {
  addNode,
  attachmentPositions,
  changeNode,
  draftKey,
  draftPath,
  dropNode,
  flatten,
  fromNode,
  invalidThresholds,
  nodeKeys,
  reorderNode,
  type DraftNode,
} from './draftTree';
import { ChildAddActions } from './ChildActions';
import { DraftRow } from './DraftRow';
import { HabitInputs } from './EditorFields';
import { HabitVisibility } from './HabitVisibility';
import { EditorScreen } from './EditorScreen';
import { s } from './editorStyles';
import type { EditorServices } from './editorTypes';
const types: HabitType[] = ['boolean', 'number', 'duration'];
export function NewHabitEditor({ habits, c, repo, refresh, showSuccess }: EditorServices) {
  const [isHidden, setIsHidden] = useState(false),
    [hideFromOverview, setHideFromOverview] = useState(false),
    [name, setName] = useState(''),
    [emoji, setEmoji] = useState('✨'),
    [type, setType] = useState<HabitType>('boolean'),
    [color, setColor] = useState<HabitColor | null>(null),
    [calendarThreshold, setCalendarThreshold] = useState<number | null>(null);
  const [rootKey] = useState(draftKey);
  const [nodes, setNodes] = useState<DraftNode[]>([]),
    [moves, setMoves] = useState<TreeAttachment[]>([]);
  const add = (parentKey?: string) => {
    const node: DraftNode = {
      key: draftKey(),
      name: '',
      emoji: '✨',
      color: null,
      calendarThreshold: null,
      children: [],
    };
    setNodes(current => (parentKey ? addNode(current, parentKey, node, true) : [node, ...current]));
  };
  const attach = (habit: HabitNode, parentKey: string) => {
    setNodes(current =>
      parentKey === rootKey ? [...current, fromNode(habit)] : addNode(current, parentKey, fromNode(habit)),
    );
    setMoves(current => [...current, { id: habit.id, parentKey, expectedParentId: habit.parentId }]);
  };
  const remove = (node: DraftNode) => {
    if (node.id && !moves.some(move => move.id === node.id)) return;
    const keys = new Set([node.key, ...nodeKeys(node.children)]);
    setNodes(current => dropNode(current, node.key));
    setMoves(current => current.filter(move => !keys.has(move.id)));
  };
  const excluded = new Set(nodeKeys(nodes));
  const mutation = useHabitMutation(refresh);
  const allowLeave = useDraftGuard(
    nodes.length > 0 ||
      name !== '' ||
      emoji !== '✨' ||
      type !== 'boolean' ||
      color !== null ||
      hideFromOverview ||
      isHidden ||
      calendarThreshold !== null,
    mutation.pending,
  );
  const save = async () => {
    try {
      if (mutation.needsRefresh) {
        await mutation.retry();
        return;
      }
      if (!repo) return;
      const nameError = habitNameError(name);
      if (nameError) return Alert.alert(t(nameError, { limit: habitNameLimit }));
      if (!isSingleEmoji(emoji)) return Alert.alert(t('invalidEmoji'));
      if (!isValidCalendarThreshold(type, calendarThreshold)) return Alert.alert(t('invalidCalendarThreshold'));
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
      const updates: TreeDraftUpdate[] = [],
        creates: TreeDraftCreate[] = [];
      flatten(nodes, rootKey, updates, creates, habits);
      const childNameError = [
        ...updates.map(item => habitNameError(item.name, habits.find(h => h.id === item.id)?.name)),
        ...creates.map(item => habitNameError(item.name)),
      ].find(Boolean);
      if (childNameError) return Alert.alert(t(childNameError, { limit: habitNameLimit }));
      if (invalidThresholds(nodes, type)) return Alert.alert(t('invalidCalendarThreshold'));
      if (
        creates.some(item => !isSingleEmoji(item.emoji)) ||
        updates.some(item => item.emoji !== habits.find(h => h.id === item.id)?.emoji && !isSingleEmoji(item.emoji))
      )
        return Alert.alert(t('invalidEmoji'));
      await mutation.run(
        () =>
          nodes.length
            ? repo.createTree(input, updates, creates, attachmentPositions(nodes, moves), rootKey)
            : repo.create(input),
        () => {
          allowLeave();
          showSuccess(t('habitCreated', { name: `${emoji} ${name.trim()}`.trim() }));
          router.dismissTo('/(tabs)');
        },
      );
    } catch (error) {
      Alert.alert(
        t('couldNotSave'),
        moves.length ? t('categoryMoveFailedHelp') : error instanceof Error ? error.message : String(error),
      );
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
      <Text style={[s.label, { color: c.muted }]}>{t('type')}</Text>
      <View style={s.pills}>
        {types.map(item => (
          <TouchableOpacity
            key={item}
            onPress={() => {
              if (item === type) return;
              setNodes([]);
              setMoves([]);
              setType(item);
              setCalendarThreshold(null);
            }}
            style={[s.pill, { backgroundColor: type === item ? c.accent : c.card }]}
          >
            <Text style={{ color: type === item ? 'white' : c.text }}>{t(item)}</Text>
            <Text style={{ color: type === item ? 'white' : c.muted, fontSize: 12, marginTop: 4, fontWeight: '700' }}>
              {t(`${item}Example`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
      <View style={s.sectionHeader}>
        <Text style={[s.label, { color: c.muted, marginTop: 0 }]}>{t('children')}</Text>
      </View>
      <ChildAddActions
        onAdd={() => add()}
        existing={
          <MoveHabitPicker
            habits={habits}
            type={type}
            excluded={excluded}
            parentName={name}
            onSelect={habit => attach(habit, rootKey)}
            c={c}
          />
        }
        c={c}
      />
      {nodes.map((node, index) => (
        <DraftRow
          type={type}
          key={node.key}
          node={node}
          depth={0}
          siblingIndex={index}
          siblingCount={nodes.length}
          c={c}
          onChange={(key, patch) => setNodes(current => changeNode(current, key, patch))}
          onAdd={add}
          onRemove={remove}
          onReorder={(key, direction) => setNodes(current => reorderNode(current, key, direction))}
          isAttachment={node => moves.some(move => move.id === node.id)}
          canRemove={node => !node.id || moves.some(move => move.id === node.id)}
          existing={node => (
            <MoveHabitPicker
              habits={habits}
              type={type}
              excluded={excluded}
              parentName={node.name}
              parentPath={[name.trim() || t('newCategory'), ...(draftPath(nodes, node.key) ?? [])].join(' / ')}
              onSelect={habit => attach(habit, node.key)}
              c={c}
            />
          )}
        />
      ))}
    </EditorScreen>
  );
}
