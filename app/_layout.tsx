import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { DarkTheme,DefaultTheme,Stack,ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { ActivityIndicator,Image,Pressable,StyleSheet,Text,View } from 'react-native';
import { t } from '@/i18n';
import { AppBar } from '@/features/AppBar';
import { AppProvider,SuccessToast,useApp } from '@/features/AppProvider';
import logo from '../assets/app/logo.png';

void SplashScreen.preventAutoHideAsync();

function Shell(){
  const insets=useSafeAreaInsets();
  const {ready,error,retryStartup,themeReady,resolvedTheme,palette:c}=useApp();
  useEffect(()=>{if(themeReady)void SystemUI.setBackgroundColorAsync(c.bg)},[themeReady,c.bg]);
  if(!themeReady)return null;
  const baseTheme=resolvedTheme==='dark'?DarkTheme:DefaultTheme;
  const navigationTheme={...baseTheme,colors:{...baseTheme.colors,primary:c.accent,background:c.bg,card:c.card,text:c.text,border:c.line,notification:c.danger}};
  return <ThemeProvider value={navigationTheme}><View style={[s.root,{backgroundColor:c.bg,paddingTop:insets.top,paddingLeft:insets.left,paddingRight:insets.right}]} onLayout={()=>SplashScreen.hide()}>
    <StatusBar style={resolvedTheme==='dark'?'light':'dark'}/>
    {error?<View style={s.loading}><Text accessibilityRole="alert" style={[s.errorTitle,{color:c.text}]}>{t('startupFailed')}</Text><Text style={[s.errorHelp,{color:c.text}]}>{t('startupFailedHelp')}</Text><Pressable accessibilityRole="button" onPress={()=>void retryStartup()} style={[s.retry,{backgroundColor:c.accent}]}><Text style={[s.retryText,{color:c.onAccent}]}>{t('retry')}</Text></Pressable></View>:ready?<><Stack screenOptions={{headerShown:false,animation:'slide_from_right',contentStyle:{backgroundColor:c.bg}}}/><AppBar/><SuccessToast/></>:<View style={s.loading}><Image source={logo} resizeMode="contain" style={s.logo}/><ActivityIndicator color={c.accent}/></View>}
  </View></ThemeProvider>;
}
export default function RootLayout(){return <AppProvider><Shell/></AppProvider>}
const s=StyleSheet.create({root:{flex:1},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:24},errorTitle:{fontSize:22,fontWeight:'700',textAlign:'center'},errorHelp:{fontSize:16,textAlign:'center',paddingHorizontal:24},retry:{paddingHorizontal:24,paddingVertical:14,borderRadius:16},retryText:{fontSize:16,fontWeight:'600'},logo:{width:'80%',maxWidth:300,aspectRatio:1,borderRadius:28}});
