import { Habit } from '../../domain/types';

// Preorder keeps each complete subtree together regardless of repository row order.
export function orderedCandidates(habits:Habit[],root:Habit):Habit[]{
  const children=new Map<string,Habit[]>();
  for(const habit of habits){
    if(!habit.parentId||habit.isGeneral||habit.archivedAt)continue;
    const siblings=children.get(habit.parentId)??[];
    siblings.push(habit);
    children.set(habit.parentId,siblings);
  }
  for(const siblings of children.values())siblings.sort((a,b)=>a.sortOrder-b.sortOrder);
  const result:Habit[]=[],stack=[root],seen=new Set<string>();
  while(stack.length){
    const habit=stack.pop()!;
    if(seen.has(habit.id))continue;
    seen.add(habit.id);
    result.push(habit);
    const siblings=children.get(habit.id)??[];
    for(let index=siblings.length-1;index>=0;index--)stack.push(siblings[index]);
  }
  return result;
}
