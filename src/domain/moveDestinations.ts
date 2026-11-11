import { archivedBranchIds, buildTree, descendants } from './tree';
import type { Habit, HabitNode } from './types';

export interface MoveDestination {
  habit: Habit;
  /** Full path of the destination, e.g. `Health / Recovery`. */
  path: string;
}

/** A habit can be moved unless it is a General placeholder or part of an archived branch. */
export function canMoveHabit(habits: Habit[], id: string): boolean {
  const habit = habits.find(item => item.id === id);
  return !!habit && !habit.isGeneral && !archivedBranchIds(habits).has(id);
}

/**
 * Habits that can become the new parent of `id`, in display order: same type, active,
 * outside its own branch, and not the parent it already has.
 */
export function moveDestinations(habits: Habit[], id: string): MoveDestination[] {
  const item = habits.find(habit => habit.id === id);
  if (!item) return [];
  const ownBranch = new Set([id, ...descendants(habits, id).map(habit => habit.id)]);
  const destinations: MoveDestination[] = [];
  // `buildTree` already leaves out General and archived habits.
  const pending: { node: HabitNode; trail: string[] }[] = buildTree(habits)
    .map(node => ({ node, trail: [] as string[] }))
    .reverse();
  while (pending.length) {
    const { node, trail } = pending.pop()!;
    if (ownBranch.has(node.id)) continue;
    const path = [...trail, node.name];
    if (node.type === item.type && node.id !== item.parentId) {
      destinations.push({ habit: node, path: path.join(' / ') });
    }
    for (let index = node.children.length - 1; index >= 0; index--) {
      pending.push({ node: node.children[index], trail: path });
    }
  }
  return destinations;
}

/** What moves along with a habit: its real sub-habits and every record in the branch. */
export function moveSummary(habits: Habit[], entries: { habitId: string }[], id: string) {
  const branch = descendants(habits, id);
  const ids = new Set([id, ...branch.map(habit => habit.id)]);
  return {
    habits: branch.filter(habit => !habit.isGeneral).length,
    records: entries.filter(entry => ids.has(entry.habitId)).length,
  };
}
