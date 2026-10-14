import React,{useRef,useState} from 'react';
import { Alert,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';

export function HiddenCategories({initialOpen=false}:{initialOpen?:boolean}){
  const {habits,repo,refresh,showSuccess,palette:c}=useApp();
  const [open,setOpen]=useState(initialOpen),[saving,setSaving]=useState(false),pending=useRef(false);
  const roots=habits.filter(h=>h.parentId===null&&!h.isGeneral&&!h.archivedAt&&h.isHidden).sort((a,b)=>a.sortOrder-b.sortOrder);
  const restore=async(id:string,name:string)=>{
    if(!repo||pending.current)return;
    pending.current=true;setSaving(true);
    try{await repo.setHidden(id,false);await refresh();showSuccess(t('hiddenCategoryRestored',{name}))}
    catch(error){Alert.alert(t('couldNotSave'),error instanceof Error?error.message:String(error))}
    finally{pending.current=false;setSaving(false)}
  };
  if(!roots.length)return null;
  return <View style={[s.card,{backgroundColor:c.card}]}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('hiddenCategories')} accessibilityState={{expanded:open}} onPress={()=>setOpen(value=>!value)} style={s.row}>
      <Ionicons name="eye-off-outline" size={20} color={c.muted}/><Text style={[s.name,{color:c.text}]}>{t('hiddenCategories')}</Text><Text style={{color:c.muted}}>{roots.length}</Text><Ionicons name={open?'chevron-up':'chevron-down'} size={18} color={c.muted}/>
    </TouchableOpacity>
    {open&&roots.map(h=><View key={h.id} style={[s.row,{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:c.line}]}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('edit')+' '+h.name} onPress={()=>router.push(`/habit/${h.id}`)} style={s.edit}><Text style={{fontSize:20}}>{h.emoji}</Text><Text style={[s.name,{color:c.text}]}>{h.name}</Text><Ionicons name="chevron-forward" size={18} color={c.muted}/></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('restoreHiddenCategory',{name:h.name})} accessibilityState={{disabled:saving||!repo,busy:saving}} disabled={saving||!repo} onPress={()=>void restore(h.id,h.name)} style={s.restore}><Ionicons name="eye-outline" size={22} color={c.accent}/></TouchableOpacity>
    </View>)}
  </View>;
}
const s=StyleSheet.create({card:{marginTop:28,borderRadius:18,overflow:'hidden'},row:{minHeight:58,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:12},name:{flex:1,fontSize:16,fontWeight:'600'},edit:{flex:1,minHeight:58,flexDirection:'row',alignItems:'center',gap:12},restore:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'}});
