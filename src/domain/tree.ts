import { Habit, HabitNode } from './types';

export function buildTree(habits: Habit[], includeArchived=false): HabitNode[] {
  const visible = habits.filter(h => !h.isGeneral && (includeArchived || !h.archivedAt));
  const nodes = new Map(visible.map(h => [h.id, {...h, children:[]} as HabitNode]));
  const roots: HabitNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const sort = (items: HabitNode[]) => items.sort((a,b)=>a.sortOrder-b.sortOrder).forEach(n=>sort(n.children));
  sort(roots); return roots;
}

export function descendants(habits: Habit[], id:string): Habit[] {
  const result: Habit[]=[]; const queue=[id];
  while(queue.length){ const parent=queue.shift()!; for(const h of habits) if(h.parentId===parent){ result.push(h); queue.push(h.id); } }
  return result;
}

export function topLevelAncestor(habits:Habit[],id:string):Habit|undefined { const byId=new Map(habits.map(h=>[h.id,h])); let current=byId.get(id); if(!current)return undefined; const seen=new Set<string>(); while(current.parentId&&!seen.has(current.id)){seen.add(current.id);const parent=byId.get(current.parentId);if(!parent)break;current=parent} return current; }

export function validateMove(habits:Habit[], id:string, parentId:string|null): string|null {
  const item=habits.find(h=>h.id===id); if(!item) return 'Habit not found';
  if(id===parentId) return 'A habit cannot contain itself';
  if(parentId && descendants(habits,id).some(h=>h.id===parentId)) return 'A habit cannot move into a descendant';
  const parent=parentId ? habits.find(h=>h.id===parentId) : undefined;
  if(parentId && !parent) return 'Parent not found';
  if(parent && parent.type!==item.type) return 'A branch must use one type';
  return null;
}

export function assertHomogeneousAcyclic(habits:Habit[]): void {
  const byId=new Map(habits.map(h=>[h.id,h]));
  for(const habit of habits){
    const seen=new Set<string>([habit.id]); let current=habit;
    while(current.parentId){ const parent=byId.get(current.parentId); if(!parent) throw new Error(`Missing parent: ${current.parentId}`); if(parent.type!==habit.type) throw new Error('Mixed types in branch'); if(seen.has(parent.id)) throw new Error('Cycle in habit tree'); seen.add(parent.id); current=parent; }
  }
}
