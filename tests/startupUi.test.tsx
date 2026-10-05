import React from 'react';
import { act,create,ReactTestRenderer } from 'react-test-renderer';
import { afterEach,expect,it,vi } from 'vitest';
import { t } from '../src/i18n';
import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import { light,dark } from '../src/theme';
import logo from '../assets/app/logo.png';
const mocks=vi.hoisted(()=>({state:{} as Record<string,unknown>,retry:vi.fn(),hide:vi.fn()}));
vi.mock('react-native',()=>({ActivityIndicator:'Spinner',Image:'Image',Pressable:'Pressable',Text:'Text',View:'View',StyleSheet:{create:(value:unknown)=>value}}));
vi.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:0,bottom:32,left:0,right:0})}));
vi.mock('react-native-gesture-handler',()=>({}));
vi.mock('expo-router',()=>({Stack:'Stack',ThemeProvider:'NavigationTheme',DefaultTheme:{dark:false,colors:{background:'white'},fonts:{regular:{fontFamily:'System'}}},DarkTheme:{dark:true,colors:{background:'black'},fonts:{regular:{fontFamily:'System'}}},Tabs:Object.assign(({children,...props}:{children:React.ReactNode})=>React.createElement('Tabs',props,children),{Screen:'TabScreen'})}));
vi.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
vi.mock('expo-status-bar',()=>({StatusBar:'StatusBar'}));
vi.mock('expo-splash-screen',()=>({preventAutoHideAsync:vi.fn(),hide:mocks.hide}));
vi.mock('expo-system-ui',()=>({setBackgroundColorAsync:vi.fn()}));
vi.mock('../src/features/AppBar',()=>({AppBar:()=>null}));
vi.mock('../src/features/AppProvider',()=>({AppProvider:({children}:{children:React.ReactNode})=>children,SuccessToast:()=>null,useApp:()=>mocks.state}));
let renderer:ReactTestRenderer;
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount());vi.restoreAllMocks();vi.resetModules()});
it.each([{palette:light,resolvedTheme:'light'},{palette:dark,resolvedTheme:'dark'}])('uses the same rounded approved logo in $resolvedTheme mode',async({palette,resolvedTheme})=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  mocks.state={ready:false,themeReady:true,error:null,retryStartup:mocks.retry,palette,resolvedTheme};
  await act(async()=>{renderer=create(<RootLayout/>)});
  const image=renderer.root.find(node=>node.type as unknown==='Image');
  expect(image.props.source).toBe(logo);
  expect(image.props.style.borderRadius).toBe(28);
  expect(renderer.root.findAll(node=>node.type as unknown==='Spinner')).toHaveLength(1);
  mocks.state={...mocks.state,ready:true};await act(async()=>renderer.update(<RootLayout/>));
  expect(renderer.root.findAll(node=>node.type as unknown==='Image')).toHaveLength(0);
});
it.each([light,dark])('shows a readable retry screen and hides the splash after a startup failure',async palette=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});mocks.retry.mockReset();mocks.hide.mockReset();
  mocks.state={ready:false,themeReady:true,error:'raw platform error',retryStartup:mocks.retry,palette,resolvedTheme:'light'};
  await act(async()=>{renderer=create(<RootLayout/>)});
  expect(JSON.stringify(renderer.toJSON())).toContain(t('startupFailed'));
  expect(JSON.stringify(renderer.toJSON())).not.toContain('raw platform error');
  expect(renderer.root.findAll(node=>node.type as unknown==='Spinner')).toHaveLength(0);
  const retry=renderer.root.find(node=>node.type as unknown==='Pressable');expect(retry.props.accessibilityRole).toBe('button');
  expect(retry.find(node=>node.type as unknown==='Text').props.style[1].color).toBe(palette.onAccent);
  await act(async()=>{retry.props.onPress()});expect(mocks.retry).toHaveBeenCalledOnce();
  renderer.root.findAll(node=>node.type as unknown==='View')[0].props.onLayout();expect(mocks.hide).toHaveBeenCalledOnce();
  mocks.state={...mocks.state,error:null,ready:true};await act(async()=>renderer.update(<RootLayout/>));
  expect(renderer.root.findAll(node=>node.type as unknown==='Stack')).toHaveLength(1);
});
it.each(['es-ES','en-US','fr-FR'])('localizes startup recovery for %s',async locale=>{
  const options=new Intl.DateTimeFormat().resolvedOptions();vi.spyOn(Intl.DateTimeFormat.prototype,'resolvedOptions').mockReturnValue({...options,locale});
  const {t}=await import('../src/i18n');
  expect(t('retry')).toBe(locale==='es-ES'?'Reintentar':'Try again');
  expect(t('startupFailed')).toBe(locale==='es-ES'?'No se pudieron abrir tus hábitos':'Could not open your habits');
  expect(t('startupFailedHelp')).toBeTruthy();
});
it('keeps navigation surfaces in sync when appearance changes',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  mocks.state={ready:true,themeReady:true,error:null,retryStartup:mocks.retry,palette:light,resolvedTheme:'light'};
  await act(async()=>{renderer=create(<><RootLayout/><TabsLayout/></>)});
  for(const palette of [light,dark,light]){
    mocks.state={...mocks.state,palette,resolvedTheme:palette===dark?'dark':'light'};
    await act(async()=>renderer.update(<><RootLayout/><TabsLayout/></>));
    const theme=renderer.root.find(node=>node.type as unknown==='NavigationTheme').props.value;
    expect(theme.dark).toBe(palette===dark);
    expect(theme.colors).toMatchObject({background:palette.bg,card:palette.card,text:palette.text,border:palette.line});
    expect(theme.fonts.regular.fontFamily).toBe('System');
    expect(renderer.root.find(node=>node.type as unknown==='Stack').props.screenOptions.contentStyle.backgroundColor).toBe(palette.bg);
    expect(renderer.root.find(node=>node.type as unknown==='Tabs').props.screenOptions.sceneStyle.backgroundColor).toBe(palette.bg);
  }
});
