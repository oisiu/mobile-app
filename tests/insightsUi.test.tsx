import React from 'react';
import { act,create,ReactTestRenderer,ReactTestInstance } from 'react-test-renderer';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { Habit } from '../src/domain/types';
import { light,dark } from '../src/theme';
import { aggregate } from '../src/domain/aggregation';
import InsightDetailScreen from '../src/features/insights/InsightDetailScreen';
import { StrengthChart } from '../src/features/insights/StrengthChart';
import { habitStrength } from '../src/domain/habitStrength';
import { AppBar } from '../src/features/AppBar';
import { SheetHandle } from '../src/features/SheetHandle';
import { t } from '../src/i18n';
import Settings from '../app/(tabs)/settings';

const state=vi.hoisted(()=>({app:{} as Record<string,unknown>,alert:vi.fn(),path:'/',navigate:vi.fn(),dismissTo:vi.fn()}));
vi.mock('react-native',()=>({
  View:'View',Text:'Text',Pressable:'Pressable',TouchableOpacity:'TouchableOpacity',ScrollView:'ScrollView',Modal:'Modal',TextInput:'TextInput',KeyboardAvoidingView:'KeyboardAvoidingView',ActivityIndicator:'ActivityIndicator',
  Platform:{OS:'ios'},Alert:{alert:state.alert},AccessibilityInfo:{isReduceMotionEnabled:async()=>true},
  StyleSheet:{create:(styles:unknown)=>styles,hairlineWidth:0.5},
  Animated:{View:'AnimatedView',Value:class{setValue(){} stopAnimation(){}},timing:()=>({start(){}})},
  FlatList:({data,renderItem,initialScrollIndex=0,...props}:{data:unknown[];renderItem:(item:unknown)=>React.ReactNode;initialScrollIndex?:number})=>React.createElement('List',props,data.slice(Math.max(0,initialScrollIndex-2),initialScrollIndex+8).map((item,index)=><React.Fragment key={index}>{renderItem({item,index})}</React.Fragment>)),
}));
vi.mock('react-native-svg',()=>({default:'Svg',Circle:'Circle',Line:'Line',Polyline:'Polyline',Text:'SvgText',Rect:'Rect'}));
vi.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
vi.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})}));
vi.mock('expo-router',()=>({useLocalSearchParams:()=>({id:'habit'}),usePathname:()=>state.path,router:{back:vi.fn(),navigate:state.navigate,dismissTo:state.dismissTo}}));
vi.mock('../src/features/AppProvider',()=>({useApp:()=>state.app}));
vi.mock('../src/features/insights/useChartEntrance',()=>({useChartEntrance:()=>true}));
vi.mock('../src/features/useResponsiveNavigation',()=>({usePrefetchRoutes:()=>{},useResponsiveNavigation:()=>({pending:null,push:vi.fn()})}));
vi.mock('../src/domain/entries',async importOriginal=>{const actual=await importOriginal<typeof import('../src/domain/entries')>();return {...actual,todayLocal:(date?:Date)=>date?actual.todayLocal(date):'2026-09-08'}});
vi.mock('../src/domain/habitStrength',async importOriginal=>{const actual=await importOriginal<typeof import('../src/domain/habitStrength')>();return {...actual,habitStrength:vi.fn(actual.habitStrength)}});
vi.mock('../src/domain/aggregation',async importOriginal=>{const actual=await importOriginal<typeof import('../src/domain/aggregation')>();return {...actual,aggregate:vi.fn(actual.aggregate)}});
vi.mock('expo-file-system/legacy',()=>({}));
vi.mock('expo-sharing',()=>({}));
vi.mock('expo-document-picker',()=>({}));
vi.mock('expo-clipboard',()=>({}));
vi.mock('expo-linking',()=>({}));

