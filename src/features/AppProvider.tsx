import { BranchEdit } from '@/domain/branchDay';
import { Ionicons } from '@expo/vector-icons';
import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import { StyleSheet,Text,useColorScheme,View } from 'react-native';
import * as SQLite from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { migrate } from '@/data/migrations';
import { HabitRepository } from '@/data/repository';
import { Entry,Habit } from '@/domain/types';
import { t } from '@/i18n';
import { dark,light } from '@/theme';

export type ThemeMode='system'|'light'|'dark';
type ToastState={id:number;message:string};
type State={ready:boolean;themeReady:boolean;error:string|null;habits:Habit[];entries:Entry[];repo:HabitRepository|null;refresh:()=>Promise<void>;changeBranchDay:(habitId:string,date:string,expected:Entry[],edits:BranchEdit[],destination:string)=>Promise<void>;changeEntry:(habitId:string,date:string,value:number|null)=>Promise<void>;showSuccess:(message:string)=>void;toast:ToastState|null;themeMode:ThemeMode;setThemeMode:(mode:ThemeMode)=>Promise<void>;resolvedTheme:'light'|'dark';palette:typeof light|typeof dark};
const Context=createContext<State|null>(null);

export function AppProvider({children}:{children:React.ReactNode}){
  const systemTheme=useColorScheme()==='dark'?'dark':'light',[themeMode,setThemeModeState]=useState<ThemeMode>('system'),[themeReady,setThemeReady]=useState(false),[repo,setRepo]=useState<HabitRepository|null>(null),[habits,setHabits]=useState<Habit[]>([]),[entries,setEntries]=useState<Entry[]>([]),[error,setError]=useState<string|null>(null),[toast,setToast]=useState<ToastState|null>(null),toastId=useRef(0);
  const refresh=useCallback(async()=>{if(!repo)return;setHabits(await repo.habits());setEntries(await repo.entries())},[repo]);
  const setThemeMode=useCallback(async(mode:ThemeMode)=>{setThemeModeState(mode);await Storage.setItem('theme-mode',mode)},[]);
  const showSuccess=useCallback((message:string)=>setToast({id:++toastId.current,message}),[]);
  const changeEntry=useCallback(async(habitId:string,date:string,value:number|null)=>{if(!repo)return;const currentHabits=await repo.habits(),target=currentHabits.find(habit=>habit.parentId===habitId&&habit.isGeneral)?.id??habitId,currentEntries=await repo.entries(date,date),previous=currentEntries.find(entry=>entry.habitId===target)?.value??null;if(previous===value)return;if(value===null)await repo.clearEntry(habitId,date);else await repo.saveEntry({habitId,value,localDate:date});await refresh();const habit=currentHabits.find(item=>item.id===habitId),visibleHabit=habit?.isGeneral?currentHabits.find(item=>item.id===habit.parentId):habit,name=visibleHabit?`${visibleHabit.emoji} ${visibleHabit.name}`.trim():t('habitName');showSuccess(t(previous===null?'recordAdded':value===null?'recordRemoved':'recordUpdated',{name}))},[repo,refresh,showSuccess]);
  const changeBranchDay=useCallback(async(habitId:string,date:string,expected:Entry[],edits:BranchEdit[],destination:string)=>{
    if(!repo)throw new Error(t('couldNotSave'));
    try{await repo.editBranchDay(habitId,date,expected,edits,destination)}catch(error){if(error instanceof Error){const key=({BRANCH_DAY_CHANGED:'branchChangedError',BRANCH_CONFLICT:'branchConflictHelp',BRANCH_DATE:'branchDateError',BRANCH_VALUE:'invalidNumber'} as const)[error.message as 'BRANCH_DAY_CHANGED'];if(key)throw new Error(t(key))}throw error}
    await refresh();const habit=habits.find(h=>h.id===habitId);showSuccess(t('branchChanged',{name:habit?`${habit.emoji} ${habit.name}`:t('habitName')}));
  },[repo,refresh,habits,showSuccess]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(current=>current?.id===toast.id?null:current),2600);return()=>clearTimeout(timer)},[toast]);
  useEffect(()=>{Storage.getItem('theme-mode').then(value=>{if(value==='system'||value==='light'||value==='dark')setThemeModeState(value)}).catch(e=>setError(String(e))).finally(()=>setThemeReady(true))},[]);
  useEffect(()=>{(async()=>{try{const db=await SQLite.openDatabaseAsync('oisiu.db');await migrate(db);const r=new HabitRepository(db);setRepo(r)}catch(e){setError(e instanceof Error?e.message:String(e))}})()},[]);
  useEffect(()=>{refresh().catch(e=>setError(String(e)))},[refresh]);
  const resolvedTheme=themeMode==='system'?systemTheme:themeMode,palette=resolvedTheme==='dark'?dark:light,value=useMemo(()=>({ready:!!repo,themeReady,error,habits,entries,repo,refresh,changeEntry,changeBranchDay,showSuccess,toast,themeMode,setThemeMode,resolvedTheme,palette}),[repo,themeReady,error,habits,entries,refresh,changeEntry,changeBranchDay,showSuccess,toast,themeMode,setThemeMode,resolvedTheme,palette]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function SuccessToast({bottom=92}:{bottom?:number}){
  const {toast,palette:c}=useApp();
  if(!toast)return null;
  return <View pointerEvents="none" style={[s.toastLayer,{bottom}]}><View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[s.toast,{backgroundColor:`${c.card}EB`,borderColor:`${c.accent}40`}]}><View style={[s.toastIcon,{backgroundColor:`${c.accent}1F`}]}><Ionicons name="checkmark" size={18} color={c.accent}/></View><Text numberOfLines={2} style={[s.toastText,{color:c.text}]}>{toast.message}</Text></View></View>;
}
export function useApp(){const value=useContext(Context);if(!value)throw new Error('AppProvider missing');return value}

const s=StyleSheet.create({toastLayer:{position:'absolute',left:16,right:16,alignItems:'center',zIndex:100,elevation:20},toast:{width:'100%',maxWidth:460,minHeight:52,borderRadius:20,borderWidth:1,paddingHorizontal:14,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:11,shadowColor:'#000',shadowOpacity:.12,shadowRadius:18,shadowOffset:{width:0,height:6},elevation:6},toastIcon:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center'},toastText:{flex:1,fontSize:14,lineHeight:20,fontWeight:'600'}});
