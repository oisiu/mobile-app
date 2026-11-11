import { t } from '@/i18n';
import { useFocusEffect,usePathname } from 'expo-router';
import { useCallback,useEffect,useRef,useState } from 'react';

export function useHiddenCategoriesReveal(showSuccess:(message:string)=>void){
  const [visible,setVisible]=useState(false),pathname=usePathname();
  const visibility=useRef(false),returningFromDetail=useRef(false),taps=useRef({count:0,last:0});
  const conceal=useCallback(()=>{visibility.current=false;setVisible(false)},[]);
  const toggle=()=>{
    taps.current={count:0,last:0};returningFromDetail.current=false;
    visibility.current=!visibility.current;setVisible(visibility.current);
    showSuccess(t(visibility.current?'hiddenCategoriesVisible':'hiddenCategoriesConcealed'));
  };
  const tapTitle=()=>{
    const now=Date.now(),previous=taps.current;
    taps.current={count:now-previous.last<=500?previous.count+1:1,last:now};
    if(taps.current.count===3)toggle();
  };
  useFocusEffect(useCallback(()=>{
    returningFromDetail.current=false;
    return()=>{
      taps.current={count:0,last:0};
      if(!returningFromDetail.current)conceal();
    };
  },[conceal]));
  useEffect(()=>{
    // Keep the mounted disclosure only for a Home → hidden Insights → Back visit.
    if(returningFromDetail.current&&pathname!=='/'&&!pathname.startsWith('/insight/')){
      returningFromDetail.current=false;conceal();
    }
  },[pathname,conceal]);
  return {visible,toggle,tapTitle,openDetail:()=>{returningFromDetail.current=true}};
}
