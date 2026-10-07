import { isHabitColor } from './habitAppearance';
import { ExportData, Habit, Entry } from './types';
import { assertHomogeneousAcyclic } from './tree'; import { isLocalDate, validateEntry } from './entries';
export const MAX_IMPORT_FILE_BYTES=5*1024*1024;
export function assertImportFileSize(size:number|undefined):void { if(size!==undefined&&(!Number.isFinite(size)||size<0||size>MAX_IMPORT_FILE_BYTES)) throw new Error('Import file is too large'); }
export function validateImport(raw:unknown):ExportData {
  if(!raw||typeof raw!=='object') throw new Error('Import must be an object'); const d=raw as Partial<ExportData>;
  if(d.version!==1||!Array.isArray(d.habits)||!Array.isArray(d.entries)) throw new Error('Unsupported or malformed export');
  const habits=d.habits as Habit[],entries=d.entries as Entry[]; const ids=new Set<string>();
  for(const h of habits){ if(!h.id||!h.name||typeof h.emoji!=='string'||(h.color!==undefined&&h.color!==null&&!isHabitColor(h.color))||!['boolean','number','duration'].includes(h.type)||!Number.isInteger(h.sortOrder)||(h.isHidden!==undefined&&(typeof h.isHidden!=='boolean'||(h.isHidden&&(h.parentId!==null||h.isGeneral))))||(h.hideFromOverview!==undefined&&(typeof h.hideFromOverview!=='boolean'||(h.hideFromOverview&&(h.parentId!==null||h.isGeneral))))) throw new Error('Invalid habit'); if(ids.has(h.id)) throw new Error('Duplicate habit ID'); ids.add(h.id); }
  assertHomogeneousAcyclic(habits);
  const order=new Set<string>(); for(const h of habits.filter(x=>!x.isGeneral)){ const k=`${h.parentId}:${h.sortOrder}`; if(h.sortOrder<0||order.has(k)) throw new Error('Invalid sibling ordering'); order.add(k); }
  const children=new Map<string,Habit[]>();
  for(const habit of habits)if(habit.parentId){const siblings=children.get(habit.parentId)??[];siblings.push(habit);children.set(habit.parentId,siblings)}
  for(const habit of habits){
    const kids=children.get(habit.id)??[];
    if(habit.isGeneral&&(!habit.parentId||habit.sortOrder!==-1||kids.length))throw new Error('Invalid General child');
    if(kids.length&&(habit.isGeneral||kids.filter(child=>child.isGeneral).length!==1||!kids.some(child=>!child.isGeneral)))throw new Error('Invalid General child');
  }
  const habitById=new Map(habits.map(h=>[h.id,h])),entryIds=new Set<string>(),days=new Set<string>(); for(const e of entries){ const h=habitById.get(e.habitId); if(!e.id||!h||children.has(e.habitId)||entryIds.has(e.id)||!isLocalDate(e.localDate)||validateEntry(h.type,e.value,e.localDate)) throw new Error('Invalid entry'); const k=`${e.habitId}:${e.localDate}`; if(days.has(k)) throw new Error('Duplicate daily entry'); entryIds.add(e.id); days.add(k); }
  return d as ExportData;
}
const habitPayload=(h:Habit)=>JSON.stringify([h.id,h.parentId,h.name,h.emoji,h.color??null,h.hideFromOverview??false,h.isHidden??false,h.type,h.isGeneral,h.archivedAt,h.createdAt,h.updatedAt]);
const entryPayload=(e:Entry)=>JSON.stringify([e.id,e.habitId,e.value,e.occurredAt,e.localDate,e.timezone,e.createdAt,e.updatedAt]);
export function assertMergeSafe(existing:ExportData,incoming:ExportData){
  const hs=new Map(existing.habits.map(h=>[h.id,habitPayload(h)]));
  for(const h of incoming.habits)if(hs.has(h.id)&&hs.get(h.id)!==habitPayload(h))throw new Error(`Habit conflict: ${h.id}`);
  const es=new Map(existing.entries.map(e=>[e.id,entryPayload(e)])),day=new Set(existing.entries.map(e=>`${e.habitId}:${e.localDate}`));
  for(const e of incoming.entries){
    if(es.has(e.id)&&es.get(e.id)!==entryPayload(e))throw new Error(`Entry conflict: ${e.id}`);
    if(!es.has(e.id)&&day.has(`${e.habitId}:${e.localDate}`))throw new Error(`Daily entry conflict: ${e.localDate}`);
  }
}

// Existing siblings retain their order; new siblings append in incoming order.
export function planImport(existing:ExportData,incoming:ExportData):ExportData {
  assertMergeSafe(existing,incoming);
  const ids=new Set(existing.habits.map(h=>h.id)),entryIds=new Set(existing.entries.map(e=>e.id));
  const habits=existing.habits.map(h=>({...h})),nextOrder=new Map<string|null,number>();
  for(const h of habits)if(!h.isGeneral)nextOrder.set(h.parentId,Math.max(nextOrder.get(h.parentId)??0,h.sortOrder+1));
  for(const h of incoming.habits.filter(h=>!ids.has(h.id)).sort((a,b)=>a.sortOrder-b.sortOrder)){
    const sortOrder=h.isGeneral?-1:(nextOrder.get(h.parentId)??0);
    habits.push({...h,sortOrder});if(!h.isGeneral)nextOrder.set(h.parentId,sortOrder+1);
  }
  const generalByParent=new Map(habits.filter(h=>h.isGeneral).map(h=>[h.parentId,h.id]));
  const entries=[...existing.entries.map(e=>({...e,habitId:generalByParent.get(e.habitId)??e.habitId})),...incoming.entries.filter(e=>!entryIds.has(e.id))];
  return validateImport({...existing,habits,entries});
}
