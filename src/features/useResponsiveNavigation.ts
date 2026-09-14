import { router,useFocusEffect } from 'expo-router';
import { useCallback,useEffect,useRef,useState } from 'react';

export function useResponsiveNavigation(){
  const [pending,setPending]=useState<string|null>(null),frame=useRef<number|null>(null);
  useFocusEffect(useCallback(()=>{
    setPending(null);
    return()=>{if(frame.current!==null)cancelAnimationFrame(frame.current)};
  },[]));
  const push=useCallback((href:string)=>{
    if(frame.current!==null)return;
    setPending(href);
    frame.current=requestAnimationFrame(()=>{frame.current=null;router.push(href as never)});
  },[]);
  return {pending,push};
}

export function usePrefetchRoutes(hrefs:string[]){
  const key=hrefs.join('\0');
  useEffect(()=>{for(const href of key.split('\0'))if(href)router.prefetch(href as never)},[key]);
}
