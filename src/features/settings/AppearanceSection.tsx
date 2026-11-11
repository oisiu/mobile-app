import { useApp,type ThemeMode } from '@/features/AppProvider';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { TouchableOpacity,View } from 'react-native';
import { settingsStyles as s } from './settingsStyles';

const modes:ThemeMode[]=['system','light','dark'];
const modeIcons:Record<ThemeMode,ComponentProps<typeof Ionicons>['name']>={
  system:'phone-portrait-outline',light:'sunny-outline',dark:'moon-outline',
};
export function AppearanceSection(){
  const {palette:c,themeMode,setThemeMode}=useApp();
  return <>
    <Text accessibilityRole="header" style={[s.sectionTitle,{color:c.text}]}>{t('appearance')}</Text>
    <View accessibilityRole="radiogroup" style={[s.modes,{backgroundColor:c.line}]}>
      {modes.map(mode=>{
        const selected=themeMode===mode;
        return <TouchableOpacity accessibilityRole="radio" accessibilityLabel={t(mode)} accessibilityState={{selected}} key={mode}
          onPress={()=>void setThemeMode(mode)} style={[s.mode,selected&&{backgroundColor:c.card}]}>
          <Ionicons name={modeIcons[mode]} size={20} color={selected?c.accent:c.muted}/>
          <Text style={{color:selected?c.text:c.muted,fontSize:13,fontWeight:'600',textAlign:'center'}}>{t(mode)}</Text>
        </TouchableOpacity>;
      })}
    </View>
  </>;
}
