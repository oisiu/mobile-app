import React,{useMemo,useState} from 'react';
import { Modal,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,View } from 'react-native';
import { attachmentCandidates } from '@/domain/treeAttachments';
import { buildTree } from '@/domain/tree';
import { Habit,HabitNode } from '@/domain/types';
import { t } from '@/i18n';
import { dark,light } from '@/theme';

export function MoveHabitPicker({habits,type,excluded,parentName,parentPath,onSelect,c}:{habits:Habit[];type:Habit['type'];excluded:Set<string>;parentName:string;parentPath?:string;onSelect:(habit:HabitNode)=>void;c:typeof light|typeof dark}){
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[selected,setSelected]=useState<string|null>(null);
  const labelName=parentName.trim()||t('newCategory'),destination=parentPath||labelName;
  const candidates=useMemo(()=>open?attachmentCandidates(habits,type,excluded):[],[open,habits,type,excluded]);
  const path=(habit:Habit):string=>{const parent=habits.find(h=>h.id===habit.parentId);return parent?path(parent)+' / '+habit.name:habit.name};
  const chosen=candidates.find(h=>h.id===selected);
  const matches=candidates.filter(h=>path(h).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const close=()=>{setOpen(false);setSelected(null);setQuery('')};
  const confirm=()=>{
    if(!chosen)return;
    const find=(nodes:HabitNode[]):HabitNode|undefined=>{for(const node of nodes){if(node.id===chosen.id)return node;const child=find(node.children);if(child)return child}};
    const node=find(buildTree(habits));
    if(node){onSelect(node);close()}
  };
  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('addExistingTo',{name:labelName})} accessibilityHint={t('moveHabitHereHint')} onPress={()=>setOpen(true)} style={[s.trigger,{backgroundColor:c.card,borderColor:c.line}]}><Text style={{color:c.accent,fontSize:20}}>↳</Text><Text style={{color:c.accent,fontSize:10,textAlign:'center'}}>{t('moveHereShort')}</Text></TouchableOpacity>
    {open&&<Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View accessibilityViewIsModal onAccessibilityEscape={close} style={[s.sheet,{backgroundColor:c.bg}]}>
        <View style={s.header}><Text accessibilityRole="header" style={[s.title,{color:c.text}]}>{t('moveHabitHere')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('close')} onPress={close} style={s.close}><Text style={{color:c.accent,fontSize:17}}>{t('close')}</Text></TouchableOpacity></View>
        <Text style={[s.destination,{color:c.text}]}>{t('moveDestination',{name:destination})}</Text>
        <Text style={[s.help,{color:c.muted}]}>{t('chooseHabitToMove')}</Text>
        {!chosen&&<TextInput accessibilityLabel={t('searchHabits')} placeholder={t('searchHabits')} placeholderTextColor={c.muted} value={query} onChangeText={setQuery} autoCorrect={false} style={[s.search,{backgroundColor:c.card,color:c.text,borderColor:c.line}]}/>}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.list}>
          {!chosen&&!matches.length&&<Text style={[s.help,{color:c.muted}]}>{t(candidates.length?'noMatchingHabits':'noCompatibleCategories')}</Text>}
          {!chosen&&matches.map(habit=><TouchableOpacity key={habit.id} accessibilityRole="button" accessibilityLabel={t('selectExistingCategory',{name:path(habit)})} onPress={()=>setSelected(habit.id)} style={[s.option,{backgroundColor:c.card,borderColor:c.line}]}><Text style={s.emoji}>{habit.emoji}</Text><View style={{flex:1}}><Text style={[s.name,{color:c.text}]}>{habit.name}</Text><Text style={{color:c.muted,fontSize:12,marginTop:4}}>{path(habit)}</Text></View><Text style={{color:c.accent,fontSize:20}}>›</Text></TouchableOpacity>)}
          {chosen&&<View style={[s.preview,{backgroundColor:c.card,borderColor:c.line}]}><Text style={[s.name,{color:c.text}]}>{t('movePreview')}</Text><Text style={[s.path,{color:c.muted}]}>{path(chosen)}</Text><Text style={{color:c.accent,fontSize:20}}>↓</Text><Text style={[s.path,{color:c.text}]}>{destination} / {chosen.name}</Text><Text style={[s.help,{color:c.muted}]}>{t('moveHabitSaveHelp')}</Text></View>}
          {chosen&&<TouchableOpacity accessibilityRole="button" onPress={()=>setSelected(null)} style={s.close}><Text style={{color:c.accent,fontSize:16}}>{t('chooseAnotherHabit')}</Text></TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" accessibilityState={{disabled:!chosen}} disabled={!chosen} onPress={confirm} style={[s.confirm,{backgroundColor:c.accent,opacity:chosen?1:0.45}]}><Text style={{color:c.onAccent,fontWeight:'700',fontSize:16}}>{t('confirmCategoryMove')}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={close} style={s.close}><Text style={{color:c.accent,fontSize:16}}>{t('cancel')}</Text></TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>}
  </>;
}

const s=StyleSheet.create({trigger:{width:44,minHeight:48,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center'},sheet:{flex:1,padding:24,paddingTop:48},header:{flexDirection:'row',alignItems:'center',gap:12},title:{flex:1,fontSize:24,fontWeight:'700'},close:{minHeight:44,alignItems:'center',justifyContent:'center'},destination:{fontSize:18,fontWeight:'600',marginTop:16},help:{fontSize:14,lineHeight:21,marginVertical:12},search:{minHeight:48,borderWidth:1,borderRadius:12,paddingHorizontal:14,marginVertical:8,fontSize:16},list:{paddingBottom:32,gap:10},option:{flexDirection:'row',alignItems:'center',gap:12,padding:14,borderRadius:14,borderWidth:1,minHeight:64},emoji:{fontSize:24},name:{fontSize:16,fontWeight:'600'},preview:{padding:16,borderRadius:14,borderWidth:1,marginTop:8},path:{fontSize:16,lineHeight:23,marginTop:8},confirm:{minHeight:48,borderRadius:14,alignItems:'center',justifyContent:'center',marginTop:8}});
