import { Pressable,StyleSheet,View } from 'react-native';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';

export function SheetHandle({onClose,disabled=false}:{onClose:()=>void;disabled?:boolean}){
  const {palette:c}=useApp();
  return <Pressable accessibilityRole="button" accessibilityLabel={t('close')} accessibilityState={{disabled}} disabled={disabled} onPress={onClose} style={({pressed})=>[s.target,{opacity:pressed?0.5:1}]}><View style={[s.line,{backgroundColor:c.muted}]}/></Pressable>;
}
const s=StyleSheet.create({target:{minHeight:44,alignItems:'center',justifyContent:'center'},line:{width:36,height:5,borderRadius:3}});
