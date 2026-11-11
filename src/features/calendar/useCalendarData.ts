import { aggregate } from '@/domain/aggregation';
import { buildTree, topLevelAncestor } from '@/domain/tree';
import type { Entry, Habit, HabitNode } from '@/domain/types';
import { habitChartColor } from '@/theme/habitColors';
import { useMemo } from 'react';

export type CalendarDayHabit = { habit: HabitNode; depth: number };
export type CalendarCategory = { id: string; name: string; color: string };

export function useCalendarData(
  habits: Habit[],
  entries: Entry[],
  allHabits: Habit[],
  accent: string,
  expanded: Set<string>,
  selectedDate: string | null,
) {
  const dayHabits = useMemo(() => {
    const rows: CalendarDayHabit[] = [];
    const visit = (habit: HabitNode, depth: number) => {
      rows.push({ habit, depth });
      if (expanded.has(habit.id)) habit.children.forEach(child => visit(child, depth + 1));
    };
    buildTree(habits).forEach(root => visit(root, 0));
    return rows;
  }, [habits, expanded]);
  const rootByHabit = useMemo(
    () => new Map(habits.map(habit => [habit.id, topLevelAncestor(habits, habit.id)])),
    [habits],
  );
  const categoriesByDay = useMemo(() => {
    const result = new Map<string, CalendarCategory[]>(),
      seen = new Map<string, Set<string>>();
    for (const entry of entries) {
      const category = rootByHabit.get(entry.habitId);
      if (!category || entry.value <= 0) continue;
      let daySeen = seen.get(entry.localDate);
      if (!daySeen) {
        daySeen = new Set();
        seen.set(entry.localDate, daySeen);
      }
      if (daySeen.has(category.id)) continue;
      daySeen.add(category.id);
      const values = result.get(entry.localDate) ?? [];
      values.push({ id: category.id, name: category.name, color: habitChartColor(category, allHabits, accent) });
      result.set(entry.localDate, values);
    }
    result.forEach(values =>
      values.sort((a, b) => (rootByHabit.get(a.id)?.sortOrder ?? 0) - (rootByHabit.get(b.id)?.sortOrder ?? 0)),
    );
    return result;
  }, [entries, rootByHabit, allHabits, accent]);
  const dayTotals = useMemo(
    () =>
      new Map(
        dayHabits.map(({ habit }) => [
          habit.id,
          selectedDate ? aggregate(habits, entries, habit.id, new Set([selectedDate])) : 0,
        ]),
      ),
    [dayHabits, habits, entries, selectedDate],
  );
  return { dayHabits, categoriesByDay, dayTotals };
}
