import { assertHabitName } from '@/domain/habitName';
import { HabitTypeChange,planHabitTypeChange } from '@/domain/habitTypeChange';
import { TreeAttachment,validateAttachments } from '@/domain/treeAttachments';
import { assertCalendarThreshold } from '@/domain/calendarThreshold';
import { assertHabitAppearance } from '@/domain/habitAppearance';
import { BranchEdit,planBranchEdit } from '@/domain/branchDay';
import { SQLiteDatabase } from 'expo-sqlite';
import { CreateHabitInput, Entry, EntryInput, ExportData, Habit } from '@/domain/types';
import { planImport, validateImport } from '@/domain/import'; import { descendants, validateMove } from '@/domain/tree'; import { validateEntry } from '@/domain/entries'; import { makeId } from '@/utils/id';

const toHabit=(r:any):Habit=>({id:r.id,parentId:r.parent_id,name:r.name,emoji:r.emoji,...(r.color?{color:r.color}:{}),...(r.hide_from_overview?{hideFromOverview:true}:{}),...(r.is_hidden?{isHidden:true}:{}),...(r.calendar_threshold!=null?{calendarThreshold:r.calendar_threshold}:{}),type:r.type,sortOrder:r.sort_order,isGeneral:!!r.is_general,archivedAt:r.archived_at,createdAt:r.created_at,updatedAt:r.updated_at});
const toEntry=(r:any):Entry=>({id:r.id,habitId:r.habit_id,value:r.value,occurredAt:r.occurred_at,localDate:r.local_date,timezone:r.timezone,createdAt:r.created_at,updatedAt:r.updated_at});
export interface TreeDraftCreate { key:string; parentKey:string; name:string; emoji:string; color?:Habit['color']; calendarThreshold?:number|null; index?:number }
export interface TreeDraftUpdate { id:string; name:string; emoji:string; color?:Habit['color']; hideFromOverview?:boolean; isHidden?:boolean; calendarThreshold?:number|null }
export class HabitRepository {
  constructor(private db:SQLiteDatabase){}
  async deleteAllData(){await this.db.withTransactionAsync(async()=>{await this.db.runAsync('DELETE FROM entries');await this.db.runAsync('DELETE FROM habits')})}
  async habits(){ return (await this.db.getAllAsync<any>('SELECT * FROM habits ORDER BY parent_id,sort_order')).map(toHabit); }
  async entries(from?:string,to?:string){ const rows=from&&to?await this.db.getAllAsync<any>('SELECT * FROM entries WHERE local_date BETWEEN ? AND ?',[from,to]):await this.db.getAllAsync<any>('SELECT * FROM entries'); return rows.map(toEntry); }
  private async normalize(parentId:string|null){ const rows=await this.db.getAllAsync<{id:string}>('SELECT id FROM habits WHERE parent_id IS ? AND is_general=0 ORDER BY sort_order,id',[parentId]); for(let i=0;i<rows.length;i++) await this.db.runAsync('UPDATE habits SET sort_order=? WHERE id=?',[i,rows[i].id]); }
  async create(input:CreateHabitInput){ assertHabitName(input.name);assertCalendarThreshold(input.type,input.calendarThreshold); assertHabitAppearance(input.emoji,input.color); if(input.hideFromOverview!==undefined&&(typeof input.hideFromOverview!=='boolean'||(input.hideFromOverview&&input.parentId!==null)))throw new Error('Only top-level habits can be hidden from overview'); if(input.isHidden!==undefined&&(typeof input.isHidden!=='boolean'||(input.isHidden&&input.parentId!==null)))throw new Error('Only top-level habits can be hidden'); const all=await this.habits(); if(input.parentId){ const p=all.find(h=>h.id===input.parentId); if(!p) throw new Error('Parent not found'); if(p.type!==input.type) throw new Error('A branch must use one type'); }
    const now=new Date().toISOString(),id=makeId(); await this.db.withTransactionAsync(async()=>{ if(input.parentId){ const real=all.filter(h=>h.parentId===input.parentId&&!h.isGeneral); if(!real.length){ const existing=all.filter(h=>h.parentId===input.parentId&&h.isGeneral)[0]; let general=existing?.id; if(!general){ general=makeId(); await this.db.runAsync('INSERT INTO habits(id,parent_id,name,emoji,type,sort_order,is_general,archived_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[general,input.parentId,'General','•',input.type,-1,1,null,now,now]); await this.db.runAsync('UPDATE entries SET habit_id=? WHERE habit_id=?',[general,input.parentId]); } } }
      const count=await this.db.getFirstAsync<{n:number}>('SELECT COUNT(*) n FROM habits WHERE parent_id IS ? AND is_general=0',[input.parentId]); await this.db.runAsync('INSERT INTO habits(id,parent_id,name,emoji,type,sort_order,is_general,archived_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[id,input.parentId,input.name.trim(),input.emoji,input.type,count?.n??0,0,null,now,now]); if(input.calendarThreshold!=null)await this.db.runAsync('UPDATE habits SET calendar_threshold=? WHERE id=?',[input.calendarThreshold,id]);if(input.color)await this.db.runAsync('UPDATE habits SET color=? WHERE id=?',[input.color,id]);if(input.hideFromOverview)await this.db.runAsync('UPDATE habits SET hide_from_overview=1 WHERE id=?',[id]);if(input.isHidden)await this.db.runAsync('UPDATE habits SET is_hidden=1 WHERE id=?',[id]); }); return id; }
  async update(id:string,patch:Partial<Pick<Habit,'name'|'emoji'|'color'|'calendarThreshold'>>){ const previous=(await this.habits()).find(h=>h.id===id);assertHabitAppearance(patch.emoji===undefined||patch.emoji===previous?.emoji?'':patch.emoji,patch.color);assertCalendarThreshold(previous?.type??'boolean',patch.calendarThreshold);const now=new Date().toISOString(); if(patch.name!==undefined)assertHabitName(patch.name,previous?.name); await this.db.runAsync('UPDATE habits SET name=COALESCE(?,name),emoji=COALESCE(?,emoji),color=CASE WHEN ? THEN ? ELSE color END,calendar_threshold=CASE WHEN ? THEN ? ELSE calendar_threshold END,updated_at=? WHERE id=?',[patch.name?.trim()??null,patch.emoji??null,Number(patch.color!==undefined),patch.color??null,Number(patch.calendarThreshold!==undefined),patch.calendarThreshold??null,now,id]); }
  async createTree(input:CreateHabitInput,updates:TreeDraftUpdate[],creates:TreeDraftCreate[],moves:TreeAttachment[],rootKey='__new_root__'){
    const id=makeId(),resolve=(key:string)=>key===rootKey?id:key;
    await this.writeTree(id,updates,creates.map(item=>({...item,parentKey:resolve(item.parentKey)})),[],moves.map(item=>({...item,parentKey:resolve(item.parentKey)})),input);
    return id;
  }
  async editTree(rootId:string,updates:TreeDraftUpdate[],creates:TreeDraftCreate[],deletes:string[],moves:TreeAttachment[]=[],typeChange?:HabitTypeChange){await this.writeTree(rootId,updates,creates,deletes,moves,undefined,typeChange)}
  private async writeTree(rootId:string,updates:TreeDraftUpdate[],creates:TreeDraftCreate[],deletes:string[],moves:TreeAttachment[],input?:CreateHabitInput,typeChange?:HabitTypeChange){
    await this.db.withTransactionAsync(async()=>{
      if(input){
        assertHabitName(input.name);
        if(input.parentId!==null||!input.name.trim())throw new Error('Invalid root');
        assertHabitAppearance(input.emoji,input.color);assertCalendarThreshold(input.type,input.calendarThreshold);
        if((input.isHidden!==undefined&&typeof input.isHidden!=='boolean')||(input.hideFromOverview!==undefined&&typeof input.hideFromOverview!=='boolean'))throw new Error('Invalid visibility');
        const now=new Date().toISOString(),count=await this.db.getFirstAsync<{n:number}>('SELECT COUNT(*) n FROM habits WHERE parent_id IS NULL AND is_general=0');
        await this.db.runAsync('INSERT INTO habits(id,parent_id,name,emoji,type,sort_order,is_general,archived_at,created_at,updated_at,color,calendar_threshold,hide_from_overview,is_hidden) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[rootId,null,input.name.trim(),input.emoji,input.type,count?.n??0,0,null,now,now,input.color??null,input.calendarThreshold??null,Number(input.hideFromOverview??false),Number(input.isHidden??false)]);
      }
      if(typeChange){
        const plan=planHabitTypeChange(await this.habits(),await this.entries(),rootId,typeChange),now=new Date().toISOString();
        for(const id of plan.habitIds)await this.db.runAsync('UPDATE habits SET type=?,calendar_threshold=NULL,updated_at=? WHERE id=?',[typeChange.to,now,id]);
        for(const {entry,value} of plan.entries)if(entry.value!==value)await this.db.runAsync('UPDATE entries SET value=?,updated_at=? WHERE id=?',[value,now,entry.id]);
      }
      const all=await this.habits(),root=all.find(h=>h.id===rootId&&!h.parentId&&!h.isGeneral);
      if(!root)throw new Error('Top-level habit not found');
      for(const item of updates)assertHabitAppearance(item.emoji===all.find(h=>h.id===item.id)?.emoji?'':item.emoji,item.color);
      for(const item of creates){assertHabitAppearance(item.emoji,item.color);assertCalendarThreshold(root.type,item.calendarThreshold);if(item.index!==undefined&&(!Number.isInteger(item.index)||item.index<0))throw new Error('Invalid draft position')}
      for(const item of updates)assertCalendarThreshold(root.type,item.calendarThreshold);
      for(const item of updates)assertHabitName(item.name,all.find(h=>h.id===item.id)?.name);
      for(const item of creates)assertHabitName(item.name);
      const allowed=validateAttachments(all,rootId,creates,moves),deletedTree=new Set(deletes.flatMap(id=>[id,...descendants(all,id).map(h=>h.id)]));
      if(deletes.some(id=>id===rootId||!allowed.has(id)))throw new Error('Invalid subtree deletion');
      if(updates.some(item=>item.hideFromOverview!==undefined&&(typeof item.hideFromOverview!=='boolean'||(item.hideFromOverview&&item.id!==rootId))))throw new Error('Only top-level habits can be hidden from overview');
      if(updates.some(item=>item.isHidden!==undefined&&(typeof item.isHidden!=='boolean'||(item.isHidden&&item.id!==rootId))))throw new Error('Only top-level habits can be hidden');
      if(moves.some(item=>deletedTree.has(item.id)||deletedTree.has(item.parentKey)))throw new Error('Deleted attachment destination');
      if(updates.some(item=>!allowed.has(item.id)))throw new Error('Invalid habit update');
      const draftKeys=new Set<string>();
      for(const item of creates){if(all.some(h=>h.id===item.key)||draftKeys.has(item.key)||(!allowed.has(item.parentKey)&&!draftKeys.has(item.parentKey))||deletedTree.has(item.parentKey))throw new Error('Invalid draft hierarchy');draftKeys.add(item.key)}
      const now=new Date().toISOString();
      for(const item of updates)if(!deletedTree.has(item.id))await this.db.runAsync('UPDATE habits SET name=?,emoji=?,color=?,hide_from_overview=?,is_hidden=?,calendar_threshold=?,updated_at=? WHERE id=?',[item.name.trim(),item.emoji,item.color===undefined?all.find(h=>h.id===item.id)?.color??null:item.color,Number(item.hideFromOverview??all.find(h=>h.id===item.id)?.hideFromOverview??false),Number(item.isHidden??all.find(h=>h.id===item.id)?.isHidden??false),item.calendarThreshold===undefined?all.find(h=>h.id===item.id)?.calendarThreshold??null:item.calendarThreshold,now,item.id]);
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
        if(!real?.n){let general=(await this.db.getFirstAsync<{id:string}>('SELECT id FROM habits WHERE parent_id=? AND is_general=1',[parentId]))?.id;if(!general){general=makeId();await this.db.runAsync('INSERT INTO habits(id,parent_id,name,emoji,type,sort_order,is_general,archived_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[general,parentId,'General','•',root.type,-1,1,null,now,now]);await this.db.runAsync('UPDATE entries SET habit_id=? WHERE habit_id=?',[general,parentId])}}
        const id=makeId();ids.set(item.key,id);await this.db.runAsync('INSERT INTO habits(id,parent_id,name,emoji,type,sort_order,is_general,archived_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[id,parentId,item.name.trim(),item.emoji,root.type,real?.n??0,0,null,now,now]);if(item.calendarThreshold!=null)await this.db.runAsync('UPDATE habits SET calendar_threshold=? WHERE id=?',[item.calendarThreshold,id]);if(item.color)await this.db.runAsync('UPDATE habits SET color=? WHERE id=?',[item.color,id]);
      }
      for(const item of moves){
        const parentId=ids.get(item.parentKey)??item.parentKey;
        const snapshot=await this.habits(),error=validateMove(snapshot,item.id,parentId),parent=snapshot.find(h=>h.id===parentId);
        if(error||!parent||parent.isGeneral||parent.archivedAt)throw new Error(error??'Invalid attachment destination');
        const general=snapshot.find(h=>h.parentId===parentId&&h.isGeneral);
        if(!general){const generalId=makeId();await this.db.runAsync('INSERT INTO habits(id,parent_id,name,emoji,type,sort_order,is_general,archived_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[generalId,parentId,'General','•',root.type,-1,1,null,now,now]);await this.db.runAsync('UPDATE entries SET habit_id=? WHERE habit_id=?',[generalId,parentId])}
        const count=await this.db.getFirstAsync<{n:number}>('SELECT COUNT(*) n FROM habits WHERE parent_id=? AND is_general=0',[parentId]);
        await this.db.runAsync('UPDATE habits SET parent_id=?,sort_order=?,hide_from_overview=0,is_hidden=0,updated_at=? WHERE id=?',[parentId,count?.n??0,now,item.id]);
        await this.normalize(item.expectedParentId);
        const siblings=(await this.habits()).filter(h=>h.parentId===parentId&&!h.isGeneral&&h.id!==item.id).sort((a,b)=>a.sortOrder-b.sortOrder);
        siblings.splice(Math.min(item.index??siblings.length,siblings.length),0,(await this.habits()).find(h=>h.id===item.id)!);
        for(let i=0;i<siblings.length;i++)await this.db.runAsync('UPDATE habits SET sort_order=? WHERE id=?',[i,siblings[i].id]);
        if(item.expectedParentId){
          const real=await this.db.getFirstAsync<{n:number}>('SELECT COUNT(*) n FROM habits WHERE parent_id=? AND is_general=0',[item.expectedParentId]);
          if(!real?.n){const oldGeneral=await this.db.getFirstAsync<{id:string}>('SELECT id FROM habits WHERE parent_id=? AND is_general=1',[item.expectedParentId]);if(oldGeneral){await this.db.runAsync('UPDATE entries SET habit_id=? WHERE habit_id=?',[item.expectedParentId,oldGeneral.id]);await this.db.runAsync('DELETE FROM habits WHERE id=?',[oldGeneral.id])}}
        }
      }
      const positions=[...creates.filter(item=>item.index!==undefined).map(item=>({id:ids.get(item.key)!,parentId:ids.get(item.parentKey)??item.parentKey,index:item.index!})),...moves.filter(item=>item.index!==undefined).map(item=>({id:item.id,parentId:ids.get(item.parentKey)??item.parentKey,index:item.index!}))];
      const snapshot=await this.habits();
      for(const parentId of new Set(positions.map(item=>item.parentId))){
        const placed=positions.filter(item=>item.parentId===parentId).sort((first,second)=>first.index-second.index),positioned=new Set(placed.map(item=>item.id));
        const siblings=snapshot.filter(item=>item.parentId===parentId&&!item.isGeneral&&!positioned.has(item.id)).sort((first,second)=>first.sortOrder-second.sortOrder).map(item=>item.id);
        for(const item of placed)siblings.splice(Math.min(item.index,siblings.length),0,item.id);
        for(const [index,id] of siblings.entries())await this.db.runAsync('UPDATE habits SET sort_order=? WHERE id=?',[index,id]);
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
  async setHidden(id:string,hidden:boolean){
    const habit=(await this.habits()).find(item=>item.id===id);
    if(!habit||habit.parentId!==null||habit.isGeneral)throw new Error('Top-level habit not found');
    await this.db.runAsync('UPDATE habits SET is_hidden=?,updated_at=? WHERE id=?',[Number(hidden),new Date().toISOString(),id]);
  }
  async archive(id:string,archived:boolean){ const all=await this.habits(),ids=[id,...descendants(all,id).map(h=>h.id)],time=archived?new Date().toISOString():null; await this.db.withTransactionAsync(async()=>{ for(const x of ids) await this.db.runAsync('UPDATE habits SET archived_at=? WHERE id=?',[time,x]); }); }
  async remove(id:string){ const all=await this.habits(),item=all.find(h=>h.id===id); if(!item)return; await this.db.withTransactionAsync(async()=>{ await this.db.runAsync('DELETE FROM habits WHERE id=?',[id]); await this.normalize(item.parentId); if(item.parentId){ const real=await this.db.getFirstAsync<{n:number}>('SELECT COUNT(*) n FROM habits WHERE parent_id=? AND is_general=0',[item.parentId]); if(!real?.n){ const general=await this.db.getFirstAsync<{id:string}>('SELECT id FROM habits WHERE parent_id=? AND is_general=1',[item.parentId]); if(general){ await this.db.runAsync('UPDATE entries SET habit_id=? WHERE habit_id=?',[item.parentId,general.id]); await this.db.runAsync('DELETE FROM habits WHERE id=?',[general.id]); } } } }); }
  async deletionImpact(id:string){ const all=await this.habits(),ids=[id,...descendants(all,id).map(h=>h.id)]; const placeholders=ids.map(()=>'?').join(','); const row=await this.db.getFirstAsync<{n:number}>(`SELECT COUNT(*) n FROM entries WHERE habit_id IN (${placeholders})`,ids); return {habits:all.filter(h=>ids.includes(h.id)&&!h.isGeneral).length,entries:row?.n??0}; }
  async export():Promise<ExportData>{ return {version:1,exportedAt:new Date().toISOString(),habits:await this.habits(),entries:await this.entries()}; }
  async import(raw:unknown){
    const incoming=validateImport(raw);
    await this.db.withTransactionAsync(async()=>{
      const existing=await this.export(),merged=planImport(existing,incoming),hids=new Set(existing.habits.map(h=>h.id)),previousEntries=new Map(existing.entries.map(e=>[e.id,e]));
      // Parents must precede children even when the file array is unordered.
      const pending=merged.habits.filter(h=>!hids.has(h.id));
      while(pending.length){const index=pending.findIndex(h=>!h.parentId||hids.has(h.parentId)),h=pending.splice(index,1)[0];
        await this.db.runAsync('INSERT INTO habits(id,parent_id,name,emoji,type,sort_order,is_general,archived_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[h.id,h.parentId,h.name,h.emoji,h.type,h.sortOrder,h.isGeneral?1:0,h.archivedAt,h.createdAt,h.updatedAt]);if(h.calendarThreshold!=null)await this.db.runAsync('UPDATE habits SET calendar_threshold=? WHERE id=?',[h.calendarThreshold,h.id]);if(h.color)await this.db.runAsync('UPDATE habits SET color=? WHERE id=?',[h.color,h.id]);if(h.hideFromOverview)await this.db.runAsync('UPDATE habits SET hide_from_overview=1 WHERE id=?',[h.id]);if(h.isHidden)await this.db.runAsync('UPDATE habits SET is_hidden=1 WHERE id=?',[h.id]);hids.add(h.id);
      }
      for(const e of merged.entries){
        if(!previousEntries.has(e.id))await this.db.runAsync('INSERT INTO entries VALUES(?,?,?,?,?,?,?,?)',[e.id,e.habitId,e.value,e.occurredAt,e.localDate,e.timezone,e.createdAt,e.updatedAt]);
        else {const previous=previousEntries.get(e.id)!;if(previous.habitId!==e.habitId)await this.db.runAsync('UPDATE entries SET habit_id=? WHERE id=?',[e.habitId,e.id]);}
      }
    });
  }
}
