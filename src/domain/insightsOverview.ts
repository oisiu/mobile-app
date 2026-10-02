import { aggregate,aggregationIndex } from './aggregation';
import { buildInsightWindow,TimeBucket } from './analytics';
import { buildTree } from './tree';
import { Entry,Habit } from './types';

export type OverviewPeriod='week'|'month'|'year';

export function buildInsightsOverview(habits:Habit[],entries:Entry[],today:string,period:OverviewPeriod='month',anchor=today){
  const dates=buildInsightWindow(period,anchor,today).buckets.flatMap(bucket=>[...bucket.dates]);
  const dateSet=new Set(dates);
  const ranked=buildTree(habits).filter(habit=>habit.parentId===null).map(habit=>({
    habit,
    active:dates.filter(date=>aggregate(habits,entries,habit.id,new Set([date]))>0).length,
    total:aggregate(habits,entries,habit.id,dateSet),
  })).sort((a,b)=>b.active-a.active||b.total-a.total||a.habit.sortOrder-b.habit.sortOrder);
  return {elapsedDays:dates.length,ranked};
}

export function buildRootActivitySeries(selected:Habit[],habits:Habit[],entries:Entry[],buckets:TimeBucket[]){
  const index=aggregationIndex(habits,entries),seen=new Set<string>();
  return selected.filter(habit=>{
    const current=index.habitById.get(habit.id);
    if(!current||current.parentId!==null||current.isGeneral||current.archivedAt||seen.has(current.id))return false;
    seen.add(current.id);return true;
  }).map(habit=>{
    const leaves=index.leafIds(habit.id);
    return {habit,values:buckets.map(bucket=>[...bucket.dates].filter(date=>leaves.some(id=>index.value(id,date)>0)).length)};
  });
}
