import { descendants } from './tree';
import { ExportData } from './types';

export function selectExportCategory(data:ExportData,rootId:string|null):ExportData {
  if(rootId===null)return data;
  const root=data.habits.find(h=>h.id===rootId&&h.parentId===null&&!h.isGeneral);
  if(!root)throw new Error('Export category not found');
  const ids=new Set([root.id,...descendants(data.habits,root.id).map(h=>h.id)]);
  return {...data,habits:data.habits.filter(h=>ids.has(h.id)),entries:data.entries.filter(e=>ids.has(e.habitId))};
}