const habit:Habit={id:'habit',name:'Reading',emoji:'📖',type:'boolean',parentId:null,isGeneral:false,sortOrder:0,archivedAt:null,createdAt:'2026-09-01',updatedAt:'2026-09-01'};
let renderer:ReactTestRenderer;
const render=async(element:React.ReactElement)=>{await act(async()=>{renderer=create(element)});return renderer.root};
const press=async(node:ReactTestInstance)=>{await act(async()=>{node.props.onPress()})};
const button=(root:ReactTestInstance,label:string)=>root.findAll(node=>typeof node.type===('string' as React.ElementType)&&node.props.accessibilityLabel===label)[0];
const openCalendar=async()=>{
  await render(<InsightDetailScreen/>);
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10))});
  const compact=renderer.root.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.props.accessibilityLabel?.startsWith('Reading, 2026-09-08:'))[0];
  await press(compact);
  const modal=renderer.root.findAll(node=>node.type===('Modal' as React.ElementType)&&node.props.visible)[0];
  await act(async()=>{modal.props.onShow()});
  return modal;
};
const day=(modal:ReactTestInstance,date='2026-09-08')=>modal.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.props.accessibilityLabel?.startsWith(`Reading, ${date}:`))[0];

beforeEach(()=>{
  vi.clearAllMocks();
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  vi.stubGlobal('requestIdleCallback',(callback:()=>void)=>setTimeout(callback,0));
  vi.stubGlobal('cancelIdleCallback',clearTimeout);
  state.app={habits:[habit],entries:[],palette:light,changeEntry:vi.fn().mockResolvedValue(undefined)};
});
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount());vi.unstubAllGlobals()});

describe('Score axis',()=>{
  it.each([light,dark])('keeps each percentage in one text node outside the plot',async c=>{
    const root=await render(<StrengthChart habit={habit} selected={[{habit,color:c.accent}]} habits={[habit]} entries={[]} today="2026-09-08" buckets={[{key:'2026-09-08',label:'T',dates:new Set(['2026-09-08'])}]} period="week" c={c}/>);
    const labels=root.findAllByType('SvgText' as React.ElementType).filter(node=>typeof node.props.children==='string'&&node.props.children.endsWith('%'));
    expect(labels.map(node=>node.props.children)).toEqual(['100%','80%','60%','40%','20%','0%']);
    const plotLeft=root.findAllByType('Line' as React.ElementType)[0].props.x1;
    for(const label of labels){expect(label.props.textAnchor).toBe('end');expect(label.props.x).toBeLessThanOrEqual(plotLeft-8)}
    await act(async()=>{root.findByType('View' as React.ElementType).props.onLayout({nativeEvent:{layout:{width:240}}})});
    expect(root.findByType('Svg' as React.ElementType).props.width).toBe(240);
  });
});

