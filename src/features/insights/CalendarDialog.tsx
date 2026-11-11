import { booleanAnalysis } from '@/domain/booleanAnalysis';
import { todayLocal } from '@/domain/entries';
import type { Habit } from '@/domain/types';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TouchableOpacity, View } from 'react-native';
import { CalendarEntryModal } from './CalendarEntryModal';
import { CalendarTimeline } from './CalendarWeekTimeline';
import { CalendarSkeleton } from './DetailSkeletons';
import { dateLabel } from './calendarLabels';
import { s } from './detailStyles';
import { useCalendarEditor } from './useCalendarEditor';

type CalendarDialogProps = {
  initialDate: string;
  calendarHabits: Habit[];
  color: string;
  onClose: () => void;
  booleanView?: boolean;
};

// Draft/write state stays in the dialog so editing does not rerender detail charts.
export function CalendarDialog({
  initialDate,
  calendarHabits,
  color,
  onClose,
  booleanView = false,
}: CalendarDialogProps) {
  const { habits, entries, palette: c } = useApp(),
    today = todayLocal();
  const [editingId, setEditingId] = useState(calendarHabits[0].id);
  const [ready, setReady] = useState(false);
  const habit = calendarHabits.find(item => item.id === editingId) ?? calendarHabits[0];
  const editing = useCalendarEditor(habit, today, onClose);
  const analysis = useMemo(
    () => (booleanView ? booleanAnalysis(habits, entries) : { habits, entries }),
    [booleanView, habits, entries],
  );
  const displayHabits = useMemo(
    () => calendarHabits.map(item => analysis.habits.find(habit => habit.id === item.id) ?? item),
    [calendarHabits, analysis.habits],
  );
  const displayHabit = analysis.habits.find(item => item.id === habit.id) ?? habit;

  return (
    <Modal transparent visible animationType="fade" onShow={() => setReady(true)} onRequestClose={editing.close}>
      <View style={{ flex: 1 }}>
        <Pressable
          style={[s.overlay, { justifyContent: 'center', padding: 12, display: editing.editor ? 'none' : 'flex' }]}
          onPress={editing.close}
        >
          <ScrollView style={{ maxHeight: '95%', flexGrow: 0 }} contentContainerStyle={{ flexGrow: 1 }}>
            <Pressable
              accessibilityViewIsModal
              onAccessibilityEscape={editing.close}
              onPress={() => undefined}
              style={{ backgroundColor: c.card, borderRadius: 22, padding: 16 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={[s.sectionTitle, { color: c.text, flex: 1 }]}>{t('editCalendar')}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('close')}
                  accessibilityState={{ disabled: editing.saving }}
                  disabled={editing.saving}
                  onPress={editing.close}
                  style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="close" size={22} color={c.text} />
                </TouchableOpacity>
              </View>
              <Text style={{ color: c.text, marginTop: 8 }}>
                {habit.emoji} {habit.name}
              </Text>
              <Text style={{ color: c.muted, marginTop: 8 }}>
                {t(calendarHabits.length > 1 ? 'calendarEditingHabitHelp' : 'calendarEditHelp')}
              </Text>
              {calendarHabits.length > 1 && (
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel={t('selectCategory')}
                  style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}
                >
                  {calendarHabits.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      accessibilityRole="radio"
                      accessibilityLabel={item.name}
                      accessibilityState={{ selected: item.id === habit.id, disabled: editing.saving }}
                      disabled={editing.saving}
                      onPress={() => {
                        if (!editing.saving) setEditingId(item.id);
                      }}
                      style={{
                        minHeight: 44,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        justifyContent: 'center',
                        backgroundColor: item.id === habit.id ? c.accent : c.soft,
                      }}
                    >
                      <Text style={{ color: item.id === habit.id ? c.onAccent : c.text }}>
                        {item.emoji} {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={{ color: c.text, marginTop: 8, fontWeight: '600' }}>{dateLabel(initialDate)}</Text>
              {ready ? (
                <CalendarTimeline
                  selected={displayHabits}
                  initialDate={initialDate}
                  cellSize={44}
                  habit={displayHabit}
                  habits={analysis.habits}
                  entries={analysis.entries}
                  today={today}
                  onSelectDate={editing.openDate}
                  saving={editing.saving}
                  savingDate={editing.savingDate}
                  color={color}
                  c={c}
                />
              ) : (
                <CalendarSkeleton c={c} />
              )}
            </Pressable>
          </ScrollView>
        </Pressable>
        {editing.editor && (
          <CalendarEntryModal
            embedded
            locked={editing.needsRefresh}
            editor={editing.editor}
            habit={habit}
            hasRecord={editing.hasRecord}
            saving={editing.saving}
            setEditor={editing.updateEditor}
            onSave={editing.save}
            onClear={editing.clear}
            c={c}
          />
        )}
      </View>
    </Modal>
  );
}
