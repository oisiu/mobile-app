import { Entry,Habit } from './types';
import { descendants } from './tree';
import { todayLocal,validateEntry } from './entries';

export type BranchEdit={id:string;value:number|null};
export function branchRecords(habits:Habit[],entries:Entry[],root:Habit,date:string){
  const branch=[root,...descendants(habits,root.id)],parents=new Set(habits.map(h=>h.parentId));
  return branch.filter(h=>!parents.has(h.id)).flatMap(habit=>{
    const entry=entries.find(e=>e.habitId===habit.id&&e.localDate===date);
    if(!entry)return [];
    const path:Habit[]=[habit];let current=habit;
    while(current.id!==root.id&&current.parentId){const parent=habits.find(h=>h.id===current.parentId);if(!parent)break;path.unshift(parent);current=parent}
    return [{entry,habit,path,direct:habit.id===root.id||(habit.isGeneral&&habit.parentId===root.id)}];
  });
}
export function validBranchDate(date:string,today=todayLocal()){
  const parsed=new Date(`${date}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(date)&&date<=today&&Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date;
}
export function planBranchEdit(habits:Habit[],entries:Entry[],root:Habit,date:string,expected:Entry[],edits:BranchEdit[],destination:string){
  if(!validBranchDate(date)||!validBranchDate(destination))throw new Error('BRANCH_DATE');
  const actual=branchRecords(habits,entries,root,date).map(r=>r.entry);
  if(actual.length!==expected.length||actual.some(e=>!expected.some(x=>x.id===e.id&&x.habitId===e.habitId&&x.localDate===e.localDate&&x.value===e.value&&x.updatedAt===e.updatedAt)))throw new Error('BRANCH_DAY_CHANGED');
  if(edits.length!==actual.length||new Set(edits.map(e=>e.id)).size!==actual.length||edits.some(e=>!actual.some(x=>x.id===e.id)))throw new Error('BRANCH_DAY_CHANGED');
  const changes=actual.map(entry=>({entry,value:edits.find(e=>e.id===entry.id)!.value}));
  if(changes.some(({value})=>value!==null&&validateEntry(root.type,value,destination)))throw new Error('BRANCH_VALUE');
  const conflicts=destination===date?[]:changes.filter(({entry,value})=>value!==null&&entries.some(e=>e.habitId===entry.habitId&&e.localDate===destination));
  if(conflicts.length)throw new Error('BRANCH_CONFLICT');
  return changes;
}
