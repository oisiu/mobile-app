import React,{useState} from 'react';
import { Modal,Pressable,ScrollView,Text,TouchableOpacity,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetHandle } from '../SheetHandle';
import { Habit } from '@/domain/types';
import { light } from '@/theme';
import { t } from '@/i18n';

export function PieCategoryFilter({roots,selected,onChange,c}:{roots:{habit:Habit;color:string}[];selected:Habit[];onChange:(ids:Set<string>|null)=>void;c:typeof light}){
  const [open,setOpen]=useState(false),insets=useSafeAreaInsets(),close=()=>setOpen(false);
  const toggle=(id:string)=>{const next=new Set(selected.map(habit=>habit.id));if(next.has(id)){if(next.size===1)return;next.delete(id)}else next.add(id);onChange(next)};
  const label=t('selectMultiple')+' '+t('habitContribution');
  return <>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingTop:12}}>
      <Text accessibilityRole="header" style={{flexShrink:1,color:c.text,fontSize:18,fontWeight:'700'}}>{t('habitContribution')}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{expanded:open,disabled:!roots.length}} disabled={!roots.length} onPress={()=>setOpen(true)} style={{minHeight:44,borderRadius:14,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:c.soft}}><Text style={{color:c.text}}>{selected.length} {t('selected')}</Text><Ionicons name="options-outline" size={18} color={c.text}/></TouchableOpacity>
    </View>
    <Modal transparent visible={open} animationType="slide" onRequestClose={close}>
      <Pressable onPress={close} style={{flex:1,backgroundColor:'#0008',justifyContent:'flex-end'}}><Pressable accessibilityViewIsModal onAccessibilityEscape={close} onPress={()=>undefined} style={{maxHeight:'80%',backgroundColor:c.card,borderTopLeftRadius:24,borderTopRightRadius:24,paddingHorizontal:20,paddingBottom:24+insets.bottom}}>
        <SheetHandle onClose={close}/>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}><Text accessibilityRole="header" style={{flexShrink:1,fontSize:20,fontWeight:'700',color:c.text}}>{t('selectMultiple')}</Text><TouchableOpacity accessibilityRole="button" onPress={()=>onChange(null)} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:c.accent}}>{t('allCategories')}</Text></TouchableOpacity></View>
        <Text style={{color:c.muted,marginBottom:12}}>{t('pieFilterHint')}</Text>
        <ScrollView>{roots.map(({habit,color})=>{const checked=selected.some(item=>item.id===habit.id);return <TouchableOpacity key={habit.id} accessibilityRole="checkbox" accessibilityLabel={habit.name} accessibilityState={{checked}} onPress={()=>toggle(habit.id)} style={{minHeight:56,flexDirection:'row',alignItems:'center',gap:10}}><View style={{width:9,height:9,borderRadius:5,backgroundColor:color}}/><Text style={{flex:1,color:c.text,fontSize:16}}>{habit.emoji} {habit.name}</Text><Ionicons name={checked?'checkbox':'square-outline'} size={24} color={c.accent}/></TouchableOpacity>})}</ScrollView>
      </Pressable></Pressable>
    </Modal>
  </>;
}
