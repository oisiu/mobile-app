import React,{useState} from 'react';
import { Pressable,Text,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays,addMonths } from '../../utils/dates';
import { todayLocal } from '../../domain/entries';
import { t } from '../../i18n';
import { light } from '../../theme';

export function BranchDatePicker({date,onSelect,c,disabled=false}:{disabled?:boolean;date:string;onSelect:(date:string)=>void;c:typeof light}){
  const [month,setMonth]=useState(date.slice(0,7)),today=todayLocal();
  const first=`${month}-01`,offset=(new Date(`${first}T12:00:00`).getDay()+6)%7;
  const days=Array.from({length:42},(_,i)=>addDays(first,i-offset));
  const format=(date:string,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat(undefined,options).format(new Date(`${date}T12:00:00`));
  return <View style={{gap:8}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('previousMonth')} disabled={disabled} onPress={()=>setMonth(addMonths(month,-1))} style={{padding:12}}><Ionicons name="chevron-back" color={c.text} size={20}/></Pressable>
    <Text style={{color:c.text,fontWeight:'700'}}>{format(first,{month:'long',year:'numeric'})}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={t('nextMonth')} disabled={disabled||month>=today.slice(0,7)} onPress={()=>setMonth(addMonths(month,1))} style={{padding:12,opacity:month>=today.slice(0,7)?.3:1}}><Ionicons name="chevron-forward" color={c.text} size={20}/></Pressable>
  </View><View style={{flexDirection:'row'}}>{days.slice(0,7).map(day=><Text key={day} style={{width:'14.2857%',textAlign:'center',color:c.muted,fontSize:11}}>{format(day,{weekday:'narrow'})}</Text>)}</View>
    <View style={{flexDirection:'row',flexWrap:'wrap'}}>{days.map(day=>{const unavailable=disabled||day>today||!day.startsWith(month),selected=day===date;return <Pressable key={day} accessibilityRole="button" accessibilityLabel={format(day,{dateStyle:'full'})} accessibilityState={{selected,disabled:unavailable}} disabled={unavailable} onPress={()=>onSelect(day)} style={{width:'14.2857%',minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:selected?c.accent:'transparent',opacity:unavailable?.2:1}}><Text style={{color:selected?'white':c.text}}>{Number(day.slice(-2))}</Text></Pressable>})}</View>
  </View>;
}
