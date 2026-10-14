import { Habit } from './types';
import { assertHomogeneousAcyclic,descendants,topLevelAncestor } from './tree';

export interface TreeAttachment { id:string; parentKey:string; expectedParentId:string|null; index?:number }

export function attachmentCandidates(habits:Habit[],type:Habit['type'],excluded:Set<string>):Habit[]{
  return habits.filter(h=>!h.isGeneral&&!h.archivedAt&&h.type===type&&!excluded.has(h.id)&&!descendants(habits,h.id).some(child=>excluded.has(child.id))&&!topLevelAncestor(habits,h.id)?.archivedAt);
}

export function validateAttachments(habits:Habit[],rootId:string,creates:{key:string;parentKey:string}[],moves:TreeAttachment[]):Set<string>{
  const root=habits.find(h=>h.id===rootId)!;
  const allowed=new Set([rootId,...descendants(habits,rootId).filter(h=>!h.isGeneral).map(h=>h.id)]);
  const attached=new Set<string>();
  for(const move of moves){
    const item=habits.find(h=>h.id===move.id);
    if((move.index!==undefined&&(!Number.isInteger(move.index)||move.index<0))||!item||item.isGeneral||item.archivedAt||item.type!==root.type||item.parentId!==move.expectedParentId||topLevelAncestor(habits,item.id)?.archivedAt)throw new Error('Invalid or changed category attachment');
    const branch=[item,...descendants(habits,item.id)];
    if(branch.some(h=>allowed.has(h.id)||attached.has(h.id)))throw new Error('Overlapping category attachments');
    branch.forEach(h=>{attached.add(h.id)});
  }
  attached.forEach(id=>{if(!habits.find(h=>h.id===id)?.isGeneral)allowed.add(id)});
  const keys=new Set([...allowed,...creates.map(h=>h.key)]);
  if(moves.some(move=>!keys.has(move.parentKey)))throw new Error('Invalid attachment destination');
  const planned=habits.map(h=>({...h,parentId:moves.find(move=>move.id===h.id)?.parentKey??h.parentId}));
  planned.push(...creates.map((h,index)=>({...root,id:h.key,parentId:h.parentKey,isGeneral:false,sortOrder:index})));
  assertHomogeneousAcyclic(planned);
  return allowed;
}
