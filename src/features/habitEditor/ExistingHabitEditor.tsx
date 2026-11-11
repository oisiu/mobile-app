import { CalendarThresholdInput } from '@/features/CalendarThresholdInput';
import { HabitTypeConversion } from '@/features/HabitTypeConversion';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { ChildList } from './ChildList';
import { HabitInputs } from './EditorFields';
import { EditorScreen } from './EditorScreen';
import { HabitVisibility } from './HabitVisibility';
import { s } from './editorStyles';
import type { ExistingEditorProps } from './editorTypes';
import { useExistingHabitEditor } from './useExistingHabitEditor';

export function ExistingHabitEditor(props: ExistingEditorProps) {
  const { root, c } = props;
  const editor = useExistingHabitEditor(props);
  return (
    <EditorScreen
      c={c}
      title={t('edit')}
      onSave={editor.save}
      onSavingChange={editor.onSavingChange}
      busy={editor.mutation.busy || editor.reviewing}
      locked={editor.mutation.needsRefresh}
    >
      <HabitInputs
        name={editor.name}
        emoji={editor.emoji}
        color={editor.color}
        onName={editor.setName}
        onEmoji={editor.setEmoji}
        onColor={editor.setColor}
        c={c}
      />
      <HabitTypeConversion
        from={root.type}
        type={editor.type}
        onType={editor.changeType}
        draft={editor.historyDraft}
        onDraft={editor.setHistoryDraft}
        c={c}
        hasHistory={editor.hasHistory}
      />
      <CalendarThresholdInput
        key={editor.type}
        type={editor.type}
        value={editor.calendarThreshold}
        onChange={editor.setCalendarThreshold}
        c={c}
        name={editor.name}
      />
      <HabitVisibility
        hideFromOverview={editor.hideFromOverview}
        onOverviewChange={editor.setHideFromOverview}
        isHidden={editor.isHidden}
        onHiddenChange={editor.setIsHidden}
        c={c}
      />
      <ChildList
        type={editor.type}
        nodes={editor.nodes}
        setNodes={editor.setNodes}
        onAdd={editor.add}
        onRemove={editor.remove}
        c={c}
      />
      <View style={s.rootActions}>
        {root.archivedAt && (
          <TouchableOpacity
            accessibilityRole="button"
            style={[s.rootAction, { borderColor: c.line }]}
            onPress={editor.restoreRoot}
          >
            <Ionicons name="arrow-undo-outline" size={18} color={c.text} accessible={false} />
            <Text style={{ color: c.text, fontSize: 15 }}>{t('restore')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          style={[s.rootAction, { borderColor: c.line }]}
          onPress={editor.removeRoot}
        >
          <Ionicons name="trash-outline" size={18} color={c.danger} accessible={false} />
          <Text style={{ color: c.danger, fontSize: 15 }}>{t('delete')}</Text>
        </TouchableOpacity>
      </View>
    </EditorScreen>
  );
}
