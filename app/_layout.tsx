import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { ActivityIndicator,Image,StyleSheet,View } from 'react-native';
import { AppBar } from '@/features/AppBar';
import { AppProvider,SuccessToast,useApp } from '@/features/AppProvider';

void SplashScreen.preventAutoHideAsync();

function Shell(){
  const insets=useSafeAreaInsets();
  const {ready,themeReady,resolvedTheme,palette:c}=useApp();
  useEffect(()=>{if(themeReady)void SystemUI.setBackgroundColorAsync(c.bg)},[themeReady,c.bg]);
  if(!themeReady)return null;
  return <View style={[s.root,{backgroundColor:c.bg,paddingTop:insets.top,paddingLeft:insets.left,paddingRight:insets.right}]} onLayout={()=>SplashScreen.hide()}>
    <StatusBar style={resolvedTheme==='dark'?'light':'dark'}/>
    {ready?<><Stack screenOptions={{headerShown:false,animation:'slide_from_right',contentStyle:{backgroundColor:c.bg}}}/><AppBar/><SuccessToast/></>:<View style={s.loading}><Image source={resolvedTheme==='dark'?require('../assets/app/logo-dark.png'):require('../assets/app/logo-light.png')} resizeMode="contain" style={s.logo}/><ActivityIndicator color={c.accent}/></View>}
  </View>;
}
export default function RootLayout(){return <AppProvider><Shell/></AppProvider>}
const s=StyleSheet.create({root:{flex:1},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:24},logo:{width:210,height:210}});
