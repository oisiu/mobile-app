import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { TouchableOpacity,View,type GestureResponderEvent } from 'react-native';
import { settingsStyles as s } from './settingsStyles';

type Props={
  icon:ComponentProps<typeof Ionicons>['name'];label:string;onPress:(event?:GestureResponderEvent)=>void;
  color:string;external?:boolean;disabled?:boolean;
};
export function SettingsAction({icon,label,onPress,color,external=false,disabled=false}:Props){
  return <TouchableOpacity accessibilityRole={external?'link':'button'} accessibilityHint={external?t('opensBrowser'):undefined}
    onPress={onPress} disabled={disabled} accessibilityState={{disabled}} style={[s.action,{opacity:disabled?.5:1}]}>
    <View style={s.actionLabel}>
      <Ionicons name={icon} size={20} color={color}/>
      <Text style={{color,fontSize:16,flexShrink:1}}>{label}</Text>
    </View>
    <Ionicons name={external?'open-outline':'chevron-forward'} size={18} color={color}/>
  </TouchableOpacity>;
}
