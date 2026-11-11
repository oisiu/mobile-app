import { aggregationIndex } from '@/domain/aggregation';
import { durationInputToSeconds,isCompleteDecimalInput,sanitizeDecimalInput,type DurationUnit } from '@/domain/entries';
import type { Entry,Habit } from '@/domain/types';
import type { PopoverAnchor } from '@/features/AnchoredPopover';
import { useApp } from '@/features/AppProvider';
import { EntryRefreshError,entryErrorTitle } from '@/features/entryWriteError';
import { t } from '@/i18n';
import { useMemo,useRef,useState } from 'react';
import { Alert } from 'react-native';

type ValueEditor={habit:Habit;value:string;unit:DurationUnit};
export function useCalendarDayEditor(habits:Habit[],entries:Entry[]){
  const {changeEntry}=useApp();
  const [popoverAnchor,setPopoverAnchor]=useState<PopoverAnchor|null>(null);
  const [selectedDate,setSelectedDate]=useState<string|null>(null);
  const [editor,setEditor]=useState<ValueEditor|null>(null);
  const [expanded,setExpanded]=useState<Set<string>>(new Set());
  const [saving,setSaving]=useState(false),[refreshOnly,setRefreshOnly]=useState(false);
  const savingRef=useRef(false),committed=useRef<{habitId:string;date:string;value:number|null}|null>(null);
  const locked=saving||refreshOnly;
  const entryIndex=useMemo(()=>aggregationIndex(habits,entries),[habits,entries]);
  const directTargets=useMemo(()=>new Map(habits.map(habit=>[
    habit.id,habits.find(item=>item.parentId===habit.id&&item.isGeneral)?.id??habit.id,
  ])),[habits]);
  const targetId=(habit:Habit)=>directTargets.get(habit.id)??habit.id;
  const valueOn=(habit:Habit,date:string)=>entryIndex.value(targetId(habit),date);
  const clearCommitted=()=>{committed.current=null;setRefreshOnly(false)};

  const selectDate=(date:string,anchor:PopoverAnchor|null)=>{
    setPopoverAnchor(anchor);setExpanded(new Set());setEditor(null);setSelectedDate(date);
  };
  const openEditor=(habit:Habit)=>{
    if(!selectedDate||savingRef.current||committed.current)return;
    const current=valueOn(habit,selectedDate);
    const unit:DurationUnit=habit.type==='duration'&&current>=3600&&current%3600===0?'hours':'minutes';
    const value=entryIndex.has(targetId(habit),selectedDate)
      ?String(habit.type==='duration'?current/(unit==='hours'?3600:60):current)
      :'';
    setEditor({habit,unit,value});
  };
  const toggleExpanded=(id:string)=>{
    if(savingRef.current||committed.current)return;
    setExpanded(current=>{
      const next=new Set(current);
      if(next.has(id))next.delete(id);else next.add(id);
      return next;
    });
  };
  const closeSheet=()=>{
    if(savingRef.current)return;
    clearCommitted();setEditor(null);setSelectedDate(null);
  };
  const goBack=()=>{
    if(savingRef.current)return;
    if(editor){clearCommitted();setEditor(null)}else closeSheet();
  };
  const persist=async(value:number|null,habit=editor?.habit)=>{
    if(!selectedDate||!habit||savingRef.current)return;
    savingRef.current=true;setSaving(true);
    const request=committed.current??{habitId:habit.id,date:selectedDate,value};
    try{
      await changeEntry(request.habitId,request.date,request.value);
      clearCommitted();setEditor(null);
    }catch(error){
      if(error instanceof EntryRefreshError){committed.current=request;setRefreshOnly(true)}
      Alert.alert(entryErrorTitle(error),error instanceof Error?error.message:String(error));
    }finally{savingRef.current=false;setSaving(false)}
  };
  const save=async()=>{
    if(!editor)return;
    if(committed.current)return persist(committed.current.value);
    if(!isCompleteDecimalInput(editor.value))return Alert.alert(t('invalidNumber'));
    const input=Number(editor.value);
    const value=editor.habit.type==='duration'?durationInputToSeconds(input,editor.unit):input;
    if(!Number.isFinite(value)||value<0||(editor.habit.type==='duration'&&!Number.isInteger(value))){
      return Alert.alert(t('invalidNumber'));
    }
    await persist(value);
  };
  const changeUnit=(unit:DurationUnit)=>setEditor(current=>{
    if(committed.current||!current||current.unit===unit)return current;
    const value=isCompleteDecimalInput(current.value)
      ?String(Number(current.value)*(unit==='hours'?1/60:60))
      :current.value;
    return {...current,unit,value};
  });
  const changeValue=(value:string)=>{
    if(!committed.current)setEditor(current=>current&&({...current,value:sanitizeDecimalInput(value)}));
  };
  const deleteEntry=()=>{if(!committed.current)void persist(null)};
  const retry=()=>{
    const request=committed.current;
    if(request)void persist(request.value,habits.find(habit=>habit.id===request.habitId));
  };
  const editHabit=(habit:Habit)=>{
    if(committed.current)return;
    if(habit.type==='boolean')void persist(selectedDate&&valueOn(habit,selectedDate)?null:1,habit);
    else openEditor(habit);
  };
  const hasRecord=!!editor&&!!selectedDate&&entryIndex.has(targetId(editor.habit),selectedDate);
  return {
    popoverAnchor,selectedDate,editor,expanded,saving,refreshOnly,locked,hasRecord,
    valueOn,selectDate,toggleExpanded,closeSheet,goBack,save,changeUnit,changeValue,deleteEntry,retry,editHabit,
  };
}
export type CalendarDayEditor=ReturnType<typeof useCalendarDayEditor>;
