import { useRef,useState } from 'react';
import { Alert,Keyboard } from 'react-native';
import { t } from '@/i18n';

export function useHabitMutation(refresh:()=>Promise<void>,refreshFailureHelp=t('habitSavedRefreshFailedHelp')){
  const pending=useRef(false),completion=useRef<null|(()=>void)>(null);
  const [busy,setBusy]=useState(false),[needsRefresh,setNeedsRefresh]=useState(false);
  const publish=async()=>{
    try{await refresh()}
    catch{setNeedsRefresh(true);Alert.alert(t('habitSavedRefreshFailed'),refreshFailureHelp);return}
    const done=completion.current;completion.current=null;setNeedsRefresh(false);done?.();
  };
  const run=async(write:()=>Promise<unknown>,done:()=>void)=>{
    if(pending.current)return;
    pending.current=true;setBusy(true);
    try{if(!completion.current){await write();completion.current=done;Keyboard.dismiss()}await publish()}
    finally{pending.current=false;setBusy(false)}
  };
  const retry=()=>run(async()=>{},()=>{});
  return {run,retry,busy,needsRefresh,pending};
}
