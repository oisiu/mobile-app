import { TimeBucket } from './analytics';
import { Entry,Habit } from './types';
import { descendants } from './tree';

// Daily exponential smoothing: thirteen consecutive active days reach 50%.
const retention=2**(-1/13);
const dayNumber=(date:string)=>Math.round(Date.parse(`${date}T12:00:00Z`)/86400000);

export function habitStrength(habit:Habit,habits:Habit[],entries:Entry[],buckets:TimeBucket[]):number[]{
  const parents=new Set(habits.map(item=>item.parentId));
  const leaves=new Set([habit,...descendants(habits,habit.id)].filter(item=>!parents.has(item.id)).map(item=>item.id));
  const active=[...new Set(entries.filter(entry=>leaves.has(entry.habitId)&&entry.value>0).map(entry=>entry.localDate))].sort();
  const dates=[...new Set(buckets.flatMap(bucket=>[...bucket.dates]))].sort();
  const scores=new Map<string,number>();
  let score=0,previous=dayNumber([active[0],dates[0]].filter(Boolean).sort()[0]??'1970-01-01'),index=0;
  for(const date of dates){
    const day=dayNumber(date);
    while(index<active.length&&active[index]<=date){
      const activeDay=dayNumber(active[index++]);
      score=score*retention**(activeDay-previous)+(1-retention)*100;
      previous=activeDay;
    }
    score*=retention**(day-previous);previous=day;
    scores.set(date,Math.max(0,Math.min(100,score)));
  }
  return buckets.map(bucket=>bucket.dates.size?[...bucket.dates].reduce((sum,date)=>sum+scores.get(date)!,0)/bucket.dates.size:0);
}

export function strengthSummary(habit:Habit,habits:Habit[],entries:Entry[],today:string){
  const date=(days:number)=>new Date(Date.parse(`${today}T12:00:00Z`)-days*86400000).toISOString().slice(0,10);
  const [year,month,current]=habitStrength(habit,habits,entries,[365,30,0].map(days=>({key:date(days),label:'',dates:new Set([date(days)])})));
  const parents=new Set(habits.map(item=>item.parentId));
  const leaves=new Set([habit,...descendants(habits,habit.id)].filter(item=>!parents.has(item.id)).map(item=>item.id));
  const total=new Set(entries.filter(entry=>leaves.has(entry.habitId)&&entry.value>0&&entry.localDate<=today).map(entry=>entry.localDate)).size;
  return {current,monthChange:current-month,yearChange:current-year,total};
}
