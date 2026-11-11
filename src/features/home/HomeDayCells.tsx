import type { HabitNode } from '@/domain/types';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { shortDay } from '@/utils/dates';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { s, type Palette } from './homeStyles';

type ChunkProps = { dates: string[]; today: string; c: Palette; dayWidth: number };

const sameChunk = (a: ChunkProps, b: ChunkProps) =>
  a.dates[0] === b.dates[0] &&
  a.dates.length === b.dates.length &&
  a.today === b.today &&
  a.c === b.c &&
  a.dayWidth === b.dayWidth;

/** One chunk of date-header columns. */
export const HomeDateCells = memo(function HomeDateCells({ dates, today, c, dayWidth }: ChunkProps) {
  return (
    <>
      {dates.map(date => (
        <View key={date} style={[s.day, { width: dayWidth }]}>
          <Text style={{ color: c.muted }}>{shortDay(date)}</Text>
          <Text style={[s.dayNum, { color: date === today ? c.accent : c.text }]}>{Number(date.slice(-2))}</Text>
        </View>
      ))}
    </>
  );
}, sameChunk);

type ValueProps = ChunkProps & {
  habit: HabitNode;
  values: Map<string, string> | undefined;
  onToggle: (habit: HabitNode, date: string) => void;
  onBranch: (habit: HabitNode, date: string) => void;
};

// The values map is rebuilt whenever the window shifts, so compare this chunk's values instead of its identity.
const sameValues = (a: ValueProps, b: ValueProps) =>
  sameChunk(a, b) &&
  a.habit === b.habit &&
  a.onToggle === b.onToggle &&
  a.onBranch === b.onBranch &&
  a.dates.every(date => a.values?.get(date) === b.values?.get(date));

/** One chunk of a habit row's day cells. */
export const HomeDayCells = memo(function HomeDayCells({
  habit,
  dates,
  values,
  today,
  c,
  dayWidth,
  onToggle,
  onBranch,
}: ValueProps) {
  return (
    <>
      {dates.map(date => (
        <Pressable
          key={date}
          accessibilityRole="button"
          accessibilityLabel={`${habit.name}, ${date}, ${values?.get(date)}`}
          accessibilityHint={t('branchCellHint')}
          accessibilityActions={[{ name: 'longpress', label: t('branchManage') }]}
          onAccessibilityAction={() => onBranch(habit, date)}
          onLongPress={() => onBranch(habit, date)}
          onPress={() => onToggle(habit, date)}
          style={[s.cell, { width: dayWidth }]}>
          <Text style={[s.cellText, { color: date === today ? c.accent : c.text }]}>{values?.get(date)}</Text>
        </Pressable>
      ))}
    </>
  );
}, sameValues);
