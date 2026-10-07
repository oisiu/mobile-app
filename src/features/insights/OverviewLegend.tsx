import React from 'react';
import { Text,TouchableOpacity,View } from 'react-native';
import { Habit } from '@/domain/types';
import { light } from '@/theme';
import { t } from '@/i18n';

export function OverviewLegend({items,highlightedId,onHighlight,c}:{items:{habit:Habit;color:string}[];highlightedId:string|null;onHighlight:(id:string|null)=>void;c:typeof light}){
  return <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8,marginVertical:12}}>{items.map(item=>{
    const selected=highlightedId===item.habit.id;
    return <TouchableOpacity key={item.habit.id} accessibilityRole="button" accessibilityLabel={item.habit.name} accessibilityHint={t('highlightCategoryHint')} accessibilityState={{selected}} onPress={()=>onHighlight(selected?null:item.habit.id)} style={{flexDirection:'row',alignItems:'center',gap:6,minHeight:44,paddingHorizontal:10,borderRadius:12,backgroundColor:selected?c.soft:'transparent',maxWidth:'100%'}}><View accessible={false} style={{width:10,height:10,borderRadius:5,backgroundColor:item.color}}/><Text style={{color:selected?c.text:c.muted,fontSize:13,fontWeight:selected?'700':'400',flexShrink:1}}>{item.habit.name}</Text></TouchableOpacity>;
  })}</View>;
}
