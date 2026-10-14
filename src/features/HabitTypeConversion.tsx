import React from 'react';
import { Text,TextInput,TouchableOpacity,View } from 'react-native';
import { HabitType } from '@/domain/types';
import { typeChangeTargets } from '@/domain/habitTypeChange';
import { CalendarDraft,changeCalendarUnit } from '@/features/insights/calendarEntry';
import { light,dark } from '@/theme';
import { t } from '@/i18n';

export function HabitTypeConversion({from,type,onType,draft,onDraft,c,hasHistory}:{from:HabitType;type:HabitType;onType:(type:HabitType)=>void;draft:CalendarDraft;onDraft:(draft:CalendarDraft)=>void;hasHistory:boolean;c:typeof light|typeof dark}){
  return <View style={{marginTop:20}}>
    <Text style={{color:c.muted,fontSize:13,marginBottom:8}}>{t('changeHabitType')}</Text>
    <Text style={{color:c.muted,lineHeight:20,marginBottom:10}}>{t('changeHabitTypeHelp')}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={t('changeHabitType')} style={{gap:8}}>{typeChangeTargets(from).map(option=><TouchableOpacity key={option} accessibilityRole="radio" accessibilityLabel={t(option)} accessibilityState={{selected:type===option}} onPress={()=>onType(option)} style={{minHeight:48,padding:12,borderRadius:14,backgroundColor:type===option?c.accent:c.card}}><Text style={{color:type===option?c.onAccent:c.text,fontWeight:'600'}}>{t(option)}</Text></TouchableOpacity>)}</View>
    {type!==from&&<View style={{marginTop:12,padding:12,borderRadius:14,backgroundColor:c.card}}>
      <Text style={{color:c.text,lineHeight:21}}>{t(!hasHistory?'noHistoryToConvert':type==='boolean'?'historyToBooleanHelp':from==='boolean'?'historyFromBooleanHelp':'historyNumericConversionHelp')}</Text>
      {hasHistory&&type!=='boolean'&&<View style={{marginTop:10}}><Text style={{color:c.text,fontWeight:'600',marginBottom:8}}>{t(from!=='boolean'?'historyUnitDuration':type==='duration'?'historyDuration':'historyQuantity')}</Text><TextInput accessibilityLabel={t(from!=='boolean'?'historyUnitDuration':type==='duration'?'historyDuration':'historyQuantity')} keyboardType="decimal-pad" value={draft.value} onChangeText={value=>onDraft({...draft,value:value.replace(',','.')})} style={{minHeight:48,paddingHorizontal:12,borderRadius:10,color:c.text,backgroundColor:c.soft}}/>{(type==='duration'||from==='duration')&&<View accessibilityRole="radiogroup" accessibilityLabel={t('durationUnit')} style={{flexDirection:'row',gap:8,marginTop:8}}>{(['minutes','hours'] as const).map(unit=><TouchableOpacity key={unit} accessibilityRole="radio" accessibilityLabel={t(unit)} accessibilityState={{selected:draft.unit===unit}} onPress={()=>onDraft(changeCalendarUnit(draft,unit))} style={{minHeight:44,padding:12,borderRadius:10,backgroundColor:draft.unit===unit?c.soft:'transparent'}}><Text style={{color:c.text}}>{t(unit)}</Text></TouchableOpacity>)}</View>}</View>}
    </View>}
  </View>;
}
