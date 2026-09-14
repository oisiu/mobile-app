import { aggregate } from './aggregation';
import { buildInsightWindow } from './analytics';
import { buildTree } from './tree';
import { Entry,Habit } from './types';

export function buildInsightsOverview(habits:Habit[],entries:Entry[],today:string){
  const dates=buildInsightWindow('month',today,today).buckets.map(bucket=>bucket.key);
  const dateSet=new Set(dates);
  const ranked=buildTree(habits).map(habit=>({
    habit,
    active:dates.filter(date=>aggregate(habits,entries,habit.id,new Set([date]))>0).length,
    total:aggregate(habits,entries,habit.id,dateSet),
  })).sort((a,b)=>b.active-a.active||b.total-a.total||a.habit.sortOrder-b.habit.sortOrder);
  return {elapsedDays:dates.length,ranked};
}
