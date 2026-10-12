import { aggregate } from './aggregation';
import { TimeBucket } from './analytics';
import { Entry,Habit } from './types';

export function buildFrequency(habit:Habit,habits:Habit[],entries:Entry[],buckets:TimeBucket[]){
  const dates=new Set(buckets.flatMap(bucket=>[...bucket.dates]));
  const active=new Set([...dates].filter(date=>aggregate(habits,entries,habit.id,new Set([date]))>0));
  const rows=Array.from({length:7},()=>buckets.map(()=>({count:0,possible:0,intensity:0,size:4})));
  buckets.forEach((bucket,column)=>{
    for(const date of bucket.dates){
      const weekday=(new Date(`${date}T12:00:00`).getDay()+6)%7,cell=rows[weekday][column];
      cell.possible++;
      if(active.has(date))cell.count++;
    }
  });
  for(const row of rows)for(const cell of row){
    cell.intensity=cell.possible?cell.count/cell.possible:0;
    cell.size=4+18*cell.intensity;
  }
  return {rows};
}
