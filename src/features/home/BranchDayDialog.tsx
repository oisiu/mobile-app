import { Ionicons } from '@expo/vector-icons';
import { BranchDatePicker } from './BranchDatePicker';
import React,{useRef,useState} from 'react';
import { Alert,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Switch,Text,TextInput,View } from 'react-native';
import { useApp } from '../AppProvider';
import { branchRecords,validBranchDate } from '../../domain/branchDay';
import { Habit } from '../../domain/types';
import { formatValue } from '../../domain/aggregation';
import { sanitizeDecimalInput } from '../../domain/entries';
import { CalendarEntryModal } from '../insights/CalendarEntryModal';
import { CalendarDraft,calendarEntry,calendarDraft,calendarInputValue,changeCalendarUnit } from '../insights/calendarEntry';
import { t } from '../../i18n';

export function BranchDayDialog({habit,date,onClose}:{habit:Habit;date:string;onClose:()=>void}){
  const {habits,entries,changeEntry,changeBranchDay,palette:c}=useApp();
  const [records]=useState(()=>branchRecords(habits,entries,habit,date));
  const [drafts,setDrafts]=useState(()=>records.map(r=>calendarDraft(r.habit,date,r.entry.value)));
  const [removed,setRemoved]=useState(new Set<string>()),[saving,setSaving]=useState(false),[destination,setDestination]=useState(date),busy=useRef(false);
  const [directEditor,setDirectEditor]=useState<CalendarDraft|null>(null);
  const [moving,setMoving]=useState(false),[pickingDate,setPickingDate]=useState(false);
  const target=moving?destination:date;
  const edits=records.map((r,index)=>({id:r.entry.id,value:removed.has(r.entry.id)?null:calendarInputValue(r.habit,drafts[index])}));
  const invalid=records.some((r,index)=>!removed.has(r.entry.id)&&edits[index].value===null);
  const changed=target!==date||edits.some((e,index)=>e.value!==records[index].entry.value);
  const conflictRecords=target===date?[]:records.filter((r,index)=>edits[index].value!==null&&entries.some(e=>e.habitId===r.entry.habitId&&e.localDate===target));
  const label=(path:Habit[])=>path.map(h=>h.isGeneral?t('branchDirectShort'):h.name).join(' › ');
  const close=()=>{if(!busy.current){if(directEditor)setDirectEditor(null);else onClose()}};
  const saveDirect=async(value:number|null)=>{if(busy.current)return;busy.current=true;setSaving(true);try{await changeEntry(habit.id,date,value);onClose()}catch(error){Alert.alert(t('couldNotSave'),String(error))}finally{busy.current=false;setSaving(false)}};
  const save=async()=>{
    if(busy.current)return;
    if(invalid)return Alert.alert(t('invalidNumber'));
    if(!validBranchDate(target))return Alert.alert(t('branchDateError'));
    busy.current=true;setSaving(true);
    try{await changeBranchDay(habit.id,date,records.map(r=>r.entry),edits,target);onClose()}
    catch(error){Alert.alert(t('couldNotSave'),error instanceof Error?error.message:String(error))}
    finally{busy.current=false;setSaving(false)}
  };
  const formatDate=(value:string)=>new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00`));
  const dateText=formatDate(date);
  const total=habit.type==='boolean'?(edits.some(e=>(e.value??0)>0)?1:0):edits.reduce((sum,e)=>sum+(e.value??0),0);
  const original=habit.type==='boolean'?(records.some(r=>r.entry.value>0)?1:0):records.reduce((sum,r)=>sum+r.entry.value,0);
  const disabled=saving||!changed||invalid||!validBranchDate(target)||conflictRecords.length>0;
  return <Modal transparent animationType="fade" onRequestClose={close}>
    {directEditor?<CalendarEntryModal embedded editor={directEditor} habit={habit} hasRecord={!!calendarEntry(habit,habits,entries,date)} saving={saving} setEditor={update=>{if(!busy.current)setDirectEditor(update)}} onSave={async()=>{const value=calendarInputValue(habit,directEditor);if(value===null){Alert.alert(t('invalidNumber'));return}await saveDirect(value)}} onClear={()=>saveDirect(null)} c={c}/>:<KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
    <Pressable style={s.overlay} onPress={close}><Pressable accessibilityViewIsModal onAccessibilityEscape={close} style={[s.sheet,{backgroundColor:c.card}]} onPress={()=>undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <View style={s.row}><Text style={{fontSize:30}}>{habit.emoji}</Text><View style={{flex:1}}><Text accessibilityRole="header" style={[s.title,{color:c.text}]}>{habit.name}</Text><Text style={{color:c.muted}}>{dateText}</Text></View><Pressable disabled={saving} accessibilityRole="button" accessibilityLabel={t('close')} onPress={close} style={{padding:12}}><Ionicons name="close" size={22} color={c.muted}/></Pressable></View>
        {records.map(({entry,path,habit:recordHabit},index)=>{
          const name=label(path),visibleHabit=recordHabit.isGeneral?path[path.length-2]??recordHabit:recordHabit,trail=path.slice(0,-1).filter(h=>h.id!==habit.id).map(h=>h.name).join(' › '),checked=habit.type==='boolean'?(edits[index].value??0)>0:!removed.has(entry.id);
          return <View key={entry.id} style={[s.record,{borderColor:c.line}]}>
            <View style={s.row}><Text style={{fontSize:24}}>{visibleHabit.emoji}</Text><View style={s.path}><Text style={{color:c.text,fontWeight:'600'}}>{recordHabit.isGeneral?t('branchDirectShort'):recordHabit.name}</Text>{!!trail&&<Text style={{color:c.muted,fontSize:12}}>{trail}</Text>}</View><Switch trackColor={{true:c.accent}} disabled={saving} accessibilityLabel={t('branchRecordSwitch',{name,date:dateText})} accessibilityState={{checked,disabled:saving}} value={checked} onValueChange={value=>{setRemoved(previous=>{const next=new Set(previous);if(value)next.delete(entry.id);else next.add(entry.id);return next});if(habit.type==='boolean'&&value)setDrafts(previous=>previous.map((draft,i)=>i===index?{...draft,value:'1'}:draft))}}/></View>
            {habit.type!=='boolean'&&checked&&<>
              {habit.type==='duration'&&<View style={s.actions}>{(['minutes','hours'] as const).map(unit=><Pressable key={unit} accessibilityRole="radio" accessibilityState={{checked:drafts[index].unit===unit,disabled:saving}} disabled={saving} onPress={()=>setDrafts(previous=>previous.map((draft,i)=>i===index?changeCalendarUnit(draft,unit):draft))} style={[s.button,{backgroundColor:drafts[index].unit===unit?c.accent:c.soft}]}><Text style={{color:drafts[index].unit===unit?'white':c.text}}>{t(unit)}</Text></Pressable>)}</View>}
              <TextInput editable={!saving} accessibilityLabel={`${name}, ${recordHabit.type==='duration'?t(drafts[index].unit):t('value')}`} keyboardType="decimal-pad" value={drafts[index].value} onChangeText={value=>setDrafts(previous=>previous.map((draft,i)=>i===index?{...draft,value:sanitizeDecimalInput(value)}:draft))} style={[s.input,{color:c.text,borderColor:c.line}]}/>
            </>}
          </View>;
        })}
        {!records.length&&<Text style={{color:c.muted}}>{t('branchNoRecords')}</Text>}
        <View accessibilityLiveRegion="polite" style={[s.preview,{backgroundColor:c.soft}]}><View><Text style={{color:c.muted,fontSize:11}}>{t('branchBefore')}</Text><Text style={[s.previewValue,{color:c.text}]}>{formatValue(habit.type,original)}</Text></View><Ionicons name="arrow-forward" size={20} color={c.muted}/><View><Text style={{color:c.muted,fontSize:11}}>{t('branchAfter')}</Text><Text style={[s.previewValue,{color:c.accent}]}>{invalid?'…':formatValue(habit.type,target!==date?0:total)}</Text></View></View>
        <View style={s.actions}>
          <Pressable disabled={saving||!records.length} accessibilityRole="button" onPress={()=>setRemoved(new Set(records.map(r=>r.entry.id)))} style={s.smallAction}><Ionicons name="trash-outline" size={18} color={c.danger}/><Text style={{color:c.danger}}>{t('branchClearShort')}</Text></Pressable>
          <Pressable disabled={saving||!records.length} accessibilityRole="button" onPress={()=>setPickingDate(value=>!value)} style={s.smallAction}><Ionicons name="calendar-outline" size={18} color={c.accent}/><Text style={{color:c.accent}}>{t('branchMoveShort')}</Text></Pressable>
        </View>
        {pickingDate&&<BranchDatePicker disabled={saving} date={destination} onSelect={value=>{setDestination(value);setMoving(value!==date);setPickingDate(false)}} c={c}/>}
        {moving&&<View style={[s.row,{backgroundColor:c.soft,padding:12,borderRadius:12}]}><Ionicons name="calendar-outline" size={20} color={c.accent}/><View style={{flex:1}}><Text style={{color:c.text,fontWeight:'600'}}>{formatDate(target)}</Text><Text style={{color:c.muted,fontSize:12}}>{t('branchMovingCount',{count:edits.filter(e=>e.value!==null).length})}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={t('branchKeepDate')} disabled={saving} onPress={()=>{setMoving(false);setDestination(date)}} style={{padding:10}}><Ionicons name="close" color={c.muted} size={18}/></Pressable></View>}
        {!!conflictRecords.length&&<View accessibilityLiveRegion="polite" style={{gap:8}}><Text style={{color:c.danger}}>{t('branchConflictShort')}</Text>{conflictRecords.map(r=><View key={r.entry.id} style={s.row}><Text style={{fontSize:20}}>{r.habit.isGeneral?(r.path[r.path.length-2]??r.habit).emoji:r.habit.emoji}</Text><Text style={{color:c.text,flex:1}}>{label(r.path)}</Text><Text style={{color:c.text}}>{formatValue(habit.type,entries.find(e=>e.habitId===r.entry.habitId&&e.localDate===target)!.value)}</Text></View>)}</View>}
        {habit.type!=='boolean'&&!records.some(record=>record.direct)&&<Pressable disabled={saving||changed} accessibilityRole="button" onPress={()=>setDirectEditor(calendarDraft(habit,date,calendarEntry(habit,habits,entries,date)?.value??null))} style={[s.smallAction,{opacity:changed?.5:1}]}><Ionicons name="add-outline" size={18} color={c.accent}/><Text style={{color:c.accent}}>{t('branchDirectShort')}</Text></Pressable>}
        <View style={s.actions}><Pressable disabled={saving} accessibilityRole="button" onPress={close} style={[s.button,{backgroundColor:c.soft}]}><Text style={{color:c.text}}>{t('cancel')}</Text></Pressable><Pressable disabled={disabled} accessibilityRole="button" accessibilityState={{busy:saving,disabled}} onPress={()=>void save()} style={[s.button,{backgroundColor:c.accent,opacity:disabled?.5:1}]}><Text style={{color:'white'}}>{t('save')}</Text></Pressable></View>
      </ScrollView>
    </Pressable></Pressable>
    </KeyboardAvoidingView>}
  </Modal>;
}
const s=StyleSheet.create({overlay:{flex:1,backgroundColor:'#0008',justifyContent:'center',alignItems:'center',padding:20},sheet:{width:'100%',maxWidth:480,maxHeight:'90%',borderRadius:22},content:{padding:20,gap:14},title:{fontSize:20,fontWeight:'800'},preview:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',padding:12,borderRadius:14},previewValue:{fontSize:22,fontWeight:'700',textAlign:'center',marginTop:4},smallAction:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingHorizontal:10},record:{borderBottomWidth:StyleSheet.hairlineWidth,paddingVertical:8,gap:8},row:{flexDirection:'row',alignItems:'center',gap:12},path:{flex:1},actions:{flexDirection:'row',flexWrap:'wrap',justifyContent:'flex-end',gap:12},button:{minHeight:48,paddingHorizontal:18,paddingVertical:12,borderRadius:14,justifyContent:'center',alignItems:'center'},input:{borderWidth:1,borderRadius:12,padding:12,fontSize:18}});
