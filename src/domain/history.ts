import { addDays,addMonths } from '../utils/dates';
import { buildScoreWindow,InsightPeriod,InsightWindow,TimeBucket } from './analytics';
import { descendants } from './tree';
import { Entry,Habit } from './types';

export function historyWeekLabel(start:string):string{
  const monday=new Date(`${start}T12:00:00Z`);
  const thursday=new Date(monday);
  thursday.setUTCDate(thursday.getUTCDate()+3);
  const weekYear=thursday.getUTCFullYear();
  const firstThursday=new Date(Date.UTC(weekYear,0,4,12));
  firstThursday.setUTCDate(firstThursday.getUTCDate()+3-((firstThursday.getUTCDay()+6)%7));
  const number=1+Math.round((thursday.getTime()-firstThursday.getTime())/(7*86400000));
  return `${number} ${weekYear}`;
}

export function buildHistoryWindow(period:InsightPeriod,anchor:string,today:string):InsightWindow{
  if(period==='week'||period==='month')return buildScoreWindow(period,anchor,today);
  const buckets:TimeBucket[]=[],year=Number(anchor.slice(0,4));
  const append=(key:string,label:string,start:string,end:string)=>{
    const dates=new Set<string>();
    for(let date=start;date<=end&&date<=today;date=addDays(date,1))dates.add(date);
    buckets.push({key,label,dates});
  };
  if(period==='quarter'){
    const last=anchor.slice(0,7),first=addMonths(last,-11);
    for(let index=0;index<12;index++){
      const month=addMonths(first,index),start=`${month}-01`;
      append(month,new Intl.DateTimeFormat(undefined,{month:'short'}).format(new Date(`${start}T12:00:00`)),start,addDays(`${addMonths(month,1)}-01`,-1));
    }
    const end=addDays(`${addMonths(last,1)}-01`,-1);
    return {start:`${first}-01`,end:end>today?today:end,buckets};
  }
  for(let item=year-5;item<=year;item++)append(String(item),String(item),`${item}-01-01`,`${item}-12-31`);
  const end=`${year}-12-31`;
  return {start:`${year-5}-01-01`,end:end>today?today:end,buckets};
}
export function shiftHistoryAnchor(anchor:string,period:InsightPeriod,amount:number,today:string):string{
  if(period==='week'){
    const monday=(date:string)=>addDays(date,-((new Date(`${date}T12:00:00`).getDay()+6)%7));
    const next=addDays(monday(anchor),amount*7),current=monday(today);
    return next>current?current:next;
  }
  if(period==='month'||period==='quarter'){
    const month=addMonths(anchor.slice(0,7),amount*(period==='quarter'?12:1));
    return `${month>today.slice(0,7)?today.slice(0,7):month}-01`;
  }
  const year=Number(anchor.slice(0,4))+amount*6;
  return `${Math.min(year,Number(today.slice(0,4)))}-01-01`;
}

export function buildHistorySeries(selected:Habit[],habits:Habit[],entries:Entry[],buckets:TimeBucket[]){
  const parents=new Set(habits.map(h=>h.parentId));
  const unique=selected.filter((h,index)=>selected.findIndex(item=>item.id===h.id)===index);
  const branches=unique.map(habit=>new Set([habit,...descendants(habits,habit.id)].map(h=>h.id)));
  // Each leaf belongs to the deepest selected branch, never both child and parent.
  const owners=new Map<string,number>();
  habits.filter(h=>!parents.has(h.id)).forEach(leaf=>{
    let owner=-1;
    unique.forEach((habit,index)=>{
      if(branches[index].has(leaf.id)&&(owner<0||branches[owner].has(habit.id)))owner=index;
    });
    if(owner>=0)owners.set(leaf.id,owner);
  });
  const series=unique.map(habit=>({habit,records:buckets.map(()=>[] as Entry[]),values:buckets.map(()=>0)}));
  buckets.forEach((bucket,bucketIndex)=>{
    const days=new Map<string,Set<number>>();
    entries.forEach(entry=>{
      const owner=owners.get(entry.habitId);
      if(owner===undefined||!bucket.dates.has(entry.localDate))return;
      series[owner].records[bucketIndex].push(entry);
      if(unique[owner].type!=='boolean')series[owner].values[bucketIndex]+=entry.value;
      else if(entry.value>0){
        const active=days.get(entry.localDate)??new Set<number>();
        active.add(owner);days.set(entry.localDate,active);
      }
    });
    // Shared Boolean dates occupy one day in total, split among active segments.
    days.forEach(active=>active.forEach(owner=>{series[owner].values[bucketIndex]+=1/active.size}));
  });
  return series;
}

export function historyAxis(values:number[],type:Habit['type']){
  const peak=Math.max(0,...values.filter(Number.isFinite));
  const divisor=type==='duration'?(peak>=3600?3600:peak>=60?60:1):1;
  const unit=type==='duration'?(divisor===3600?'hours':divisor===60?'minutes':'seconds'):type==='boolean'?'activeDays':'total';
  const maximum=peak/divisor||4,rawStep=maximum/4,power=10**Math.floor(Math.log10(rawStep)),fraction=rawStep/power;
  let step=(fraction<=1?1:fraction<=2?2:fraction<=5?5:10)*power;
  if(type==='boolean')step=Math.max(1,step);
  const intervals=Math.max(1,Math.ceil(maximum/step)),max=Number((intervals*step).toPrecision(12));
  const ticks=Array.from({length:intervals+1},(_,index)=>Number((index*step).toPrecision(12)));
  return {max,ticks,step,divisor,unit} as const;
}
