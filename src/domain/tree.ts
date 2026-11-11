import { Habit, HabitNode } from './types';

function childrenByParent(habits: Habit[]): Map<string, Habit[]> {
  const children = new Map<string, Habit[]>();
  for (const habit of habits)
    if (habit.parentId) {
      const siblings = children.get(habit.parentId) ?? [];
      siblings.push(habit);
      children.set(habit.parentId, siblings);
    }
  return children;
}

export function archivedBranchIds(habits: Habit[]): Set<string> {
  const archived = new Set(habits.filter(habit => habit.archivedAt).map(habit => habit.id));
  if (!archived.size) return archived;
  const children = childrenByParent(habits),
    pending = [...archived];
  while (pending.length)
    for (const child of children.get(pending.pop()!) ?? []) {
      if (!archived.has(child.id)) {
        archived.add(child.id);
        pending.push(child.id);
      }
    }
  return archived;
}

export function buildTree(habits: Habit[], includeArchived = false): HabitNode[] {
  const archived = includeArchived ? new Set<string>() : archivedBranchIds(habits);
  const visible = habits.filter(h => !h.isGeneral && !archived.has(h.id));
  const nodes = new Map(visible.map(h => [h.id, { ...h, children: [] } as HabitNode]));
  const roots: HabitNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const pending = [roots];
  while (pending.length) {
    const siblings = pending.pop()!;
    siblings.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const node of siblings) if (node.children.length) pending.push(node.children);
  }
  return roots;
}

export function descendants(habits: Habit[], id: string): Habit[] {
  const result: Habit[] = [],
    queue = [id],
    seen = new Set([id]),
    children = childrenByParent(habits);
  for (let index = 0; index < queue.length; index++)
    for (const child of children.get(queue[index]) ?? []) {
      if (!seen.has(child.id)) {
        seen.add(child.id);
        result.push(child);
        queue.push(child.id);
      }
    }
  return result;
}

export function topLevelAncestor(habits: Habit[], id: string): Habit | undefined {
  const byId = new Map(habits.map(h => [h.id, h]));
  let current = byId.get(id);
  if (!current) return undefined;
  const seen = new Set<string>();
  while (current.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

export function validateMove(habits: Habit[], id: string, parentId: string | null): string | null {
  const item = habits.find(h => h.id === id);
  if (!item) return 'Habit not found';
  if (id === parentId) return 'A habit cannot contain itself';
  if (parentId && descendants(habits, id).some(h => h.id === parentId)) return 'A habit cannot move into a descendant';
  const parent = parentId ? habits.find(h => h.id === parentId) : undefined;
  if (parentId && !parent) return 'Parent not found';
  if (parent && parent.type !== item.type) return 'A branch must use one type';
  return null;
}

export function assertHomogeneousAcyclic(habits: Habit[]): void {
  const byId = new Map(habits.map(h => [h.id, h]));
  for (const habit of habits) {
    const seen = new Set<string>([habit.id]);
    let current = habit;
    while (current.parentId) {
      const parent = byId.get(current.parentId);
      if (!parent) throw new Error(`Missing parent: ${current.parentId}`);
      if (parent.type !== habit.type) throw new Error('Mixed types in branch');
      if (seen.has(parent.id)) throw new Error('Cycle in habit tree');
      seen.add(parent.id);
      current = parent;
    }
  }
}
