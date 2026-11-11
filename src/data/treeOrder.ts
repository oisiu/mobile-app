import { planSiblingOrder,type SiblingPosition } from '@/domain/siblingOrder';
import type { TreeAttachment } from '@/domain/treeAttachments';
import type { Habit } from '@/domain/types';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { TreeDraftCreate,TreeDraftUpdate } from './treeDraft';

export async function applyTreeOrder(db:SQLiteDatabase,habits:Habit[],updates:TreeDraftUpdate[],creates:TreeDraftCreate[],moves:TreeAttachment[],ids:Map<string,string>,deleted:Set<string>){
  const byId=new Map(habits.map(habit=>[habit.id,habit]));
  const positions=new Map<string,SiblingPosition>();
  const place=(id:string,index:number)=>{
    const parentId=byId.get(id)?.parentId;
    if(!parentId)throw new Error('Invalid draft position');
    positions.set(id,{id,parentId,index});
  };
  for(const item of updates)if(item.index!==undefined&&!deleted.has(item.id))place(item.id,item.index);
  for(const item of creates)if(item.index!==undefined)place(ids.get(item.key)!,item.index);
  // An attached habit can also have field updates; its final move position takes precedence.
  for(const item of moves)if(item.index!==undefined)place(item.id,item.index);
  for(const {id,index} of planSiblingOrder(habits,[...positions.values()])){
    await db.runAsync('UPDATE habits SET sort_order=? WHERE id=?',[index,id]);
  }
}
