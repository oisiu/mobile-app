import { todayLocal } from '../domain/entries';
export function addDays(date:string,n:number){const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+n);return todayLocal(d)}
export function shortDay(date:string){return new Intl.DateTimeFormat(undefined,{weekday:'narrow'}).format(new Date(`${date}T12:00:00`))}
export function monthKey(date:string){return date.slice(0,7)}
export function addMonths(month:string,amount:number){const [year,value]=month.split('-').map(Number),date=new Date(year,value-1+amount,1,12);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
export function monthCalendarDays(month:string):(string|null)[]{const [year,value]=month.split('-').map(Number),first=new Date(year,value-1,1,12),leading=(first.getDay()+6)%7,count=new Date(year,value,0,12).getDate();const cells:(string|null)[]=Array(leading).fill(null);for(let day=1;day<=count;day++)cells.push(`${month}-${String(day).padStart(2,'0')}`);while(cells.length%7)cells.push(null);return cells}
