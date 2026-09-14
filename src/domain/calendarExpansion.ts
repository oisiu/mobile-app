import { buildTree } from './tree';
import { Entry,Habit,HabitNode } from './types';

export function calendarExpandedGroups(habits:Habit[],entries:Entry[],date:string):Set<string>{
  const recorded=new Set(entries.filter(entry=>entry.localDate===date).map(entry=>entry.habitId));
  // Hidden General records belong to their visible parent.
  for(const habit of habits){
    if(habit.isGeneral&&habit.parentId&&recorded.has(habit.id))recorded.add(habit.parentId);
  }
  const expanded=new Set<string>();
  const visit=(habit:HabitNode):boolean=>{
    const childRecords=habit.children.map(visit);
    const hasRecord=recorded.has(habit.id)||childRecords.some(Boolean);
    if(habit.children.length&&hasRecord)expanded.add(habit.id);
    return hasRecord;
  };
  buildTree(habits).forEach(visit);
  return expanded;
}