describe('Calendar dialog interactions',()=>{
  it('isolates pending state from Score, shows feedback, and rejects duplicate taps and dismissal',async()=>{
    let finish!:()=>void;
    const save=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve}));state.app.changeEntry=save;
    const modal=await openCalendar(),cell=day(modal),close=button(modal,t('close'));
    const scoreCalls=vi.mocked(habitStrength).mock.calls.length,activityCalls=vi.mocked(aggregate).mock.calls.length;
    await act(async()=>{cell.props.onPress();cell.props.onPress()});
    expect(save).toHaveBeenCalledExactlyOnceWith('habit','2026-09-08',1);
    expect(day(modal).props.accessibilityState).toMatchObject({busy:true,disabled:true});
    expect(day(modal).findAllByType('ActivityIndicator' as React.ElementType)).toHaveLength(1);
    await press(close);await act(async()=>modal.props.onRequestClose());
    expect(renderer.root.findAll(node=>node.type===('Modal' as React.ElementType)&&node.props.visible)).toHaveLength(1);
    expect(vi.mocked(habitStrength).mock.calls.length).toBe(scoreCalls);
    expect(vi.mocked(aggregate).mock.calls.length).toBe(activityCalls);
    await act(async()=>finish());
    expect(day(modal).props.disabled).toBe(false);
    expect(day(modal).findAllByType('ActivityIndicator' as React.ElementType)).toHaveLength(0);
  });
  it('releases the pending guard after a failed write and allows retry',async()=>{
    const save=vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined);state.app.changeEntry=save;
    const modal=await openCalendar();await press(day(modal));
    expect(state.alert).toHaveBeenCalledWith(t('couldNotSave'),'disk full');
    expect(day(modal).props.disabled).toBe(false);
    await press(day(modal));expect(save).toHaveBeenCalledTimes(2);
  });
  it.each(['number','duration'] as const)('opens a %s draft without recalculating Score and preserves failed drafts',async type=>{
    state.app.habits=[{...habit,type}];state.app.changeEntry=vi.fn().mockRejectedValue(new Error('disk full'));
    const modal=await openCalendar(),scoreCalls=vi.mocked(habitStrength).mock.calls.length;
    await press(day(modal));
    const input=renderer.root.findByType('TextInput' as React.ElementType);
    await act(async()=>input.props.onChangeText('2'));
    expect(vi.mocked(habitStrength).mock.calls.length).toBe(scoreCalls);
    const save=renderer.root.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.findAll(child=>child.type===('Text' as React.ElementType)&&child.props.children===t('save')).length>0)[0];
    await press(save);
    expect(state.app.changeEntry).toHaveBeenCalledWith('habit','2026-09-08',type==='duration'?120:2);
    expect(renderer.root.findByType('TextInput' as React.ElementType).props.value).toBe('2');
    await act(async()=>modal.props.onRequestClose());
    expect(renderer.root.findAllByType('TextInput' as React.ElementType)).toHaveLength(0);
    expect(renderer.root.findAll(node=>node.type===('Modal' as React.ElementType)&&node.props.visible)).toHaveLength(1);
  });
  it('blocks future dates and reflects committed activity',async()=>{
    const modal=await openCalendar();expect(day(modal,'2026-09-09').props.disabled).toBe(true);
    await press(day(modal,'2026-09-09'));expect(state.app.changeEntry).not.toHaveBeenCalled();
    state.app={...state.app,entries:[{id:'entry',habitId:'habit',value:1,localDate:'2026-09-08'}]};
    await act(async()=>renderer.update(<InsightDetailScreen/>));
    expect(day(modal).props.accessibilityLabel).toContain(t('active'));
    await press(day(modal));expect(state.app.changeEntry).toHaveBeenCalledWith('habit','2026-09-08',null);
  });
});

describe('Shared presentation interactions',()=>{
  it('identifies the active tab beyond color and keeps detail navigation working',async()=>{
    state.path='/insight/habit';const root=await render(<AppBar/>);
    const tabs=root.findAll(node=>node.type===('Pressable' as React.ElementType)&&node.props.accessibilityRole==='tab');
    expect(tabs.filter(node=>node.props.accessibilityState.selected)).toHaveLength(1);
    expect(button(root,t('insights')).findByType('Icon' as React.ElementType).props.name).toBe('stats-chart');
    expect(tabs[0].props.style({pressed:true})[1].opacity).toBeLessThan(tabs[0].props.style({pressed:false})[1].opacity);
    await press(button(root,t('home')));expect(state.dismissTo).toHaveBeenCalledWith('/(tabs)');
  });
  it('shows localized appearance labels and preserves the selection action',async()=>{
    state.app={...state.app,themeMode:'system',setThemeMode:vi.fn()};
    const root=await render(<Settings/>);
    for(const mode of ['system','light','dark'] as const){
      const option=button(root,t(mode));
      expect(option.props.accessibilityRole).toBe('radio');
      expect(option.findAll(node=>node.type===('Text' as React.ElementType)&&node.props.children===t(mode))).toHaveLength(1);
      expect(option.props.accessibilityState.selected).toBe(mode==='system');
    }
    await press(button(root,t('dark')));expect(state.app.setThemeMode).toHaveBeenCalledWith('dark');
  });
  it('exposes an accessible close handle and disables it while saving',async()=>{
    const close=vi.fn();const root=await render(<SheetHandle onClose={close}/>);
    await press(button(root,t('close')));expect(close).toHaveBeenCalledOnce();
    await act(async()=>renderer.update(<SheetHandle onClose={close} disabled/>));
    expect(button(root,t('close')).props.disabled).toBe(true);
  });
});
