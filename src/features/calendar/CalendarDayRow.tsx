import { formatValue } from '@/domain/aggregation';
import type { Habit } from '@/domain/types';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { habitAccent } from '@/theme/habitColors';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { s, type Palette } from './calendarStyles';
import type { CalendarDayHabit } from './useCalendarData';
import type { CalendarDayEditor } from './useCalendarDayEditor';

type Props = { item: CalendarDayHabit; value: number; habits: Habit[]; state: CalendarDayEditor; c: Palette };
export function CalendarDayRow({ item: { habit, depth }, value, habits, state, c }: Props) {
  const hasChildren = habit.children.length > 0,
    isExpanded = state.expanded.has(habit.id);
  const directValue = state.selectedDate ? state.valueOn(habit, state.selectedDate) : 0;
  return (
    <View style={[s.habitRow, { borderColor: c.line, marginLeft: Math.min(depth, 5) * 12 }]}>
      {hasChildren ? (
        <TouchableOpacity
          disabled={state.locked}
          accessibilityRole="button"
          accessibilityLabel={`${t(isExpanded ? 'collapse' : 'expand')} ${habit.name}`}
          accessibilityState={{ expanded: isExpanded }}
          onPress={() => state.toggleExpanded(habit.id)}
          style={s.rowAction}
        >
          <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={18} color={c.muted} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 44 }} />
      )}
      <View style={s.habitMain}>
        <View style={[s.habitEmoji, { backgroundColor: value ? `${habitAccent(habit, habits, c.accent)}20` : c.bg }]}>
          <Text style={s.habitEmojiText}>{habit.emoji}</Text>
        </View>
        <View style={s.habitCopy}>
          <Text numberOfLines={1} style={[s.habitName, { color: c.text }]}>
            {habit.name}
          </Text>
          {hasChildren && (
            <Text style={{ color: c.muted, fontSize: 11 }}>
              {t('total')}: {formatValue(habit.type, value)}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        disabled={state.locked}
        accessibilityState={{ disabled: state.locked, busy: state.saving }}
        accessibilityLabel={`${habit.name}, ${formatValue(habit.type, directValue)}`}
        accessibilityHint={hasChildren ? t('ownRecordHint') : undefined}
        onPress={() => state.editHabit(habit)}
        style={s.valueAction}
      >
        <Text style={{ color: directValue ? c.accent : c.muted, fontWeight: '700' }}>
          {formatValue(habit.type, directValue)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
