import { Entry,Habit } from './types';

export function visibleHabitSnapshot(habits:Habit[],entries:Entry[]){
  const hidden=new Set(habits.filter(habit=>habit.isHidden).map(habit=>habit.id));
  if(!hidden.size)return {habits,entries};
  const children=new Map<string,string[]>();
  for(const habit of habits)if(habit.parentId){const ids=children.get(habit.parentId)??[];ids.push(habit.id);children.set(habit.parentId,ids)}
  const pending=[...hidden];
  while(pending.length)for(const id of children.get(pending.pop()!)??[])if(!hidden.has(id)){hidden.add(id);pending.push(id)}
  return {habits:habits.filter(habit=>!hidden.has(habit.id)),entries:entries.filter(entry=>!hidden.has(entry.habitId))};
}
