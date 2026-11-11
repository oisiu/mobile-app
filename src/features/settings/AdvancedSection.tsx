import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator,TouchableOpacity,View } from 'react-native';
import { settingsStyles as s } from './settingsStyles';

export function AdvancedSection({deleting,disabled,onDelete}:{deleting:boolean;disabled:boolean;onDelete:()=>void}){
  const {palette:c}=useApp();
  const [expanded,setExpanded]=useState(false);
  return <View style={[s.advanced,{backgroundColor:c.card}]}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('advancedSettings')} accessibilityState={{expanded}}
      onPress={()=>setExpanded(value=>!value)} style={s.action}>
      <View style={s.actionLabel}>
        <Ionicons name="options-outline" size={20} color={c.muted}/>
        <Text style={{color:c.text,fontSize:16,fontWeight:'600',flexShrink:1}}>{t('advancedSettings')}</Text>
      </View>
      <Ionicons name={expanded?'chevron-up':'chevron-down'} size={18} color={c.muted}/>
    </TouchableOpacity>
    {expanded&&<View style={s.advancedContent}>
      <Text style={[s.intro,{color:c.muted}]}>{t('advancedSettingsHelp')}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{disabled,busy:deleting}} disabled={disabled}
        accessibilityLabel={t('deleteAllData')} onPress={onDelete} style={[s.deleteData,{borderColor:c.danger,opacity:deleting?.5:1}]}>
        {deleting?<ActivityIndicator color={c.danger}/>:<Ionicons name="trash-outline" size={16} color={c.danger}/>}
        <Text style={{color:c.danger,fontSize:14,fontWeight:'600',flexShrink:1}}>{t('deleteAllData')}</Text>
      </TouchableOpacity>
    </View>}
  </View>;
}
