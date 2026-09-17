import { addDays,addMonths } from '@/utils/dates';

export function buildCalendarTimeline(firstMonth:string,today:string){
  const monthStart=`${firstMonth}-01`,start=addDays(monthStart,-((new Date(`${monthStart}T12:00:00`).getDay()+6)%7));
  const monthEnd=addDays(`${addMonths(today.slice(0,7),1)}-01`,-1);
  const weekday=(new Date(`${monthEnd}T12:00:00`).getDay()+6)%7,end=addDays(monthEnd,6-weekday);
  const dates:string[]=[];
  for(let date=start;date<=end;date=addDays(date,1))dates.push(date);
  const weeks=Array.from({length:dates.length/7},(_,week)=>dates.slice(week*7,week*7+7));
  return {start,monthEnd,dates,weeks};
}

export function initialCalendarWeek(dates:string[],date:string){
  return Math.max(0,Math.floor(dates.indexOf(date)/7)-3);
}
