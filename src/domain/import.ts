import { ExportData, Habit, Entry } from './types';
import { assertHomogeneousAcyclic } from './tree'; import { isLocalDate, validateEntry } from './entries';
export const MAX_IMPORT_FILE_BYTES=5*1024*1024;
export function assertImportFileSize(size:number|undefined):void { if(size!==undefined&&(!Number.isFinite(size)||size<0||size>MAX_IMPORT_FILE_BYTES)) throw new Error('Import file is too large'); }
export function validateImport(raw:unknown):ExportData {
  if(!raw||typeof raw!=='object') throw new Error('Import must be an object'); const d=raw as Partial<ExportData>;
  if(d.version!==1||!Array.isArray(d.habits)||!Array.isArray(d.entries)) throw new Error('Unsupported or malformed export');
  const habits=d.habits as Habit[],entries=d.entries as Entry[]; const ids=new Set<string>();
  for(const h of habits){ if(!h.id||!h.name||!['boolean','number','duration'].includes(h.type)||!Number.isInteger(h.sortOrder)) throw new Error('Invalid habit'); if(ids.has(h.id)) throw new Error('Duplicate habit ID'); ids.add(h.id); }
  assertHomogeneousAcyclic(habits);
  const order=new Set<string>(); for(const h of habits.filter(x=>!x.isGeneral)){ const k=`${h.parentId}:${h.sortOrder}`; if(h.sortOrder<0||order.has(k)) throw new Error('Invalid sibling ordering'); order.add(k); }
  const entryIds=new Set<string>(),days=new Set<string>(); for(const e of entries){ const h=habits.find(x=>x.id===e.habitId); if(!e.id||!h||entryIds.has(e.id)||!isLocalDate(e.localDate)||validateEntry(h.type,e.value,e.localDate)) throw new Error('Invalid entry'); const k=`${e.habitId}:${e.localDate}`; if(days.has(k)) throw new Error('Duplicate daily entry'); entryIds.add(e.id); days.add(k); }
  return d as ExportData;
}
export function assertMergeSafe(existing:ExportData,incoming:ExportData){ const hs=new Map(existing.habits.map(h=>[h.id,JSON.stringify(h)])); for(const h of incoming.habits) if(hs.has(h.id)&&hs.get(h.id)!==JSON.stringify(h)) throw new Error(`Habit conflict: ${h.id}`); const es=new Map(existing.entries.map(e=>[e.id,JSON.stringify(e)])); const day=new Set(existing.entries.map(e=>`${e.habitId}:${e.localDate}`)); for(const e of incoming.entries){ if(es.has(e.id)&&es.get(e.id)!==JSON.stringify(e)) throw new Error(`Entry conflict: ${e.id}`); if(!es.has(e.id)&&day.has(`${e.habitId}:${e.localDate}`)) throw new Error(`Daily entry conflict: ${e.localDate}`); } }
