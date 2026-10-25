import { BucketSize,TimeBucket } from './analytics';
import { addDays,addMonths } from '../utils/dates';

export function buildTimelineBuckets(scale:BucketSize,today:string,count:number):TimeBucket[]{
  const month=Number(today.slice(5,7)),year=today.slice(0,4);
  const last=scale==='day'?today:scale==='week'?addDays(today,-((new Date(`${today}T12:00:00`).getDay()+6)%7)):scale==='year'?`${year}-01-01`:scale==='quarter'?`${year}-${String(Math.floor((month-1)/3)*3+1).padStart(2,'0')}-01`:`${today.slice(0,7)}-01`;
  return Array.from({length:count},(_,index)=>{
    const offset=index-count+1;
    const start=scale==='day'||scale==='week'?addDays(last,offset*(scale==='week'?7:1)):`${addMonths(last.slice(0,7),offset*(scale==='year'?12:scale==='quarter'?3:1))}-01`;
    const end=scale==='day'?start:scale==='week'?addDays(start,6):addDays(`${addMonths(start.slice(0,7),scale==='year'?12:scale==='quarter'?3:1)}-01`,-1);
    const dates=new Set<string>();
    for(let date=start;date<=end&&date<=today;date=addDays(date,1))dates.add(date);
    const label=scale==='day'?String(Number(start.slice(-2))):scale==='week'?`${Number(start.slice(-2))} ${new Intl.DateTimeFormat(undefined,{month:'short'}).format(new Date(`${start}T12:00:00`)).replace(/\./g,'')}`:scale==='year'?start.slice(0,4):new Intl.DateTimeFormat(undefined,{month:'short'}).format(new Date(`${start}T12:00:00`)).replace(/[.\s]/g,'').slice(0,3);
    return {key:start,label,dates};
  });
}

export function dayBucketContext(buckets:TimeBucket[],index:number):string|null{
  const month=buckets[index].key.slice(0,7);
  if(index>0&&month===buckets[index-1].key.slice(0,7))return null;
  return new Intl.DateTimeFormat(undefined,{month:'short',year:'numeric'}).format(new Date(`${month}-01T12:00:00`));
}
