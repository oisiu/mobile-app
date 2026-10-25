import { aggregate,aggregationIndex } from './aggregation';
import { HabitColor,inheritedHabitColor } from './habitAppearance';
import { calendarFillOpacity } from './calendarThreshold';
import { Entry,Habit } from './types';

export type CalendarFill={color:HabitColor|null;opacity:number};

export function calendarActivity(selected:Habit[],habits:Habit[],entries:Entry[],dates:string[],originalHabits=habits,originalEntries=entries){
  const index=aggregationIndex(habits,entries),originalById=new Map(originalHabits.map(habit=>[habit.id,habit]));
  const children=new Map<string|null,Habit[]>();
  for(const habit of habits){const siblings=children.get(habit.parentId)??[];siblings.push(habit);children.set(habit.parentId,siblings)}
  for(const siblings of children.values())siblings.sort((a,b)=>a.sortOrder-b.sortOrder||a.id.localeCompare(b.id));
  const order=new Map<string,number>(),stack=[...(children.get(null)??[])].reverse();
  while(stack.length){const habit=stack.pop()!;order.set(habit.id,order.size);stack.push(...[...(children.get(habit.id)??[])].reverse())}
  const days=new Map<string,CalendarFill[]>();
  for(const branch of selected){
    const leaves=[...index.leafIds(branch.id)].sort((a,b)=>(order.get(a)??0)-(order.get(b)??0)).map(id=>{
      let current=index.habitById.get(id),owner:Habit|undefined;
      while(current){
        if(current.color&&!current.isGeneral){owner=current;break}
        if(current.id===branch.id)break;
        current=current.parentId?index.habitById.get(current.parentId):undefined;
      }
      return {id,color:owner?.color??inheritedHabitColor(branch,habits),child:!!owner&&owner.id!==branch.id};
    });
    const original=originalById.get(branch.id)??branch;
    for(const date of dates){
      const active=leaves.filter(leaf=>index.active(leaf.id,date));
      if(!active.length)continue;
      const hasChildColor=active.some(leaf=>leaf.child);
      const opacity=original.calendarThreshold==null?1:calendarFillOpacity(original.calendarThreshold,aggregate(originalHabits,originalEntries,branch.id,new Set([date])));
      const fills=days.get(date)??[];
      for(const leaf of active){
        if(hasChildColor&&!leaf.child)continue;
        const existing=fills.find(fill=>fill.color===leaf.color);
        if(existing)existing.opacity=Math.max(existing.opacity,opacity);
        else fills.push({color:leaf.color,opacity});
      }
      days.set(date,fills);
    }
  }
  return days;
}
