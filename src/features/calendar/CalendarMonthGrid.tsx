import { CalendarDayBackground } from '@/features/CalendarDayBackground';
import { openPopover, type PopoverAnchor } from '@/features/AnchoredPopover';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { monthCalendarDays } from '@/utils/dates';
import { TouchableOpacity, View } from 'react-native';
import { s, type Palette } from './calendarStyles';
import type { CalendarCategory } from './useCalendarData';

type Props = {
  month: string;
  today: string;
  dayHeight: number;
  categoriesByDay: Map<string, CalendarCategory[]>;
  onSelectDate: (date: string, anchor: PopoverAnchor | null) => void;
  c: Palette;
};
export function CalendarMonthGrid({ month, today, dayHeight, categoriesByDay, onSelectDate, c }: Props) {
  const heading = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
    .formatToParts(new Date(`${month}-15T12:00:00`))
    .filter(part => part.type === 'month' || part.type === 'year')
    .map(part => part.value)
    .join(' ');
  return (
    <View style={s.monthBlock}>
      <View style={s.monthHeading}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
          style={[s.month, { color: c.text }]}
        >
          {heading}
        </Text>
        <View style={[s.monthRule, { backgroundColor: c.line }]} />
      </View>
      <View style={s.grid}>
        {monthCalendarDays(month).map((date, index) => {
          if (!date) return <View key={`blank-${index}`} style={[s.daySlot, { height: dayHeight }]} />;
          const future = date > today,
            isToday = date === today,
            categories = categoriesByDay.get(date) ?? [];
          const label = `${t('editDay')} ${date}, ${categories.length} ${t('categoryMarks')}${categories.length ? ', ' + categories.map(category => category.name).join(', ') : ''}`;
          return (
            <View key={date} style={[s.daySlot, { height: dayHeight }]}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={label}
                disabled={future}
                onPress={event => openPopover(event, anchor => onSelectDate(date, anchor))}
                activeOpacity={0.75}
                style={[
                  s.day,
                  {
                    backgroundColor: isToday && !categories.length ? c.accent : c.card,
                    borderColor: isToday ? c.text : 'transparent',
                  },
                  future && s.disabled,
                ]}
              >
                <CalendarDayBackground colors={categories.map(category => category.color)} />
                <Text style={[s.dayNumber, { color: isToday && !categories.length ? c.onAccent : c.text }]}>
                  {Number(date.slice(-2))}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}
