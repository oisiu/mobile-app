import ManropeExtraBold from '../assets/fonts/Manrope-ExtraBold.ttf';
import ManropeBold from '../assets/fonts/Manrope-Bold.ttf';
import ManropeSemiBold from '../assets/fonts/Manrope-SemiBold.ttf';
import ManropeRegular from '../assets/fonts/Manrope-Regular.ttf';
import { Text } from '@/theme/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';
import { useEffect,useState } from 'react';
import { useFonts } from 'expo-font';
import { DarkTheme,DefaultTheme,Stack,ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { ActivityIndicator,Pressable,StyleSheet,View } from 'react-native';
import { t } from '@/i18n';
import { AppBar } from '@/features/AppBar';
import { AppProvider,SuccessToast,useApp } from '@/features/AppProvider';

void SplashScreen.preventAutoHideAsync();

function Shell(){
  const insets=useSafeAreaInsets(),[recovering,setRecovering]=useState(false);
  const {ready,error,retryStartup,themeReady,resolvedTheme,palette:c}=useApp();
  useEffect(()=>{if(themeReady)void SystemUI.setBackgroundColorAsync(c.bg)},[themeReady,c.bg]);
  if(!themeReady||(!ready&&!error&&!recovering))return null;
  const baseTheme=resolvedTheme==='dark'?DarkTheme:DefaultTheme;
  const navigationTheme={...baseTheme,colors:{...baseTheme.colors,primary:c.accent,background:c.bg,card:c.card,text:c.text,border:c.line,notification:c.danger}};
  return <ThemeProvider value={navigationTheme}><View style={[s.root,{backgroundColor:c.bg,paddingTop:insets.top,paddingLeft:insets.left,paddingRight:insets.right}]} onLayout={()=>SplashScreen.hide()}>
    <StatusBar style={resolvedTheme==='dark'?'light':'dark'}/>
    {!ready&&(error||recovering)?<View style={s.loading}><Text accessibilityRole="alert" style={[s.errorTitle,{color:c.text}]}>{t('startupFailed')}</Text><Text style={[s.errorHelp,{color:c.text}]}>{t('startupFailedHelp')}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('retry')} accessibilityState={{disabled:recovering,busy:recovering}} disabled={recovering} onPress={()=>{setRecovering(true);void retryStartup().finally(()=>setRecovering(false))}} style={[s.retry,{backgroundColor:c.accent}]}>{recovering?<ActivityIndicator color={c.onAccent}/>:<Text style={[s.retryText,{color:c.onAccent}]}>{t('retry')}</Text>}</Pressable></View>:<><Stack screenOptions={{headerShown:false,animation:'slide_from_right',contentStyle:{backgroundColor:c.bg}}}/><AppBar/><SuccessToast/></>}
  </View></ThemeProvider>;
}
export default function RootLayout(){
  const [fontsLoaded,fontError]=useFonts({
    'Manrope-Regular':ManropeRegular,
    'Manrope-SemiBold':ManropeSemiBold,
    'Manrope-Bold':ManropeBold,
    'Manrope-ExtraBold':ManropeExtraBold,
  });
  if(!fontsLoaded&&!fontError)return null;
  return <AppProvider><Shell/></AppProvider>;
}
const s=StyleSheet.create({root:{flex:1},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:24},errorTitle:{fontSize:22,fontWeight:'700',textAlign:'center'},errorHelp:{fontSize:16,textAlign:'center',paddingHorizontal:24},retry:{paddingHorizontal:24,paddingVertical:14,borderRadius:16},retryText:{fontSize:16,fontWeight:'600'}});
