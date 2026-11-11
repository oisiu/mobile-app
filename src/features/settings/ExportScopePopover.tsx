import { AnchoredPopover,type PopoverAnchor } from '@/features/AnchoredPopover';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator,ScrollView,TouchableOpacity,View } from 'react-native';
import { settingsStyles as s } from './settingsStyles';
import type { useSettingsData } from './useSettingsData';

type Props={anchor:PopoverAnchor|null;data:ReturnType<typeof useSettingsData>};
export function ExportScopePopover({anchor,data}:Props){
  const {palette:c}=useApp();
  const {exportKind:kind,exportRoots,exportScope,exporting}=data;
  if(!kind)return null;
  const options=[{id:null,name:t('exportAllHabits')},...exportRoots.map(habit=>({
    id:habit.id,name:`${habit.emoji} ${habit.name}${habit.archivedAt?` (${t('exportArchived')})`:''}`,
  }))];
  return <AnchoredPopover visible anchor={anchor} c={c} maxWidth={390} maxHeight={580} onClose={data.closeExport}>
    <Text accessibilityRole="header" style={[s.guideTitle,{color:c.text}]}>{t(kind==='json'?'exportJson':'exportCsv')}</Text>
    <Text style={[s.guideIntro,{color:c.muted}]}>{t('exportScopeHelp')}</Text>
    <ScrollView style={{flexShrink:1}}>
      {options.map(option=>{
        const checked=option.id===null?exportScope===null:exportScope?.includes(option.id)===true;
        return <TouchableOpacity key={option.id===null?'all':`category:${option.id}`} accessibilityRole="checkbox"
          accessibilityLabel={option.name} accessibilityState={{checked,disabled:exporting}} disabled={exporting}
          onPress={()=>data.toggleExportScope(option.id)} style={{minHeight:48,flexDirection:'row',alignItems:'center',gap:12}}>
          <Ionicons name={checked?'checkbox':'square-outline'} size={22} color={c.accent}/>
          <Text style={{color:c.text,fontSize:16,flex:1}}>{option.name}</Text>
        </TouchableOpacity>;
      })}
    </ScrollView>
    <View style={s.guideActions}>
      <TouchableOpacity accessibilityRole="button" disabled={exporting} onPress={data.cancelExport} style={[s.guideButton,{backgroundColor:c.soft}]}>
        <Text style={{color:c.text,fontWeight:'700'}}>{t('cancel')}</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('exportSelected')}
        accessibilityState={{disabled:exporting||exportScope?.length===0,busy:exporting}} disabled={exporting||exportScope?.length===0}
        onPress={()=>void data.share(kind)} style={[s.guideButton,{backgroundColor:c.accent,opacity:exportScope?.length===0?.5:1}]}>
        {exporting?<ActivityIndicator color={c.onAccent}/>:<Text style={{color:c.onAccent,fontWeight:'700'}}>{t('exportSelected')}</Text>}
      </TouchableOpacity>
    </View>
  </AnchoredPopover>;
}
