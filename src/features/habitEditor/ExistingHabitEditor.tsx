import { descendants } from '@/domain/tree';
import { CalendarThresholdInput } from '@/features/CalendarThresholdInput';
import { HabitTypeConversion } from '@/features/HabitTypeConversion';
import { MoveHabitPicker } from '@/features/MoveHabitPicker';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { TouchableOpacity, View } from 'react-native';
import { ChildAddActions } from './ChildActions';
import { DraftRow } from './DraftRow';
import { HabitInputs } from './EditorFields';
import { HabitVisibility } from './HabitVisibility';
import { EditorScreen } from './EditorScreen';
import { changeNode, draftPath, reorderNode } from './draftTree';
import { s } from './editorStyles';
import type { ExistingEditorProps } from './editorTypes';
import { useExistingHabitEditor } from './useExistingHabitEditor';

export function ExistingHabitEditor(props: ExistingEditorProps) {
  const { root, habits, c } = props;
  const {
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
  } = useExistingHabitEditor(props);
  return (
    <EditorScreen
      c={c}
      title={t('edit')}
      onSave={save}
      onSavingChange={value => {
        savingRef.current = value;
      }}
      busy={mutation.busy || reviewing}
      locked={mutation.needsRefresh}
    >
      <Text style={[s.label, { color: c.muted }]}>{t('topHabit')}</Text>
      <HabitInputs
        name={name}
        emoji={emoji}
        color={color}
        onName={setName}
        onEmoji={setEmoji}
        onColor={setColor}
        c={c}
      />
      <HabitTypeConversion
        from={root.type}
        type={type}
        onType={changeType}
        draft={historyDraft}
        onDraft={setHistoryDraft}
        c={c}
        hasHistory={hasHistory}
      />
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
        <View>
          <Text style={[s.label, { color: c.muted, marginTop: 0 }]}>{t('children')}</Text>
          <Text style={{ color: c.muted, fontSize: 12 }}>
            {t('inheritedType')}: {t(type)}
          </Text>
        </View>
      </View>
      <ChildAddActions
        onAdd={() => add()}
        existing={
          <MoveHabitPicker
            habits={habits}
            type={type}
            excluded={excluded}
            parentName={name}
            onSelect={habit => attach(habit, root.id)}
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
          canRemove={node =>
            !node.id ||
            moves.some(move => move.id === node.id) ||
            !moves.some(move => descendants(habits, move.id).some(child => child.id === node.id))
          }
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
      {root.archivedAt && (
        <TouchableOpacity accessibilityRole="button" style={[s.danger, { borderColor: c.line }]} onPress={restoreRoot}>
          <Text style={{ color: c.text }}>{t('restore')}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={[s.danger, { borderColor: c.line }]} onPress={removeRoot}>
        <Text style={{ color: c.danger }}>{t('delete')}</Text>
      </TouchableOpacity>
    </EditorScreen>
  );
}
