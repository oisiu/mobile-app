import { todayLocal } from '../domain/entries';
export function addDays(date:string,n:number){const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+n);return todayLocal(d)}
export function shortDay(date:string){return new Intl.DateTimeFormat(undefined,{weekday:'narrow'}).format(new Date(`${date}T12:00:00`))}
export function monthKey(date:string){return date.slice(0,7)}
export function addMonths(month:string,amount:number){const [year,value]=month.split('-').map(Number),date=new Date(`${String(year).padStart(4,'0')}-01-01T12:00:00`);date.setMonth(value-1+amount);return todayLocal(date).slice(0,7)}
export function monthCalendarDays(month:string):(string|null)[]{const value=Number(month.slice(5,7)),first=new Date(`${month}-01T12:00:00`),leading=(first.getDay()+6)%7,last=new Date(first);last.setMonth(value);last.setDate(0);const count=last.getDate();const cells:(string|null)[]=Array(leading).fill(null);for(let day=1;day<=count;day++)cells.push(`${month}-${String(day).padStart(2,'0')}`);while(cells.length%7)cells.push(null);return cells}

export function monthYearHeading(date:string,locale?:string){
  const month=new Intl.DateTimeFormat(locale,{month:'long'}).format(new Date(`${date.slice(0,7)}-01T12:00:00`));
  return `${month.charAt(0).toLocaleUpperCase(locale)}${month.slice(1)} ${date.slice(0,4)}`;
}
