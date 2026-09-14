import { Ionicons } from '@expo/vector-icons';
import { router,usePathname } from 'expo-router';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';

const destinations=[
  {key:'home',href:'/(tabs)',icon:'checkmark-circle-outline'},
  {key:'calendar',href:'/(tabs)/calendar',icon:'calendar-outline'},
  {key:'insights',href:'/(tabs)/insights',icon:'stats-chart-outline'},
  {key:'settings',href:'/(tabs)/settings',icon:'settings-outline'},
] as const;

export function AppBar(){
  const {palette:c}=useApp(),insets=useSafeAreaInsets(),path=usePathname();
  const active=path.startsWith('/insight')?'insights':path.startsWith('/calendar')?'calendar':path.startsWith('/settings')?'settings':'home';
  return <View style={[s.bar,{backgroundColor:c.card,borderTopColor:c.line,paddingBottom:insets.bottom}]}>
    {destinations.map(item=>{const selected=active===item.key,color=selected?c.accent:c.muted;return <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={t(item.key)} accessibilityState={{selected}} onPress={()=>path.startsWith('/insight/')||path.startsWith('/habit/')?router.dismissTo(item.href):router.navigate(item.href)} style={({pressed})=>[s.tab,{backgroundColor:pressed?c.soft:'transparent'}]}>
      <Ionicons name={item.icon} size={25} color={color}/>
      <Text style={[s.label,{color}]}>{t(item.key)}</Text>
    </Pressable>})}
  </View>;
}

const s=StyleSheet.create({bar:{flexDirection:'row',borderTopWidth:StyleSheet.hairlineWidth},tab:{flex:1,minHeight:49,paddingVertical:4,alignItems:'center',justifyContent:'center',gap:2},label:{fontSize:10,fontWeight:'500'}});
