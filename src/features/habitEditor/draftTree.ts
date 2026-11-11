import type { TreeDraftCreate, TreeDraftUpdate } from '@/data/repository';
import { isValidCalendarThreshold } from '@/domain/calendarThreshold';
import type { TreeAttachment } from '@/domain/treeAttachments';
import type { Habit, HabitNode, HabitType } from '@/domain/types';
import { t } from '@/i18n';
import { makeId } from '@/utils/id';

export type DraftNode = {
  key: string;
  id?: string;
  name: string;
  emoji: string;
  color: Habit['color'];
  calendarThreshold: number | null;
  children: DraftNode[];
};
type DraftPatch = Partial<Pick<DraftNode, 'name' | 'emoji' | 'color' | 'calendarThreshold'>>;
export const draftKey = makeId;

export const fromNode = (node: HabitNode): DraftNode => ({
  key: node.id,
  id: node.id,
  name: node.name,
  emoji: node.emoji,
  color: node.color ?? null,
  calendarThreshold: node.calendarThreshold ?? null,
  children: node.children.map(fromNode),
});

export const changeNode = (items: DraftNode[], key: string, patch: DraftPatch): DraftNode[] =>
  items.map(item =>
    item.key === key ? { ...item, ...patch } : { ...item, children: changeNode(item.children, key, patch) },
  );
export const invalidThresholds = (nodes: DraftNode[], type: HabitType): boolean =>
  nodes.some(node => !isValidCalendarThreshold(type, node.calendarThreshold) || invalidThresholds(node.children, type));
export const addNode = (items: DraftNode[], parentKey: string, node: DraftNode, first = false): DraftNode[] =>
  items.map(item =>
    item.key === parentKey
      ? { ...item, children: first ? [node, ...item.children] : [...item.children, node] }
      : { ...item, children: addNode(item.children, parentKey, node, first) },
  );
export const dropNode = (items: DraftNode[], key: string): DraftNode[] =>
  items.filter(item => item.key !== key).map(item => ({ ...item, children: dropNode(item.children, key) }));
export function reorderNode(items: DraftNode[], key: string, direction: -1 | 1): DraftNode[] {
  const index = items.findIndex(item => item.key === key);
  if (index >= 0) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }
  for (const [index, item] of items.entries()) {
    const children = reorderNode(item.children, key, direction);
    if (children !== item.children) {
      const next = [...items];
      next[index] = { ...item, children };
      return next;
    }
  }
  return items;
}
export const nodeKeys = (nodes: DraftNode[]): string[] => nodes.flatMap(node => [node.key, ...nodeKeys(node.children)]);

export function attachmentPositions(nodes: DraftNode[], moves: TreeAttachment[]): TreeAttachment[] {
  const indices = new Map<string, number>();
  const visit = (items: DraftNode[]) =>
    items.forEach((item, index) => {
      indices.set(item.key, index);
      visit(item.children);
    });
  visit(nodes);
  return moves.map(move => {
    const index = indices.get(move.id);
    if (index === undefined) throw new Error('Invalid draft attachment');
    return { ...move, index };
  });
}

export function draftPath(nodes: DraftNode[], key: string): string[] | null {
  for (const node of nodes) {
    const name = node.name.trim() || t('newCategory');
    if (node.key === key) return [name];
    const child = draftPath(node.children, key);
    if (child) return [name, ...child];
  }
  return null;
}

// Emit repository drafts in preorder, keeping explicit positions only where needed.
export function flatten(
  items: DraftNode[],
  parentKey: string,
  updates: TreeDraftUpdate[],
  creates: TreeDraftCreate[],
  habits: Habit[] = [],
) {
  const originalByParent = new Map<string, Habit[]>();
  for (const habit of habits) {
    if (!habit.parentId || habit.isGeneral) continue;
    const siblings = originalByParent.get(habit.parentId) ?? [];
    siblings.push(habit);
    originalByParent.set(habit.parentId, siblings);
  }
  for (const siblings of originalByParent.values()) siblings.sort((a, b) => a.sortOrder - b.sortOrder);
  const visit = (nodes: DraftNode[], parent: string) => {
    const retained = new Set(nodes.flatMap(item => (item.id ? [item.id] : [])));
    const original = (originalByParent.get(parent) ?? []).filter(item => retained.has(item.id)).map(item => item.id);
    const existing = new Set(original),
      current = nodes.flatMap(item => (item.id && existing.has(item.id) ? [item.id] : []));
    const reordered = current.some((id, index) => id !== original[index]);
    for (const [index, item] of nodes.entries()) {
      const fields = {
        name: item.name,
        emoji: item.emoji,
        color: item.color,
        calendarThreshold: item.calendarThreshold,
      };
      if (item.id) updates.push({ id: item.id, ...fields, ...(reordered ? { index } : {}) });
      else creates.push({ key: item.key, parentKey: parent, index, ...fields });
      visit(item.children, item.key);
    }
  };
  visit(items, parentKey);
}
