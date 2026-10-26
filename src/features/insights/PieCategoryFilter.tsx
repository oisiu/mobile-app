import { Text } from '@/theme/Typography';
import { openPopover,PopoverAnchor } from '../AnchoredPopover';
import React,{useState} from 'react';
import { ScrollView,TouchableOpacity,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SelectionPopover } from '../SelectionPopover';
import { Habit } from '@/domain/types';
import { light } from '@/theme';
import { t } from '@/i18n';

export function PieCategoryFilter({roots,selected,onChange,c}:{roots:{habit:Habit;color:string}[];selected:Habit[];onChange:(ids:Set<string>|null)=>void;c:typeof light}){
  const [popoverAnchor,setPopoverAnchor]=useState<PopoverAnchor|null>(null);
  const [open,setOpen]=useState(false),close=()=>setOpen(false);
  const toggle=(id:string)=>{const next=new Set(selected.map(habit=>habit.id));if(next.has(id)){if(next.size===1)return;next.delete(id)}else next.add(id);onChange(next)};
  const label=t('selectMultiple')+' '+t('habitContribution');
  return <>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingTop:12}}>
      <Text accessibilityRole="header" style={{flexShrink:1,color:c.text,fontSize:18,fontWeight:'700'}}>{t('habitContribution')}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{expanded:open,disabled:!roots.length}} disabled={!roots.length} onPress={event=>openPopover(event,anchor=>{setPopoverAnchor(anchor);setOpen(true)})} style={{minHeight:36,borderRadius:15,paddingHorizontal:11,justifyContent:'center',backgroundColor:c.soft}}><Text style={{color:c.accent,fontSize:12,fontWeight:'700'}}>{selected.length} {t('selected')}</Text></TouchableOpacity>
    </View>
    <SelectionPopover visible={open} onClose={close} anchor={popoverAnchor} c={c} title={t('selectMultiple')} hint={t('pieFilterHint')} action={<TouchableOpacity accessibilityRole="button" onPress={()=>onChange(null)} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><Text style={{color:c.accent}}>{t('allCategories')}</Text></TouchableOpacity>}>
        <ScrollView>{roots.map(({habit})=>{const checked=selected.some(item=>item.id===habit.id);return <TouchableOpacity key={habit.id} accessibilityRole="checkbox" accessibilityLabel={habit.name} accessibilityState={{checked}} onPress={()=>toggle(habit.id)} style={{minHeight:54,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,borderBottomWidth:0.5,borderBottomColor:c.line}}><Text style={{flex:1,color:c.text,fontSize:16}}>{habit.emoji} {habit.name}</Text><Ionicons name={checked?'checkbox':'square-outline'} size={23} color={c.accent}/></TouchableOpacity>})}</ScrollView>
    </SelectionPopover>
  </>;
}
