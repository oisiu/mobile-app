import React,{useState} from 'react';
import { StyleSheet,TouchableOpacity,View } from 'react-native';
import { HabitColor,habitColors } from '@/domain/habitAppearance';
import { habitColorPalette } from '@/theme/habitColors';
import { light,dark } from '@/theme';
import { t } from '@/i18n';

export function HabitColorPicker({value,onChange,c,children}:{value:HabitColor|null;onChange:(value:HabitColor|null)=>void;c:typeof light|typeof dark;children?:(button:React.ReactNode)=>React.ReactNode}){
  const [expanded,setExpanded]=useState(false),selectedLabel=t(value??'automaticColor');
  const button=<TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t('habitColor')}: ${selectedLabel}`} accessibilityState={{expanded}} onPress={()=>setExpanded(current=>!current)} style={[s.trigger,{backgroundColor:c.card,borderColor:expanded?c.text:c.line}]}><View style={[s.swatch,{backgroundColor:value?habitColorPalette[value]:c.soft}]}/></TouchableOpacity>;
  return <View style={s.container}>{children?children(button):button}{expanded&&<View style={s.options}>{([null,...habitColors] as const).map(color=><TouchableOpacity key={color??'automatic'} accessibilityRole="radio" accessibilityState={{checked:value===color}} accessibilityLabel={t(color??'automaticColor')} onPress={()=>{onChange(color);setExpanded(false)}} style={[s.option,{borderColor:value===color?c.text:c.line,borderWidth:value===color?2:1}]}><View style={[s.swatch,{backgroundColor:color?habitColorPalette[color]:c.soft}]}/></TouchableOpacity>)}</View>}</View>;
}
const s=StyleSheet.create({container:{gap:8,marginBottom:12},trigger:{width:48,minHeight:48,borderWidth:1,borderRadius:12,flexDirection:'row',alignItems:'center',justifyContent:'center',alignSelf:'stretch'},options:{flexDirection:'row',flexWrap:'wrap',gap:8},option:{width:48,minHeight:48,padding:8,borderRadius:12,alignItems:'center',justifyContent:'center'},swatch:{width:22,height:22,borderRadius:11}});
