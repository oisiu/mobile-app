import type { Habit } from './types';

export type SiblingPosition={id:string;parentId:string;index:number};

// Resolve explicit draft positions together, retaining the order of unmentioned siblings.
export function planSiblingOrder(habits:Habit[],positions:SiblingPosition[]):{id:string;index:number}[]{
  const byId=new Map(habits.map(habit=>[habit.id,habit]));
  const seen=new Set<string>(),groups=new Map<string,SiblingPosition[]>();
  for(const position of positions){
    const habit=byId.get(position.id);
    if(!habit||habit.isGeneral||habit.parentId!==position.parentId||!Number.isSafeInteger(position.index)||position.index<0||seen.has(position.id))throw new Error('Invalid draft position');
    seen.add(position.id);
    const group=groups.get(position.parentId)??[];
    group.push(position);groups.set(position.parentId,group);
  }
  const result:{id:string;index:number}[]=[];
  for(const [parentId,group] of groups){
    const occupied=new Set<number>();
    for(const {index} of group){
      if(occupied.has(index))throw new Error('Conflicting draft positions');
      occupied.add(index);
    }
    const siblings=habits.filter(habit=>habit.parentId===parentId&&!habit.isGeneral&&!seen.has(habit.id)).sort((a,b)=>a.sortOrder-b.sortOrder).map(habit=>habit.id);
    for(const {id,index} of group.sort((a,b)=>a.index-b.index))siblings.splice(Math.min(index,siblings.length),0,id);
    result.push(...siblings.map((id,index)=>({id,index})));
  }
  return result;
}
