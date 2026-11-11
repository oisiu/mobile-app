import { Entry, Habit } from '@/domain/types';
import { PopoverAnchor } from '@/features/AnchoredPopover';
import { View } from 'react-native';
import { CalendarTimeline } from './CalendarWeekTimeline';
import { ChartHeader } from './DetailControls';
import { s, type Palette } from './detailStyles';
export function ActivityCalendar({
  habit,
  selected,
  label,
  habits,
  entries,
  today,
  onEdit,
  color,
  onFilter,
  c,
  loading = false,
}: {
  habit: Habit;
  selected: Habit[];
  label: string;
  habits: Habit[];
  entries: Entry[];
  today: string;
  onEdit: (date: string) => void;
  color: string;
  onFilter: (anchor?: PopoverAnchor) => void;
  c: Palette;
  loading?: boolean;
}) {
  return (
    <View accessibilityState={{ busy: loading }} style={[s.card, { backgroundColor: c.card, minHeight: 250 }]}>
      <ChartHeader chart="calendar" label={label} onFilter={onFilter} c={c} loading={loading} />
      <CalendarTimeline
        loading={loading}
        selected={selected}
        habit={habit}
        habits={habits}
        entries={entries}
        today={today}
        color={color}
        c={c}
        onOpenDate={onEdit}
      />
    </View>
  );
}
