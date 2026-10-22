import { descendants } from './tree';
import { ExportData } from './types';

export function selectExportCategory(data:ExportData,rootId:string|string[]|null):ExportData {
  if(rootId===null)return data;
  const roots=(Array.isArray(rootId)?rootId:[rootId]).map(id=>{
    const root=data.habits.find(h=>h.id===id&&h.parentId===null&&!h.isGeneral);
    if(!root)throw new Error('Export category not found');
    return root;
  });
  if(!roots.length)throw new Error('Select an export category');
  const ids=new Set(roots.flatMap(root=>[root.id,...descendants(data.habits,root.id).map(h=>h.id)]));
  return {...data,habits:data.habits.filter(h=>ids.has(h.id)),entries:data.entries.filter(e=>ids.has(e.habitId))};
}

const csvField=(value:string|number,alwaysQuote=false)=>{
  const text=String(value);
  return alwaysQuote||/[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
};

export function exportEntriesCsv(data:ExportData):string {
  const byId=new Map(data.habits.map(habit=>[habit.id,habit]));
  const path=(id:string):string=>{
    const habit=byId.get(id);
    if(!habit)throw new Error('Export habit not found');
    return `${habit.parentId?path(habit.parentId)+' / ':''}${habit.name}`;
  };
  return ['entry_id,local_date,timezone,type,value,habit_path',...data.entries.map(entry=>{
    const habit=byId.get(entry.habitId);
    if(!habit)throw new Error('Export habit not found');
    return [entry.id,entry.localDate,entry.timezone,habit.type,entry.value].map(value=>csvField(value)).concat(csvField(path(habit.id),true)).join(',');
  })].join('\n');
}
