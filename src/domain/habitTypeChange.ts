import { Entry,Habit,HabitType } from './types';
import { descendants } from './tree';

export interface HabitTypeChange {
  from:HabitType;
  to:HabitType;
  trueValue?:number;
  unitDurationSeconds?:number;
  expectedHabitIds:string[];
  expectedEntries:Entry[];
}

export function typeChangeTargets(from:HabitType):HabitType[]{return [from,...(['boolean','number','duration'] as const).filter(type=>type!==from)]}

export function validHistoryValue(type:HabitType,value:unknown,allowZero=false):value is number {
  return type!=='boolean'&&typeof value==='number'&&Number.isFinite(value)&&(allowZero?value>=0:value>0)&&(type!=='duration'||Number.isSafeInteger(value));
}

export function planHabitTypeChange(habits:Habit[],entries:Entry[],rootId:string,change:HabitTypeChange){
  const root=habits.find(h=>h.id===rootId);
  if(!root||root.parentId!==null||root.isGeneral||root.type!==change.from||change.from===change.to||!typeChangeTargets(change.from).includes(change.to))throw new Error('TYPE_CHANGE_INVALID');
  const numericConversion=change.from!=='boolean'&&change.to!=='boolean';
  const branch=[root,...descendants(habits,rootId)],ids=new Set(branch.map(h=>h.id));
  const expectedIds=new Set(change.expectedHabitIds);
  if(expectedIds.size!==change.expectedHabitIds.length||ids.size!==expectedIds.size||branch.some(h=>!expectedIds.has(h.id)||h.type!==change.from))throw new Error('TYPE_CHANGE_STALE');
  const records=entries.filter(e=>ids.has(e.habitId)),expected=new Map(change.expectedEntries.map(e=>[e.id,e]));
  const fields:(keyof Entry)[]=['id','habitId','value','localDate','occurredAt','timezone','createdAt','updatedAt'];
  if(expected.size!==change.expectedEntries.length||records.length!==expected.size||records.some(e=>!expected.has(e.id)||fields.some(field=>e[field]!==expected.get(e.id)![field])))throw new Error('TYPE_CHANGE_STALE');
  if(records.length&&change.from==='boolean'&&!validHistoryValue(change.to,change.trueValue,true))throw new Error('TYPE_CHANGE_VALUE_INVALID');
  if(records.length&&numericConversion&&!validHistoryValue('duration',change.unitDurationSeconds))throw new Error('TYPE_CHANGE_VALUE_INVALID');
  const converted=records.map(entry=>{
    if(!Number.isFinite(entry.value)||entry.value<0||(change.from==='boolean'&&entry.value!==0&&entry.value!==1)||(change.from==='duration'&&!Number.isSafeInteger(entry.value)))throw new Error('TYPE_CHANGE_INVALID');
    const value=change.to==='boolean'?1:change.from==='boolean'?(entry.value===1?change.trueValue!:0):change.to==='duration'?Math.round(entry.value*change.unitDurationSeconds!):entry.value/change.unitDurationSeconds!;
    if(!Number.isFinite(value)||(change.to==='duration'&&!Number.isSafeInteger(value)))throw new Error('TYPE_CHANGE_VALUE_INVALID');
    return {entry,value};
  });
  return {habitIds:[...ids],entries:converted};
}
