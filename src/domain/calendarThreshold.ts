import { HabitType } from './types';

export function isValidCalendarThreshold(type:HabitType,value:unknown):boolean{
  return value===undefined||value===null||(type!=='boolean'&&typeof value==='number'&&Number.isFinite(value)&&value>0&&(type!=='duration'||Number.isSafeInteger(value)));
}
export function assertCalendarThreshold(type:HabitType,value:unknown){
  if(!isValidCalendarThreshold(type,value))throw new Error('Invalid calendar threshold');
}
export function calendarFillOpacity(threshold:number|null|undefined,value:number):number{
  return threshold!=null&&value<threshold?.3:1;
}
