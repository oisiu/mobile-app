import React,{useState} from 'react';
import { Alert,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';
import { useHabitMutation } from '@/features/useHabitMutation';
import { depthBackground } from '@/theme';

export function HiddenCategories({initialOpen=false,variant='card'}:{initialOpen?:boolean;variant?:'card'|'list'}){
  const {habits,repo,refresh,showSuccess,palette:c}=useApp();
  const [open,setOpen]=useState(initialOpen),mutation=useHabitMutation(refresh,t('hiddenCategoryRefreshHelp')),saving=mutation.busy;
  const roots=habits.filter(h=>h.parentId===null&&!h.isGeneral&&!h.archivedAt&&h.isHidden).sort((a,b)=>a.sortOrder-b.sortOrder);
  const restore=async(id:string,name:string)=>{
    if(!repo)return;
    try{await mutation.run(()=>repo.setHidden(id,false),()=>showSuccess(t('hiddenCategoryRestored',{name})))}
    catch(error){Alert.alert(t('couldNotSave'),error instanceof Error?error.message:String(error))}
  };
  if(!roots.length)return null;
  const list=variant==='list';
  return <View style={[list?s.list:s.card,{backgroundColor:c.card}]}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('hiddenCategories')} accessibilityState={{expanded:open}} onPress={()=>setOpen(value=>!value)} style={[s.row,list&&s.listRow]}>
      <Ionicons name="eye-off-outline" size={20} color={c.muted}/><Text style={[s.name,list&&s.listName,{color:c.text}]}>{t('hiddenCategories')}</Text><Text style={{color:c.muted}}>{roots.length}</Text><Ionicons name={open?'chevron-up':'chevron-down'} size={18} color={c.muted}/>
    </TouchableOpacity>
    {open&&!list&&<Text style={{color:c.muted,fontSize:13,lineHeight:19,paddingHorizontal:16,paddingBottom:12}}>{t('restoreHiddenCategoryHelp')}</Text>}
    {mutation.needsRefresh&&<TouchableOpacity accessibilityRole="button" accessibilityLabel={t('retry')} disabled={saving} accessibilityState={{disabled:saving,busy:saving}} onPress={()=>void mutation.retry()} style={s.row}><Text style={{color:c.accent}}>{t('retry')}</Text></TouchableOpacity>}
    {open&&roots.map(h=><View key={h.id} style={[s.row,list&&s.listChild,{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:c.line,...(list?{backgroundColor:depthBackground(c.card,c.soft,1)}:{})}]}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('edit')+' '+h.name} disabled={saving||mutation.needsRefresh} accessibilityState={{disabled:saving||mutation.needsRefresh}} onPress={()=>router.push(`/habit/${h.id}`)} style={[s.edit,list&&s.listEdit]}><Text style={{fontSize:list?18:20}}>{h.emoji}</Text><Text style={[s.name,list&&s.listName,{color:c.text}]}>{h.name}</Text><Ionicons name="chevron-forward" size={18} color={c.muted}/></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('restoreHiddenCategory',{name:h.name})} accessibilityHint={t('restoreHiddenCategoryHelp')} accessibilityState={{disabled:saving||!repo||mutation.needsRefresh,busy:saving}} disabled={saving||!repo||mutation.needsRefresh} onPress={()=>void restore(h.id,h.name)} style={s.restore}><Ionicons name="eye-outline" size={22} color={c.accent}/></TouchableOpacity>
    </View>)}
  </View>;
}
const s=StyleSheet.create({list:{marginTop:0,borderRadius:0},listRow:{minHeight:52,paddingHorizontal:20},listChild:{minHeight:52,paddingLeft:32,paddingRight:20},listEdit:{minHeight:52},listName:{fontSize:13},card:{marginTop:28,borderRadius:18,overflow:'hidden'},row:{minHeight:58,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:12},name:{flex:1,fontSize:16,fontWeight:'600'},edit:{flex:1,minHeight:58,flexDirection:'row',alignItems:'center',gap:12},restore:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'}});
