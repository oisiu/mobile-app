import { BranchEdit,planBranchEdit } from '@/domain/branchDay';
import { SQLiteDatabase } from 'expo-sqlite';
import { CreateHabitInput, Entry, EntryInput, ExportData, Habit } from '@/domain/types';
import { assertMergeSafe, validateImport } from '@/domain/import'; import { descendants, validateMove } from '@/domain/tree'; import { validateEntry } from '@/domain/entries'; import { makeId } from '@/utils/id';

const toHabit=(r:any):Habit=>({id:r.id,parentId:r.parent_id,name:r.name,emoji:r.emoji,type:r.type,sortOrder:r.sort_order,isGeneral:!!r.is_general,archivedAt:r.archived_at,createdAt:r.created_at,updatedAt:r.updated_at});
const toEntry=(r:any):Entry=>({id:r.id,habitId:r.habit_id,value:r.value,occurredAt:r.occurred_at,localDate:r.local_date,timezone:r.timezone,createdAt:r.created_at,updatedAt:r.updated_at});
export interface TreeDraftCreate { key:string; parentKey:string; name:string; emoji:string }
export interface TreeDraftUpdate { id:string; name:string; emoji:string }
export class HabitRepository {
  constructor(private db:SQLiteDatabase){}
  async habits(){ return (await this.db.getAllAsync<any>('SELECT * FROM habits ORDER BY parent_id,sort_order')).map(toHabit); }
  async entries(from?:string,to?:string){ const rows=from&&to?await this.db.getAllAsync<any>('SELECT * FROM entries WHERE local_date BETWEEN ? AND ?',[from,to]):await this.db.getAllAsync<any>('SELECT * FROM entries'); return rows.map(toEntry); }
  private async normalize(parentId:string|null){ const rows=await this.db.getAllAsync<{id:string}>('SELECT id FROM habits WHERE parent_id IS ? AND is_general=0 ORDER BY sort_order,id',[parentId]); for(let i=0;i<rows.length;i++) await this.db.runAsync('UPDATE habits SET sort_order=? WHERE id=?',[i,rows[i].id]); }
  async create(input:CreateHabitInput){ const all=await this.habits(); if(input.parentId){ const p=all.find(h=>h.id===input.parentId); if(!p) throw new Error('Parent not found'); if(p.type!==input.type) throw new Error('A branch must use one type'); }
    const now=new Date().toISOString(),id=makeId(); await this.db.withTransactionAsync(async()=>{ if(input.parentId){ const real=all.filter(h=>h.parentId===input.parentId&&!h.isGeneral); if(!real.length){ const existing=all.filter(h=>h.parentId===input.parentId&&h.isGeneral)[0]; let general=existing?.id; if(!general){ general=makeId(); await this.db.runAsync('INSERT INTO habits VALUES(?,?,?,?,?,?,?,?,?,?)',[general,input.parentId,'General','•',input.type,-1,1,null,now,now]); await this.db.runAsync('UPDATE entries SET habit_id=? WHERE habit_id=?',[general,input.parentId]); } } }
      const count=await this.db.getFirstAsync<{n:number}>('SELECT COUNT(*) n FROM habits WHERE parent_id IS ? AND is_general=0',[input.parentId]); await this.db.runAsync('INSERT INTO habits VALUES(?,?,?,?,?,?,?,?,?,?)',[id,input.parentId,input.name.trim(),input.emoji,input.type,count?.n??0,0,null,now,now]); }); return id; }
  async update(id:string,patch:Partial<Pick<Habit,'name'|'emoji'>>){ const now=new Date().toISOString(); if(patch.name!==undefined&&!patch.name.trim()) throw new Error('Name is required'); await this.db.runAsync('UPDATE habits SET name=COALESCE(?,name),emoji=COALESCE(?,emoji),updated_at=? WHERE id=?',[patch.name?.trim()??null,patch.emoji??null,now,id]); }
  async editTree(rootId:string,updates:TreeDraftUpdate[],creates:TreeDraftCreate[],deletes:string[]){
    const all=await this.habits(),root=all.find(h=>h.id===rootId&&!h.parentId&&!h.isGeneral);
    if(!root)throw new Error('Top-level habit not found');
    if(updates.some(item=>!item.name.trim())||creates.some(item=>!item.name.trim()))throw new Error('Name is required');
    const allowed=new Set([rootId,...descendants(all,rootId).filter(h=>!h.isGeneral).map(h=>h.id)]),deletedTree=new Set(deletes.flatMap(id=>[id,...descendants(all,id).map(h=>h.id)]));
    if(deletes.some(id=>id===rootId||!allowed.has(id)))throw new Error('Invalid subtree deletion');
    if(updates.some(item=>!allowed.has(item.id)))throw new Error('Invalid habit update');
    const draftKeys=new Set<string>();
    for(const item of creates){if(draftKeys.has(item.key)||(!allowed.has(item.parentKey)&&!draftKeys.has(item.parentKey))||deletedTree.has(item.parentKey))throw new Error('Invalid draft hierarchy');draftKeys.add(item.key)}
    const now=new Date().toISOString();
    await this.db.withTransactionAsync(async()=>{
      for(const item of updates)if(!deletedTree.has(item.id))await this.db.runAsync('UPDATE habits SET name=?,emoji=?,updated_at=? WHERE id=?',[item.name.trim(),item.emoji,now,item.id]);
      const deleteRoots=deletes.filter(id=>!deletes.some(other=>other!==id&&descendants(all,other).some(item=>item.id===id))),affected=new Set<string>();
      for(const id of deleteRoots){const item=all.find(h=>h.id===id);if(item?.parentId)affected.add(item.parentId);await this.db.runAsync('DELETE FROM habits WHERE id=?',[id])}
      for(const parentId of affected){
        const parent=await this.db.getFirstAsync<{id:string}>('SELECT id FROM habits WHERE id=?',[parentId]);if(!parent)continue;
        await this.normalize(parentId);
        const real=await this.db.getFirstAsync<{n:number}>('SELECT COUNT(*) n FROM habits WHERE parent_id=? AND is_general=0',[parentId]);
        if(!real?.n){const general=await this.db.getFirstAsync<{id:string}>('SELECT id FROM habits WHERE parent_id=? AND is_general=1',[parentId]);if(general){await this.db.runAsync('UPDATE entries SET habit_id=? WHERE habit_id=?',[parentId,general.id]);await this.db.runAsync('DELETE FROM habits WHERE id=?',[general.id])}}
      }
      const ids=new Map<string,string>();
      for(const item of creates){
        const parentId=ids.get(item.parentKey)??item.parentKey,parent=await this.db.getFirstAsync<{id:string;type:Habit['type'];archived_at:string|null}>('SELECT id,type,archived_at FROM habits WHERE id=?',[parentId]);
        if(!parent||parent.archived_at)throw new Error('Parent not found');
        if(parent.type!==root.type)throw new Error('A branch must use one type');
        const real=await this.db.getFirstAsync<{n:number}>('SELECT COUNT(*) n FROM habits WHERE parent_id=? AND is_general=0',[parentId]);
        if(!real?.n){let general=(await this.db.getFirstAsync<{id:string}>('SELECT id FROM habits WHERE parent_id=? AND is_general=1',[parentId]))?.id;if(!general){general=makeId();await this.db.runAsync('INSERT INTO habits VALUES(?,?,?,?,?,?,?,?,?,?)',[general,parentId,'General','•',root.type,-1,1,null,now,now]);await this.db.runAsync('UPDATE entries SET habit_id=? WHERE habit_id=?',[general,parentId])}}
        const id=makeId();ids.set(item.key,id);await this.db.runAsync('INSERT INTO habits VALUES(?,?,?,?,?,?,?,?,?,?)',[id,parentId,item.name.trim(),item.emoji,root.type,real?.n??0,0,null,now,now]);
      }
    });
  }
  async saveEntry(input:EntryInput){ const all=await this.habits(); const h=all.find(x=>x.id===input.habitId); if(!h) throw new Error('Habit not found'); if(h.archivedAt) throw new Error('Archived habits cannot receive entries'); const error=validateEntry(h.type,input.value,input.localDate); if(error) throw new Error(error); let target=h; const children=all.filter(x=>x.parentId===h.id); if(children.length){ target=children.find(x=>x.isGeneral)!; if(!target) throw new Error('General child missing'); }
    const now=new Date().toISOString(),occurred=input.occurredAt??now,tz=input.timezone??Intl.DateTimeFormat().resolvedOptions().timeZone??'local'; await this.db.runAsync(`INSERT INTO entries(id,habit_id,value,occurred_at,local_date,timezone,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(habit_id,local_date) DO UPDATE SET value=excluded.value,occurred_at=excluded.occurred_at,timezone=excluded.timezone,updated_at=excluded.updated_at`,[makeId(),target.id,input.value,occurred,input.localDate,tz,now,now]); }
  async editBranchDay(habitId:string,date:string,expected:Entry[],edits:BranchEdit[],destination:string){
    await this.db.withTransactionAsync(async()=>{
      const habits=await this.habits(),root=habits.find(h=>h.id===habitId);
      if(!root)throw new Error('BRANCH_DAY_CHANGED');
      const entries=await this.entries(),changes=planBranchEdit(habits,entries,root,date,expected,edits,destination),now=new Date().toISOString();
      for(const {entry,value} of changes){
        if(value===null)await this.db.runAsync('DELETE FROM entries WHERE id=? AND local_date=?',[entry.id,date]);
        else if(value!==entry.value||destination!==date)await this.db.runAsync('UPDATE entries SET value=?,local_date=?,updated_at=? WHERE id=?',[value,destination,now,entry.id]);
      }
    });
  }
  async clearEntry(habitId:string,date:string){ const all=await this.habits(); const target=all.find(h=>h.parentId===habitId&&h.isGeneral)?.id??habitId; await this.db.runAsync('DELETE FROM entries WHERE habit_id=? AND local_date=?',[target,date]); }
  async move(id:string,parentId:string|null,index:number){ const all=await this.habits(),err=validateMove(all,id,parentId); if(err) throw new Error(err); const item=all.find(h=>h.id===id)!; await this.db.withTransactionAsync(async()=>{ const destination=all.filter(h=>h.parentId===parentId&&!h.isGeneral&&h.id!==id).sort((a,b)=>a.sortOrder-b.sortOrder); destination.splice(Math.max(0,Math.min(index,destination.length)),0,item); await this.db.runAsync('UPDATE habits SET parent_id=? WHERE id=?',[parentId,id]); await this.normalize(item.parentId); for(let i=0;i<destination.length;i++) await this.db.runAsync('UPDATE habits SET sort_order=? WHERE id=?',[i,destination[i].id]); }); }
  async archive(id:string,archived:boolean){ const all=await this.habits(),ids=[id,...descendants(all,id).map(h=>h.id)],time=archived?new Date().toISOString():null; await this.db.withTransactionAsync(async()=>{ for(const x of ids) await this.db.runAsync('UPDATE habits SET archived_at=? WHERE id=?',[time,x]); }); }
  async remove(id:string){ const all=await this.habits(),item=all.find(h=>h.id===id); if(!item)return; await this.db.withTransactionAsync(async()=>{ await this.db.runAsync('DELETE FROM habits WHERE id=?',[id]); await this.normalize(item.parentId); if(item.parentId){ const real=await this.db.getFirstAsync<{n:number}>('SELECT COUNT(*) n FROM habits WHERE parent_id=? AND is_general=0',[item.parentId]); if(!real?.n){ const general=await this.db.getFirstAsync<{id:string}>('SELECT id FROM habits WHERE parent_id=? AND is_general=1',[item.parentId]); if(general){ await this.db.runAsync('UPDATE entries SET habit_id=? WHERE habit_id=?',[item.parentId,general.id]); await this.db.runAsync('DELETE FROM habits WHERE id=?',[general.id]); } } } }); }
  async deletionImpact(id:string){ const all=await this.habits(),ids=[id,...descendants(all,id).map(h=>h.id)]; const placeholders=ids.map(()=>'?').join(','); const row=await this.db.getFirstAsync<{n:number}>(`SELECT COUNT(*) n FROM entries WHERE habit_id IN (${placeholders})`,ids); return {habits:ids.length,entries:row?.n??0}; }
  async export():Promise<ExportData>{ return {version:1,exportedAt:new Date().toISOString(),habits:await this.habits(),entries:await this.entries()}; }
  async import(raw:unknown){ const incoming=validateImport(raw),existing=await this.export(); assertMergeSafe(existing,incoming); const hids=new Set(existing.habits.map(h=>h.id)),eids=new Set(existing.entries.map(e=>e.id)); await this.db.withTransactionAsync(async()=>{ for(const h of incoming.habits) if(!hids.has(h.id)) await this.db.runAsync('INSERT INTO habits VALUES(?,?,?,?,?,?,?,?,?,?)',[h.id,h.parentId,h.name,h.emoji,h.type,h.sortOrder,h.isGeneral?1:0,h.archivedAt,h.createdAt,h.updatedAt]); for(const e of incoming.entries) if(!eids.has(e.id)) await this.db.runAsync('INSERT INTO entries VALUES(?,?,?,?,?,?,?,?)',[e.id,e.habitId,e.value,e.occurredAt,e.localDate,e.timezone,e.createdAt,e.updatedAt]); }); }
}
