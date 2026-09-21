import { Ionicons } from '@expo/vector-icons';
import { router,usePathname } from 'expo-router';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';

const destinations=[
  {key:'home',href:'/(tabs)',icon:'checkmark-circle-outline',activeIcon:'checkmark-circle'},
  {key:'calendar',href:'/(tabs)/calendar',icon:'calendar-outline',activeIcon:'calendar'},
  {key:'insights',href:'/(tabs)/insights',icon:'stats-chart-outline',activeIcon:'stats-chart'},
  {key:'settings',href:'/(tabs)/settings',icon:'settings-outline',activeIcon:'settings'},
] as const;

export function AppBar(){
  const {palette:c}=useApp(),insets=useSafeAreaInsets(),path=usePathname();
  const active=path.startsWith('/insight')?'insights':path.startsWith('/calendar')?'calendar':path.startsWith('/settings')?'settings':'home';
  return <View style={[s.bar,{backgroundColor:c.card,borderTopColor:c.line,paddingBottom:Math.max(insets.bottom,8)}]}>
    {destinations.map(item=>{const selected=active===item.key,color=selected?c.accent:c.muted;return <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={t(item.key)} accessibilityState={{selected}} onPress={()=>path.startsWith('/insight/')||path.startsWith('/habit/')?router.dismissTo(item.href):router.navigate(item.href)} style={({pressed})=>[s.tab,{opacity:pressed?0.55:1}]}>
      <View style={[s.icon,{backgroundColor:selected?c.soft:'transparent'}]}><Ionicons name={selected?item.activeIcon:item.icon} size={23} color={color}/></View>
      <Text style={[s.label,{color}]}>{t(item.key)}</Text>
    </Pressable>})}
  </View>;
}

const s=StyleSheet.create({bar:{flexDirection:'row',borderTopWidth:StyleSheet.hairlineWidth,paddingTop:6,paddingHorizontal:8},tab:{flex:1,minHeight:54,paddingVertical:4,alignItems:'center',justifyContent:'center',gap:2},icon:{minWidth:52,height:30,borderRadius:15,alignItems:'center',justifyContent:'center'},label:{fontSize:11,fontWeight:'600',letterSpacing:0.1,textAlign:'center'}});
