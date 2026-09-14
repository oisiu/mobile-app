import { Pressable,StyleSheet,View } from 'react-native';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';

export function SheetHandle({onClose,disabled=false}:{onClose:()=>void;disabled?:boolean}){
  const {palette:c}=useApp();
  return <Pressable accessibilityRole="button" accessibilityLabel={t('close')} accessibilityState={{disabled}} disabled={disabled} onPress={onClose} style={s.target}><View style={[s.line,{backgroundColor:c.muted}]}/></Pressable>;
}
const s=StyleSheet.create({target:{height:44,alignItems:'center',justifyContent:'center'},line:{width:42,height:5,borderRadius:3}});
