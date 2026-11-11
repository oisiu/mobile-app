import type { Habit } from '@/domain/types';

// Candidate order is independent of ancestry; walk each uncached path only once.
export function habitDepths(candidates: Habit[]) {
  const byId = new Map(candidates.map(habit => [habit.id, habit]));
  const depths = new Map<string, number>();
  for (const habit of candidates) {
    const path: string[] = [];
    let current: Habit | undefined = habit;
    while (current && !depths.has(current.id)) {
      path.push(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    let depth = current ? depths.get(current.id)! : -1;
    for (let index = path.length - 1; index >= 0; index--) depths.set(path[index], ++depth);
  }
  return depths;
}
