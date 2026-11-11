import { todayLocal } from '@/domain/entries';
import { visibleHabitSnapshot } from '@/domain/habitVisibility';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { CalendarDaySheet } from './CalendarDaySheet';
import { CalendarMonthGrid } from './CalendarMonthGrid';
import { s } from './calendarStyles';
import { useCalendarData } from './useCalendarData';
import { useCalendarDayEditor } from './useCalendarDayEditor';
import { useCalendarMonths } from './useCalendarMonths';

const weekLabels = Array.from({ length: 7 }, (_, i) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i)),
);
export default function CalendarScreen() {
  const { habits: allHabits, entries: allEntries, palette: c } = useApp();
  const { habits, entries } = useMemo(() => visibleHabitSnapshot(allHabits, allEntries), [allHabits, allEntries]);
  const today = todayLocal(),
    [width, setWidth] = useState(0);
  const state = useCalendarDayEditor(habits, entries);
  const history = useCalendarMonths(today, width);
  const data = useCalendarData(habits, entries, allHabits, c.accent, state.expanded, state.selectedDate);
  return (
    <View style={[s.page, { backgroundColor: c.bg }]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      <View style={s.content}>
        <View style={s.heading}>
          <Text style={[s.title, { color: c.text }]}>{t('calendar')}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={history.goToToday}
            style={[s.todayButton, { backgroundColor: c.soft }]}
          >
            <Ionicons name="today-outline" size={17} color={c.accent} />
            <Text style={{ color: c.accent, fontWeight: '700' }}>{t('today')}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.weekRow}>
          {weekLabels.map((label, index) => (
            <View key={index} style={s.weekday}>
              <Text style={[s.weekdayText, { color: c.muted }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      {width > 0 && (
        <FlatList
          ref={history.list}
          inverted
          data={history.months}
          keyExtractor={month => month}
          contentContainerStyle={s.monthList}
          showsVerticalScrollIndicator={false}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          getItemLayout={(_, index) => history.layouts[index]}
          onEndReached={history.loadEarlier}
          onEndReachedThreshold={1}
          onScroll={event => history.onScroll(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={32}
          accessibilityHint={t('swipeCalendarVertical')}
          accessibilityActions={[
            { name: 'increment', label: t('nextMonth') },
            { name: 'decrement', label: t('previousMonth') },
          ]}
          onAccessibilityAction={event => history.moveMonth(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
          renderItem={({ item: month }) => (
            <CalendarMonthGrid
              month={month}
              today={today}
              dayHeight={history.dayHeight}
              categoriesByDay={data.categoriesByDay}
              onSelectDate={state.selectDate}
              c={c}
            />
          )}
        />
      )}
      <CalendarDaySheet state={state} habits={habits} dayHabits={data.dayHabits} dayTotals={data.dayTotals} c={c} />
    </View>
  );
}
