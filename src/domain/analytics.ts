import { addDays,addMonths } from '../utils/dates';

export type InsightScale='weeks'|'months'|'years';
export type InsightPeriod='week'|'month'|'quarter'|'year';
export interface TimeBucket { key:string; label:string; dates:Set<string> }
export interface InsightWindow { start:string; end:string; buckets:TimeBucket[] }
export interface ActivityStreak { start:string; end:string; length:number }

function localDate(date:Date){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`}
function daysBetween(start:string,end:string){const values=new Set<string>();for(let date=start;date<=end;date=addDays(date,1))values.add(date);return values}
function endOfMonth(month:string){return addDays(`${addMonths(month,1)}-01`,-1)}
function monthLabel(month:string){return new Intl.DateTimeFormat(undefined,{month:'short'}).format(new Date(`${month}-01T12:00:00`))}
function dayLabel(date:string){return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).format(new Date(`${date}T12:00:00`))}

export function shiftInsightAnchor(anchor:string,period:InsightPeriod,amount:number){
  if(period==='week')return addDays(anchor,amount*7);
  if(period==='month')return `${addMonths(anchor.slice(0,7),amount)}-01`;
  if(period==='quarter')return `${addMonths(anchor.slice(0,7),amount*3)}-01`;
  return `${Number(anchor.slice(0,4))+amount}-01-01`;
}

export function buildInsightWindow(period:InsightPeriod,anchor:string,today:string):InsightWindow{
  const date=new Date(`${anchor}T12:00:00`),year=date.getFullYear(),month=date.getMonth(),weekday=(date.getDay()+6)%7;
  let start:string,end:string,buckets:TimeBucket[]=[];
  if(period==='week'){
    start=addDays(anchor,-weekday);end=addDays(start,6);
    const cappedEnd=end>today?today:end;
    buckets=[...daysBetween(start,cappedEnd)].map(value=>({key:value,label:new Intl.DateTimeFormat(undefined,{weekday:'narrow'}).format(new Date(`${value}T12:00:00`)),dates:new Set([value])}));
  }else if(period==='month'){
    start=`${anchor.slice(0,7)}-01`;end=endOfMonth(anchor.slice(0,7));
    const cappedEnd=end>today?today:end;
    buckets=[...daysBetween(start,cappedEnd)].map(value=>({key:value,label:String(Number(value.slice(-2))),dates:new Set([value])}));
  }else if(period==='quarter'){
    const quarterMonth=Math.floor(month/3)*3+1,quarter=`${year}-${String(quarterMonth).padStart(2,'0')}`;
    start=`${quarter}-01`;end=endOfMonth(addMonths(quarter,2));
    const cappedEnd=end>today?today:end;
    for(let bucketStart=start;bucketStart<=cappedEnd;bucketStart=addDays(bucketStart,7)){
      const bucketEnd=addDays(bucketStart,6)>cappedEnd?cappedEnd:addDays(bucketStart,6);
      buckets.push({key:bucketStart,label:dayLabel(bucketStart),dates:daysBetween(bucketStart,bucketEnd)});
    }
  }else{
    start=`${year}-01-01`;end=`${year}-12-31`;
    for(let index=0;index<12;index++){
      const monthKey=`${year}-${String(index+1).padStart(2,'0')}`,bucketStart=`${monthKey}-01`,bucketEnd=endOfMonth(monthKey),cappedEnd=bucketEnd>today?today:bucketEnd;
      if(bucketStart<=today)buckets.push({key:monthKey,label:monthLabel(monthKey),dates:daysBetween(bucketStart,cappedEnd)});
    }
  }
  return {start,end:end>today?today:end,buckets};
}

export function buildScoreWindow(period:Exclude<InsightPeriod,'quarter'>,anchor:string,today:string):InsightWindow{
  const window=buildInsightWindow(period,anchor,'9999-12-31');
  return {...window,end:window.end>today?today:window.end,buckets:window.buckets.map(bucket=>({...bucket,dates:new Set([...bucket.dates].filter(date=>date<=today))}))};
}

export function buildTimeBuckets(scale:InsightScale,today:string):TimeBucket[]{
  const current=new Date(`${today}T12:00:00`),buckets:TimeBucket[]=[];
  if(scale==='weeks'){
    const monday=addDays(today,-((current.getDay()+6)%7));
    for(let offset=-7;offset<=0;offset++){const start=addDays(monday,offset*7),end=addDays(start,6);buckets.push({key:start,label:new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).format(new Date(`${start}T12:00:00`)),dates:daysBetween(start,end>today?today:end)})}
  }else if(scale==='months'){
    for(let offset=-12;offset<=0;offset++){const startDate=new Date(current.getFullYear(),current.getMonth()+offset,1,12),start=localDate(startDate),endDate=new Date(startDate.getFullYear(),startDate.getMonth()+1,0,12),end=localDate(endDate);buckets.push({key:start.slice(0,7),label:new Intl.DateTimeFormat(undefined,{month:'short'}).format(startDate),dates:daysBetween(start,end>today?today:end)})}
  }else{
    for(let offset=-4;offset<=0;offset++){const year=current.getFullYear()+offset,start=`${year}-01-01`,end=`${year}-12-31`;buckets.push({key:String(year),label:String(year),dates:daysBetween(start,end>today?today:end)})}
  }
  return buckets;
}

export function bestActivityStreaks(activeDates:Set<string>,limit=5):ActivityStreak[]{
  const dates=[...activeDates].sort(),streaks:ActivityStreak[]=[];
  let start:string|null=null,previous:string|null=null;
  for(const date of dates){
    if(!start||!previous||addDays(previous,1)!==date){if(start&&previous)streaks.push({start,end:previous,length:Math.round((new Date(`${previous}T12:00:00`).getTime()-new Date(`${start}T12:00:00`).getTime())/86400000)+1});start=date}
    previous=date;
  }
  if(start&&previous)streaks.push({start,end:previous,length:Math.round((new Date(`${previous}T12:00:00`).getTime()-new Date(`${start}T12:00:00`).getTime())/86400000)+1});
  return streaks.sort((a,b)=>b.length-a.length||b.end.localeCompare(a.end)).slice(0,limit);
}
