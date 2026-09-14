import { aggregate } from './aggregation';
import { Entry,Habit } from './types';
import { addMonths,monthCalendarDays } from '../utils/dates';

export function buildFrequency(habit:Habit,habits:Habit[],entries:Entry[],today:string,firstMonth=addMonths(today.slice(0,7),-12)){
  const months:{key:string;label:string}[]=[];
  for(let key=firstMonth;key<=today.slice(0,7);key=addMonths(key,1)){
    const abbreviation=new Intl.DateTimeFormat(undefined,{month:'short'}).format(new Date(`${key}-01T12:00:00`)).replace(/\./g,'').trim();
    months.push({key,label:abbreviation.charAt(0).toLocaleUpperCase()});
  }
  const recordedDates=new Set(entries.filter(entry=>entry.localDate<=today).map(entry=>entry.localDate));
  const active=new Set([...recordedDates].filter(date=>aggregate(habits,entries,habit.id,new Set([date]))>0));
  const rows=Array.from({length:7},()=>months.map(()=>({count:0,possible:0,intensity:0,size:4})));
  months.forEach((month,index)=>{
    for(const date of monthCalendarDays(month.key)){
      if(!date)continue;
      const weekday=(new Date(`${date}T12:00:00`).getDay()+6)%7,cell=rows[weekday][index];
      cell.possible++;
      if(active.has(date))cell.count++;
    }
  });
  for(const row of rows)for(const cell of row){cell.intensity=cell.count/cell.possible;cell.size=4+18*cell.intensity}
  return {months,rows};
}
