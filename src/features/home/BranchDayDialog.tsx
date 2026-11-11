import type { Habit } from '@/domain/types';
import { CalendarEntryModal } from '@/features/insights/CalendarEntryModal';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { BranchDatePicker } from './BranchDatePicker';
import { BranchConflicts, BranchDayPreview, BranchMoveSummary, formatBranchDate } from './branchDay/BranchDaySummary';
import { BranchRecordEditor } from './branchDay/BranchRecordEditor';
import { styles as s } from './branchDay/branchDayStyles';
import { useBranchDayEditor } from './branchDay/useBranchDayEditor';

export function BranchDayDialog({ habit, date, onClose }: { habit: Habit; date: string; onClose: () => void }) {
  const editor = useBranchDayEditor(habit, date, onClose),
    c = editor.palette;
  const dateText = formatBranchDate(date);
  const canAddDirect = habit.type !== 'boolean' && !editor.records.some(record => record.direct);
  return (
    <Modal transparent animationType="fade" onRequestClose={editor.close}>
      {editor.directEditor ? (
        <CalendarEntryModal
          embedded
          locked={editor.refreshOnly}
          editor={editor.directEditor}
          habit={habit}
          hasRecord={editor.hasDirectRecord}
          saving={editor.saving}
          setEditor={editor.updateDirectEditor}
          onSave={editor.saveDirect}
          onClear={editor.clearDirect}
          c={c}
        />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={s.overlay} onPress={editor.close}>
            <Pressable
              accessibilityViewIsModal
              onAccessibilityEscape={editor.close}
              style={[s.sheet, { backgroundColor: c.card }]}
              onPress={() => undefined}
            >
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
                <View style={s.row}>
                  <Text style={{ fontSize: 30 }}>{habit.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text accessibilityRole="header" style={[s.title, { color: c.text }]}>
                      {habit.name}
                    </Text>
                    <Text style={{ color: c.muted }}>{dateText}</Text>
                  </View>
                  <Pressable
                    disabled={editor.saving}
                    accessibilityRole="button"
                    accessibilityLabel={t('close')}
                    onPress={editor.close}
                    style={{ padding: 12 }}
                  >
                    <Ionicons name="close" size={22} color={c.muted} />
                  </Pressable>
                </View>
                {editor.records.map((record, index) => (
                  <BranchRecordEditor
                    key={record.entry.id}
                    record={record}
                    root={habit}
                    draft={editor.drafts[index]}
                    dateText={dateText}
                    locked={editor.locked}
                    c={c}
                    checked={
                      habit.type === 'boolean'
                        ? (editor.edits[index].value ?? 0) > 0
                        : !editor.removed.has(record.entry.id)
                    }
                    onToggle={checked => editor.toggleRecord(index, checked)}
                    onValue={value => editor.updateValue(index, value)}
                    onUnit={unit => editor.changeUnit(index, unit)}
                  />
                ))}
                {!editor.records.length && <Text style={{ color: c.muted }}>{t('branchNoRecords')}</Text>}
                <BranchDayPreview
                  habit={habit}
                  original={editor.original}
                  total={editor.total}
                  invalid={editor.invalid}
                  moving={editor.target !== date}
                  c={c}
                />
                <View style={s.actions}>
                  <Pressable
                    disabled={editor.locked || !editor.records.length}
                    accessibilityRole="button"
                    onPress={editor.clearRecords}
                    style={s.smallAction}
                  >
                    <Ionicons name="trash-outline" size={18} color={c.danger} />
                    <Text style={{ color: c.danger }}>{t('branchClearShort')}</Text>
                  </Pressable>
                  <Pressable
                    disabled={editor.locked || !editor.records.length}
                    accessibilityRole="button"
                    onPress={editor.toggleDatePicker}
                    style={s.smallAction}
                  >
                    <Ionicons name="calendar-outline" size={18} color={c.accent} />
                    <Text style={{ color: c.accent }}>{t('branchMoveShort')}</Text>
                  </Pressable>
                </View>
                {editor.pickingDate && (
                  <BranchDatePicker
                    disabled={editor.locked}
                    date={editor.destination}
                    onSelect={editor.selectDate}
                    c={c}
                  />
                )}
                {editor.moving && (
                  <BranchMoveSummary
                    target={editor.target}
                    count={editor.edits.filter(edit => edit.value !== null).length}
                    locked={editor.locked}
                    onKeepDate={editor.keepDate}
                    c={c}
                  />
                )}
                {editor.conflictRecords.length > 0 && (
                  <BranchConflicts habit={habit} records={editor.conflictRecords} c={c} />
                )}
                {canAddDirect && (
                  <Pressable
                    disabled={editor.locked || editor.changed}
                    accessibilityRole="button"
                    onPress={editor.openDirectEditor}
                    style={[s.smallAction, { opacity: editor.changed ? 0.5 : 1 }]}
                  >
                    <Ionicons name="add-outline" size={18} color={c.accent} />
                    <Text style={{ color: c.accent }}>{t('branchDirectShort')}</Text>
                  </Pressable>
                )}
                <View style={s.actions}>
                  <Pressable
                    disabled={editor.saving}
                    accessibilityRole="button"
                    onPress={editor.close}
                    style={[s.button, { backgroundColor: c.soft }]}
                  >
                    <Text style={{ color: c.text }}>{t('cancel')}</Text>
                  </Pressable>
                  <Pressable
                    disabled={editor.saveDisabled}
                    accessibilityRole="button"
                    accessibilityState={{ busy: editor.saving, disabled: editor.saveDisabled }}
                    onPress={() => void editor.save()}
                    style={[s.button, { backgroundColor: c.accent, opacity: editor.saveDisabled ? 0.5 : 1 }]}
                  >
                    <Text style={{ color: 'white' }}>{t('save')}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}
