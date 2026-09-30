import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { ActivityIndicator,Image,Pressable,StyleSheet,Text,View } from 'react-native';
import { t } from '@/i18n';
import { AppBar } from '@/features/AppBar';
import { AppProvider,SuccessToast,useApp } from '@/features/AppProvider';

void SplashScreen.preventAutoHideAsync();

function Shell(){
  const insets=useSafeAreaInsets();
  const {ready,error,retryStartup,themeReady,resolvedTheme,palette:c}=useApp();
  useEffect(()=>{if(themeReady)void SystemUI.setBackgroundColorAsync(c.bg)},[themeReady,c.bg]);
  if(!themeReady)return null;
  return <View style={[s.root,{backgroundColor:c.bg,paddingTop:insets.top,paddingLeft:insets.left,paddingRight:insets.right}]} onLayout={()=>SplashScreen.hide()}>
    <StatusBar style={resolvedTheme==='dark'?'light':'dark'}/>
    {error?<View style={s.loading}><Text accessibilityRole="alert" style={[s.errorTitle,{color:c.text}]}>{t('startupFailed')}</Text><Text style={[s.errorHelp,{color:c.text}]}>{t('startupFailedHelp')}</Text><Pressable accessibilityRole="button" onPress={()=>void retryStartup()} style={[s.retry,{backgroundColor:c.accent}]}><Text style={[s.retryText,{color:c.onAccent}]}>{t('retry')}</Text></Pressable></View>:ready?<><Stack screenOptions={{headerShown:false,animation:'slide_from_right',contentStyle:{backgroundColor:c.bg}}}/><AppBar/><SuccessToast/></>:<View style={s.loading}><Image source={resolvedTheme==='dark'?require('../assets/app/logo-dark.png'):require('../assets/app/logo-light.png')} resizeMode="contain" style={s.logo}/><ActivityIndicator color={c.accent}/></View>}
  </View>;
}
export default function RootLayout(){return <AppProvider><Shell/></AppProvider>}
const s=StyleSheet.create({root:{flex:1},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:24},errorTitle:{fontSize:22,fontWeight:'700',textAlign:'center'},errorHelp:{fontSize:16,textAlign:'center',paddingHorizontal:24},retry:{paddingHorizontal:24,paddingVertical:14,borderRadius:16},retryText:{fontSize:16,fontWeight:'600'},logo:{width:210,height:210}});
