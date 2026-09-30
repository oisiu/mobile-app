import React from 'react';
import { StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import { HabitColor,habitColors } from '@/domain/habitAppearance';
import { habitColorPalette } from '@/theme/habitColors';
import { light,dark } from '@/theme';
import { t } from '@/i18n';

export function HabitColorPicker({value,onChange,c}:{value:HabitColor|null;onChange:(value:HabitColor|null)=>void;c:typeof light|typeof dark}){
  return <View style={s.container}><Text style={{color:c.muted}}>{t('habitColor')}</Text><View style={s.options}>{([null,...habitColors] as const).map(color=><TouchableOpacity key={color??'automatic'} accessibilityRole="radio" accessibilityState={{checked:value===color}} accessibilityLabel={t(color??'automaticColor')} onPress={()=>onChange(color)} style={[s.option,{borderColor:value===color?c.text:c.line,borderWidth:value===color?2:1}]}><View style={[s.swatch,{backgroundColor:color?habitColorPalette[color]:c.soft}]}/><Text style={{color:c.text,fontSize:12}}>{t(color??'automaticColor')}</Text></TouchableOpacity>)}</View></View>;
}
const s=StyleSheet.create({container:{gap:8,marginVertical:12},options:{flexDirection:'row',flexWrap:'wrap',gap:8},option:{minWidth:64,minHeight:64,padding:8,borderRadius:12,alignItems:'center',justifyContent:'center',gap:5},swatch:{width:22,height:22,borderRadius:11}});
