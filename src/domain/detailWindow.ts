import { buildScoreWindow,InsightWindow,TimeBucket } from './analytics';
import { Entry } from './types';
import { addDays,addMonths } from '../utils/dates';

export type DetailPeriod='week'|'month'|'quarter'|'year'|'all';
export function buildDetailWindow(period:DetailPeriod,anchor:string,today:string,entries:Entry[]):InsightWindow{
  if(period==='week'||period==='month')return buildScoreWindow(period,anchor,today);
  const buckets:TimeBucket[]=[],year=Number(anchor.slice(0,4));
  const append=(key:string,label:string,start:string,end:string)=>{
    const dates=new Set<string>();
    for(let date=start;date<=end&&date<=today;date=addDays(date,1))dates.add(date);
    buckets.push({key,label,dates});
  };
  let start:string,end:string;
  if(period==='all'){
    const first=entries.reduce((min,entry)=>entry.localDate<min?entry.localDate:min,today).slice(0,4);
    start=first+'-01-01';end=today;
    for(let item=Number(first);item<=Number(today.slice(0,4));item++)append(String(item),String(item),String(item).padStart(4,'0')+'-01-01',String(item).padStart(4,'0')+'-12-31');
  }else{
    const month=period==='year'?0:Math.floor((Number(anchor.slice(5,7))-1)/3)*3;
    const first=`${String(year).padStart(4,'0')}-${String(month+1).padStart(2,'0')}`,count=period==='year'?12:3;
    start=first+'-01';end=addDays(addMonths(first,count)+'-01',-1);
    for(let index=0;index<count;index++){
      const key=addMonths(first,index),date=key+'-01';
      append(key,new Intl.DateTimeFormat(undefined,{month:'short'}).format(new Date(date+'T12:00:00')),date,addDays(addMonths(key,1)+'-01',-1));
    }
  }
  return {start,end:end>today?today:end,buckets};
}
export function shiftDetailAnchor(period:DetailPeriod,anchor:string,amount:number,today:string):string{
  if(period==='all')return today;
  const next=period==='week'?addDays(anchor,amount*7):period==='year'?`${String(Number(anchor.slice(0,4))+amount).padStart(4,'0')}-01-01`:addMonths(anchor.slice(0,7),amount*(period==='quarter'?3:1))+'-01';
  return next>today?today:next;
}

export function buildQuarterHistoryWindow(anchor:string,today:string):InsightWindow{
  const quarterMonth=Math.floor((Number(anchor.slice(5,7))-1)/3)*3+1;
  const quarterStart=`${anchor.slice(0,4)}-${String(quarterMonth).padStart(2,'0')}-01`;
  const first=addMonths(quarterStart.slice(0,7),-33),buckets:TimeBucket[]=[];
  for(let index=0;index<12;index++){
    const month=addMonths(first,index*3),start=month+'-01',end=addDays(addMonths(month,3)+'-01',-1);
    const quarter=Math.floor((Number(month.slice(5,7))-1)/3)+1,dates=new Set<string>();
    for(let date=start;date<=end&&date<=today;date=addDays(date,1))dates.add(date);
    buckets.push({key:month.slice(0,4)+'-Q'+quarter,label:String(quarter),dates});
  }
  const end=addDays(addMonths(quarterStart.slice(0,7),3)+'-01',-1);
  return {start:first+'-01',end:end>today?today:end,buckets};
}
