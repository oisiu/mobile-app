import { aggregate } from '@/domain/aggregation';
import { branchRecords } from '@/domain/branchDay';
import type { HabitNode } from '@/domain/types';
import { useApp } from '@/features/AppProvider';
import { EntryRefreshError,entryErrorTitle } from '@/features/entryWriteError';
import { calendarDraft,calendarEntry,calendarInputValue,type CalendarDraft } from '@/features/insights/calendarEntry';
import { t } from '@/i18n';
import * as Haptics from 'expo-haptics';
import { useCallback,useRef,useState } from 'react';
import { Alert } from 'react-native';

export function useHomeEntries(today:string){
  const {habits,entries,changeEntry}=useApp();
  const [dialog,setDialog]=useState<CalendarDraft & {habit:HabitNode}|null>(null);
  const [branchDialog,setBranchDialog]=useState<{habit:HabitNode;date:string}|null>(null);
  const [entryNeedsRefresh,setEntryNeedsRefresh]=useState(false);
  const committedEntry=useRef<{value:number|null}|null>(null);
  const savingRef=useRef(false),[saving,setSaving]=useState(false);
  const openBranch=useCallback((habit:HabitNode,date:string)=>{if(!savingRef.current)setBranchDialog({habit,date})},[]);
  const toggle=useCallback(async(habit:HabitNode,date:string)=>{
    if(date>today||savingRef.current)return;
    const descendants=branchRecords(habits,entries,habit,date).some(record=>!record.direct&&(habit.type!=='boolean'||record.entry.value>0));
    if(descendants){setBranchDialog({habit,date});return}
    if(habit.type!=='boolean'){
      setDialog({...calendarDraft(habit,date,calendarEntry(habit,habits,entries,date)?.value??null),habit});
      return;
    }
    savingRef.current=true;
    try{
      const current=aggregate(habits,entries,habit.id,new Set([date]));
      await changeEntry(habit.id,date,current?null:1);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>undefined);
    }catch(error){Alert.alert(entryErrorTitle(error),error instanceof Error?error.message:String(error))}
    finally{savingRef.current=false}
  },[today,habits,entries,changeEntry]);
  const persist=async(value:number|null)=>{
    if(!dialog||savingRef.current)return;
    savingRef.current=true;setSaving(true);
    try{
      await changeEntry(dialog.habit.id,dialog.date,committedEntry.current?committedEntry.current.value:value);
      committedEntry.current=null;setEntryNeedsRefresh(false);setDialog(null);
    }catch(error){
      if(error instanceof EntryRefreshError){committedEntry.current??={value};setEntryNeedsRefresh(true)}
      Alert.alert(entryErrorTitle(error),error instanceof Error?error.message:String(error));
    }finally{savingRef.current=false;setSaving(false)}
  };
  const save=async()=>{
    if(!dialog)return;
    if(committedEntry.current){await persist(committedEntry.current.value);return}
    const value=calendarInputValue(dialog.habit,dialog);
    if(value===null)return Alert.alert(t('invalidNumber'));
    await persist(value);
  };
  const updateEditor=(update:CalendarDraft|null|((current:CalendarDraft|null)=>CalendarDraft|null))=>{
    if(savingRef.current||(update!==null&&committedEntry.current))return;
    if(update===null){committedEntry.current=null;setEntryNeedsRefresh(false);setDialog(null);return}
    setDialog(current=>{
      const next=typeof update==='function'?update(current):update;
      return current&&next?{...next,habit:current.habit}:null;
    });
  };
  return {
    toggle,openBranch,dialog,branchDialog,saving,entryNeedsRefresh,updateEditor,save,
    clear:()=>persist(null),closeBranch:()=>setBranchDialog(null),
    hasRecord:!!dialog&&!!calendarEntry(dialog.habit,habits,entries,dialog.date),
  };
}
