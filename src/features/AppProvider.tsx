import React,{createContext,useContext,useMemo} from 'react';
import { SuccessToastView,useSuccessToast } from './provider/SuccessToastView';
import { useAppData } from './provider/useAppData';
import { useAppearance } from './provider/useAppearance';
import { useEntryWrites } from './provider/useEntryWrites';

export type { ThemeMode } from './provider/useAppearance';
type State=
  & ReturnType<typeof useAppData>
  & ReturnType<typeof useAppearance>
  & ReturnType<typeof useEntryWrites>
  & ReturnType<typeof useSuccessToast>;
const Context=createContext<State|null>(null);

export function AppProvider({children}:{children:React.ReactNode}){
  const {ready,error,retryStartup,repo,refresh,habits,entries}=useAppData();
  const {themeReady,themeMode,setThemeMode,resolvedTheme,palette}=useAppearance();
  const {toast,showSuccess}=useSuccessToast();
  const {changeEntry,changeBranchDay}=useEntryWrites({repo,habits,refresh,showSuccess});
  const value=useMemo(()=>({
    ready,themeReady,error,retryStartup,habits,entries,repo,refresh,
    changeEntry,changeBranchDay,showSuccess,toast,
    themeMode,setThemeMode,resolvedTheme,palette,
  }),[ready,themeReady,error,retryStartup,habits,entries,repo,refresh,changeEntry,changeBranchDay,showSuccess,toast,themeMode,setThemeMode,resolvedTheme,palette]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function SuccessToast({bottom=92}:{bottom?:number}){
  const {toast,palette}=useApp();
  return <SuccessToastView toast={toast} palette={palette} bottom={bottom}/>;
}

export function useApp(){
  const value=useContext(Context);
  if(!value)throw new Error('AppProvider missing');
  return value;
}
