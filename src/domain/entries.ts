import { HabitType } from './types';
export function isLocalDate(value:string){ return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime()); }
export function todayLocal(now=new Date()){ const y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0'),d=String(now.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; }
export function validateEntry(type:HabitType,value:number,date:string,now=new Date()):string|null { if(!isLocalDate(date)) return 'Invalid date'; if(date>todayLocal(now)) return 'Future dates are not allowed'; if(!Number.isFinite(value)||value<0) return 'Value must be non-negative'; if(type==='boolean'&&value!==0&&value!==1) return 'Boolean must be 0 or 1'; if(type==='duration'&&!Number.isInteger(value)) return 'Duration must be whole seconds'; return null; }
export function sanitizeDecimalInput(value:string):string { const normalized=value.replace(',','.').replace(/[^0-9.]/g,''); const dot=normalized.indexOf('.'); return dot<0?normalized:`${normalized.slice(0,dot+1)}${normalized.slice(dot+1).replaceAll('.','')}`; }
export function isCompleteDecimalInput(value:string):boolean { return /^(?:\d+\.?\d*|\.\d+)$/.test(value); }
export type DurationUnit='minutes'|'hours';
export function durationInputToSeconds(value:number,unit:DurationUnit):number { return value*(unit==='hours'?3600:60); }
