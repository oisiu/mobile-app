import { Entry,Habit } from './types';

// Numeric record presence counts as activity, including explicitly saved zero.
// Keep identifiers and hierarchy so every chart shares its normal branch rules.
export function booleanAnalysis(habits:Habit[],entries:Entry[]){
  const numericIds=new Set(habits.filter(habit=>habit.type!=='boolean').map(habit=>habit.id));
  return {
    habits:habits.map(habit=>habit.type==='boolean'?habit:{...habit,type:'boolean' as const}),
    entries:entries.map(entry=>numericIds.has(entry.habitId)?{...entry,value:1}:entry),
  };
}
