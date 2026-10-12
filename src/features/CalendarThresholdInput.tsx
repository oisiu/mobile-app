import React,{useState} from 'react';
import { Text,TextInput,TouchableOpacity,View } from 'react-native';
import { HabitType } from '@/domain/types';
import { light,dark } from '@/theme';
import { t } from '@/i18n';

export function CalendarThresholdInput({type,value,onChange,c,name}:{type:HabitType;value:number|null;onChange:(value:number|null)=>void;c:typeof light|typeof dark;name:string}){
  const [unit,setUnit]=useState<'minutes'|'hours'>('minutes');
  const factor=type==='duration'?(unit==='hours'?3600:60):1;
  const [text,setText]=useState(()=>value==null?'':String(value/(type==='duration'?60:1)));
  if(type==='boolean')return null;
  const change=(text:string)=>{setText(text);const amount=Number(text.replace(',','.'));onChange(text.trim()===''?null:type==='duration'?Math.round(amount*factor):amount)};
  return <View style={{marginTop:12,padding:12,borderRadius:14,backgroundColor:c.card}}>
    <Text style={{color:c.text,fontWeight:'600'}}>{t('calendarThreshold')}</Text>
    <Text style={{color:c.muted,fontSize:12,marginTop:4}}>{t('calendarThresholdHelp')}</Text>
    <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:8}}>
      <TextInput accessibilityLabel={t('calendarThresholdFor',{name})} value={text} onChangeText={change} placeholder={t('optional')} placeholderTextColor={c.muted} keyboardType="decimal-pad" style={{flex:1,minHeight:44,paddingHorizontal:12,borderRadius:10,backgroundColor:c.soft,color:c.text}}/>
      {type==='duration'&&(['minutes','hours'] as const).map(option=><TouchableOpacity key={option} accessibilityRole="radio" accessibilityLabel={t(option)} accessibilityState={{selected:unit===option}} onPress={()=>{setUnit(option);if(value!=null&&Number.isFinite(value))setText(String(value/(option==='hours'?3600:60)))}} style={{minHeight:44,paddingHorizontal:8,justifyContent:'center',borderRadius:10,backgroundColor:unit===option?c.soft:'transparent'}}><Text style={{color:c.text,fontSize:12}}>{t(option)}</Text></TouchableOpacity>)}
    </View>
  </View>;
}
