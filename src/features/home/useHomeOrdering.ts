import type { HabitNode } from '@/domain/types';
import { useApp } from '@/features/AppProvider';
import { entryErrorTitle } from '@/features/entryWriteError';
import * as Haptics from 'expo-haptics';
import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { Alert } from 'react-native';
import type { HomeHabitItem } from './homeMatrix';

type Drag={id:string;dy:number;target:number};
export function useHomeOrdering(tree:HabitNode[],items:HomeHabitItem[]){
  const {habits,repo,refresh}=useApp();
  const [drag,setDrag]=useState<Drag|null>(null),dragRef=useRef<Drag|null>(null);
  const [ordering,setOrdering]=useState(false),orderingRef=useRef(false);
  const layout=useMemo(()=>{
    const counts=new Map<string,number>();
    for(const item of items)counts.set(item.rootId,(counts.get(item.rootId)??0)+1);
    let top=0;
    const groups:{id:string;index:number;midpoint:number}[]=[];
    for(const [index,root] of tree.entries()){
      const height=(counts.get(root.id)??0)*52+6;
      groups.push({id:root.id,index,midpoint:top+height/2});
      top+=height;
    }
    return groups;
  },[tree,items]);
  const reorder=useCallback(async(id:string,index:number)=>{
    const sourceIndex=tree.findIndex(item=>item.id===id),target=tree[index];
    if(!repo||orderingRef.current||sourceIndex<0||!target||sourceIndex===index)return;
    orderingRef.current=true;setOrdering(true);
    try{
      const siblings=habits.filter(item=>item.parentId===null&&!item.isGeneral&&item.id!==id).sort((a,b)=>a.sortOrder-b.sortOrder);
      const targetIndex=siblings.findIndex(item=>item.id===target.id)+(index>sourceIndex?1:0);
      await repo.move(id,null,targetIndex);await refresh();
    }catch(error){Alert.alert(entryErrorTitle(error),error instanceof Error?error.message:String(error))}
    finally{orderingRef.current=false;setOrdering(false)}
  },[repo,refresh,tree,habits]);
  const finishDrag=useCallback(()=>{
    const current=dragRef.current;dragRef.current=null;setDrag(null);
    if(current)void reorder(current.id,current.target);
  },[reorder]);
  const cancelDrag=useCallback(()=>{dragRef.current=null;setDrag(null)},[]);
  // A refreshed/edited hierarchy invalidates both the drag source and its row indices.
  useEffect(()=>cancelDrag(),[tree,cancelDrag]);
  const startDrag=useCallback((id:string)=>{
    const index=tree.findIndex(item=>item.id===id);
    if(orderingRef.current||index<0)return;
    const next={id,dy:0,target:index};
    dragRef.current=next;setDrag(next);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>undefined);
  },[tree]);
  const moveDrag=useCallback((dy:number)=>{
    const current=dragRef.current;
    if(!current)return;
    const source=layout.find(item=>item.id===current.id);
    if(!source){cancelDrag();return}
    const center=source.midpoint+dy;
    let target=source.index;
    for(const item of layout){
      if(item.index<source.index&&center<item.midpoint)target=Math.min(target,item.index);
      if(item.index>source.index&&center>item.midpoint)target=Math.max(target,item.index);
    }
    const next={...current,dy,target};dragRef.current=next;setDrag(next);
  },[layout,cancelDrag]);
  return useMemo(()=>({drag,ordering,reorder,finishDrag,cancelDrag,startDrag,moveDrag}),[drag,ordering,reorder,finishDrag,cancelDrag,startDrag,moveDrag]);
}
