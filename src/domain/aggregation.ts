import { Entry, Habit } from './types';

type AggregationIndex={
  habitById:Map<string,Habit>;
  leafIds:(habitId:string)=>string[];
  value:(habitId:string,date:string)=>number;
  active:(habitId:string,date:string)=>boolean;
  has:(habitId:string,date:string)=>boolean;
};
const aggregationIndexes=new WeakMap<Habit[],WeakMap<Entry[],AggregationIndex>>();

export function aggregationIndex(habits:Habit[],entries:Entry[]):AggregationIndex{
  let byEntries=aggregationIndexes.get(habits);if(!byEntries){byEntries=new WeakMap();aggregationIndexes.set(habits,byEntries)}
  const cached=byEntries.get(entries);if(cached)return cached;
  const habitById=new Map(habits.map(habit=>[habit.id,habit])),children=new Map<string,string[]>(),leaves=new Map<string,string[]>(),values=new Map<string,Map<string,number>>(),activeValues=new Map<string,Set<string>>();
  for(const habit of habits)if(habit.parentId){const ids=children.get(habit.parentId)??[];ids.push(habit.id);children.set(habit.parentId,ids)}
  for(const entry of entries){let dates=values.get(entry.habitId);if(!dates){dates=new Map();values.set(entry.habitId,dates)}dates.set(entry.localDate,(dates.get(entry.localDate)??0)+entry.value);if(entry.value){let activeDates=activeValues.get(entry.habitId);if(!activeDates){activeDates=new Set();activeValues.set(entry.habitId,activeDates)}activeDates.add(entry.localDate)}}
  const leafIds=(habitId:string):string[]=>{const known=leaves.get(habitId);if(known)return known;const result:string[]=[],stack=[habitId];while(stack.length){const id=stack.pop()!,kids=children.get(id)??[];if(kids.length)stack.push(...kids);else result.push(id)}leaves.set(habitId,result);return result};
  const index={habitById,leafIds,value:(habitId:string,date:string)=>values.get(habitId)?.get(date)??0,active:(habitId:string,date:string)=>activeValues.get(habitId)?.has(date)??false,has:(habitId:string,date:string)=>values.get(habitId)?.has(date)??false};
  byEntries.set(entries,index);return index;
}

export function aggregate(habits:Habit[], entries:Entry[], habitId:string, dates:Set<string>):number {
  const index=aggregationIndex(habits,entries),root=index.habitById.get(habitId);if(!root)return 0;
  const leaves=index.leafIds(habitId),dateList=[...dates];
  if(root.type==='boolean')return leaves.some(id=>dateList.some(date=>index.active(id,date)))?1:0;
  let total=0;for(const id of leaves)for(const date of dateList)total+=index.value(id,date);return total;
}
export function formatValue(type:Habit['type'],value:number):string { if(type==='boolean') return value?'✓':'–'; if(!value) return '–'; if(type==='number') return Number(value.toFixed(2)).toString(); const h=Math.floor(value/3600),m=Math.round((value%3600)/60); return [h&&`${h}h`,m&&`${m}m`].filter(Boolean).join(' ')||'<1m'; }
