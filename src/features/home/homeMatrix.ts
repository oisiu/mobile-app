import { aggregateByDate, formatValue } from '@/domain/aggregation';
import type { Entry, Habit, HabitNode } from '@/domain/types';

export type HomeHabitItem = { habit: HabitNode; depth: number; groupEnd: boolean; rootId: string };

export function visibleHomeHabits(roots: HabitNode[], expanded: Set<string>) {
  const result: HomeHabitItem[] = [];
  const visit = (habit: HabitNode, depth: number, rootId: string) => {
    result.push({ habit, depth, groupEnd: false, rootId });
    if (expanded.has(habit.id)) habit.children.forEach(child => visit(child, depth + 1, rootId));
  };
  for (const root of roots) {
    visit(root, 0, root.id);
    result[result.length - 1].groupEnd = true;
  }
  return result;
}

export function homeDayValues(items: HomeHabitItem[], habits: Habit[], entries: Entry[], days: string[]) {
  // Preserve snapshot identity so adjacent windows reuse the shared entry index.
  return new Map(
    items.map(({ habit }) => {
      const values = aggregateByDate(habits, entries, habit.id, days);
      return [habit.id, new Map([...values].map(([date, value]) => [date, formatValue(habit.type, value)]))];
    }),
  );
}
