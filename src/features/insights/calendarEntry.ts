import { DurationUnit,durationInputToSeconds,isCompleteDecimalInput } from '../../domain/entries';
import { Entry,Habit } from '../../domain/types';

export type CalendarDraft={date:string;value:string;unit:DurationUnit};

export function calendarEntry(habit:Habit,habits:Habit[],entries:Entry[],date:string){
  const target=habits.find(item=>item.parentId===habit.id&&item.isGeneral)?.id??habit.id;
  return entries.find(entry=>entry.habitId===target&&entry.localDate===date);
}

export function toggledCalendarValue(habit:Habit,habits:Habit[],entries:Entry[],date:string):number|null{
  return calendarEntry(habit,habits,entries,date)?.value?null:1;
}

export function calendarDraft(habit:Habit,date:string,value:number|null):CalendarDraft{
  const unit:DurationUnit=habit.type==='duration'&&value!==null&&value>=3600&&value%3600===0?'hours':'minutes';
  return {date,unit,value:value===null?'':String(habit.type==='duration'?value/(unit==='hours'?3600:60):value)};
}

export function changeCalendarUnit(draft:CalendarDraft,unit:DurationUnit):CalendarDraft{
  if(draft.unit===unit)return draft;
  const value=isCompleteDecimalInput(draft.value)?String(Number(draft.value)*(unit==='hours'?1/60:60)):draft.value;
  return {...draft,unit,value};
}

export function calendarInputValue(habit:Habit,draft:CalendarDraft):number|null{
  if(!isCompleteDecimalInput(draft.value))return null;
  const input=Number(draft.value),value=habit.type==='duration'?durationInputToSeconds(input,draft.unit):input;
  if(!Number.isFinite(value)||value<0)return null;
  if(habit.type!=='duration')return value;
  // Unit conversion can introduce floating-point noise around whole seconds.
  const seconds=Math.round(value);
  return Math.abs(value-seconds)<1e-7?seconds:null;
}
