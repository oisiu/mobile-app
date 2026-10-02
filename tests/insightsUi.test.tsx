import { buildRootActivitySeries } from '../src/domain/insightsOverview';
import { HistoryChart } from '../src/features/insights/HistoryChart';
import { habitAccentPalette } from '../src/theme/habitColors';
import React from 'react';
import { act,create,ReactTestRenderer,ReactTestInstance } from 'react-test-renderer';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { Habit } from '../src/domain/types';
import { light,dark } from '../src/theme';
import { aggregate } from '../src/domain/aggregation';
import InsightDetailScreen from '../src/features/insights/InsightDetailScreen';
import { StrengthChart } from '../src/features/insights/StrengthChart';
import { habitStrength,strengthSummary } from '../src/domain/habitStrength';
import { AppBar } from '../src/features/AppBar';
import { SheetHandle } from '../src/features/SheetHandle';
import { t } from '../src/i18n';
import Settings from '../app/(tabs)/settings';
import Insights from '../app/(tabs)/insights';
import Calendar from '../app/(tabs)/calendar';
import { CalendarDayBackground } from '../src/features/CalendarDayBackground';

const state=vi.hoisted(()=>({app:{} as Record<string,unknown>,alert:vi.fn(),path:'/',pending:null as string|null,push:vi.fn(),today:'2026-09-08',navigate:vi.fn(),dismissTo:vi.fn()}));
vi.mock('react-native',()=>({
  View:'View',Text:'Text',Pressable:'Pressable',TouchableOpacity:'TouchableOpacity',ScrollView:'ScrollView',Modal:'Modal',TextInput:'TextInput',KeyboardAvoidingView:'KeyboardAvoidingView',ActivityIndicator:'ActivityIndicator',
  Platform:{OS:'ios'},Alert:{alert:state.alert},AccessibilityInfo:{isReduceMotionEnabled:async()=>true},
  StyleSheet:{create:(styles:unknown)=>styles,hairlineWidth:0.5},
  Animated:{View:'AnimatedView',Value:class{setValue(){} stopAnimation(){}},timing:()=>({start(){}})},
  FlatList:({data,renderItem,initialScrollIndex=0,...props}:{data:unknown[];renderItem:(item:unknown)=>React.ReactNode;initialScrollIndex?:number})=>React.createElement('List',props,data.slice(Math.max(0,initialScrollIndex-2),initialScrollIndex+8).map((item,index)=><React.Fragment key={index}>{renderItem({item,index})}</React.Fragment>)),
}));
vi.mock('react-native-svg',()=>({default:'Svg',Circle:'Circle',Line:'Line',Polyline:'Polyline',Text:'SvgText',Rect:'Rect',Defs:'Defs',Pattern:'Pattern',Path:'Path'}));
vi.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
vi.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})}));
vi.mock('expo-router',()=>({useLocalSearchParams:()=>({id:'habit'}),usePathname:()=>state.path,router:{back:vi.fn(),navigate:state.navigate,dismissTo:state.dismissTo}}));
vi.mock('../src/features/AppProvider',()=>({useApp:()=>state.app,SuccessToast:'SuccessToast'}));
vi.mock('../src/features/insights/useChartEntrance',()=>({useChartEntrance:()=>true}));
vi.mock('../src/features/useResponsiveNavigation',()=>({usePrefetchRoutes:()=>{},useResponsiveNavigation:()=>({pending:state.pending,push:state.push})}));
vi.mock('../src/domain/entries',async importOriginal=>{const actual=await importOriginal<typeof import('../src/domain/entries')>();return {...actual,todayLocal:(date?:Date)=>date?actual.todayLocal(date):state.today}});
vi.mock('../src/domain/habitStrength',async importOriginal=>{const actual=await importOriginal<typeof import('../src/domain/habitStrength')>();return {...actual,habitStrength:vi.fn(actual.habitStrength),strengthSummary:vi.fn(actual.strengthSummary)}});
vi.mock('../src/domain/aggregation',async importOriginal=>{const actual=await importOriginal<typeof import('../src/domain/aggregation')>();return {...actual,aggregate:vi.fn(actual.aggregate)}});
vi.mock('../src/domain/insightsOverview',async importOriginal=>{const actual=await importOriginal<typeof import('../src/domain/insightsOverview')>();return {...actual,buildRootActivitySeries:vi.fn(actual.buildRootActivitySeries)}});
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
  vi.clearAllMocks();state.today='2026-09-08';state.pending=null;
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  vi.stubGlobal('requestIdleCallback',(callback:()=>void)=>setTimeout(callback,0));
  vi.stubGlobal('cancelIdleCallback',clearTimeout);
  state.app={habits:[habit],entries:[],palette:light,changeEntry:vi.fn().mockResolvedValue(undefined)};
});
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount());vi.unstubAllGlobals()});

describe('Score axis',()=>{
  it('navigates one month at a time and labels every third month in Quarter',async()=>{
    const root=await render(<InsightDetailScreen/>);
    const period=(label:string)=>root.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.findAll(child=>child.type===('Text' as React.ElementType)&&child.props.children===label).length>0)[0];
    await press(period(t('month')));
    expect(root.findByType(StrengthChart).props.buckets).toHaveLength(30);
    expect(button(root,t('nextPeriod')).props.disabled).toBe(true);
    await press(button(root,t('previousPeriod')));
    expect(root.findByType(StrengthChart).props.buckets[0].key).toBe('2026-08-01');
    expect(button(root,t('nextPeriod')).props.disabled).toBe(false);
    await press(button(root,t('nextPeriod')));
    expect(root.findByType(StrengthChart).props.buckets[0].key).toBe('2026-09-01');
    await press(period(t('quarter')));
    const buckets=root.findByType(StrengthChart).props.buckets;
    expect(buckets).toHaveLength(12);
    expect(buckets[0].key).toBe('2025-10');
    const chart=root.findByType(StrengthChart);
    const labels=chart.findAllByType('SvgText' as React.ElementType).map(node=>node.props.children);
    expect(chart.findAllByType('SvgText' as React.ElementType).filter(node=>node.props.y===178).map(node=>node.props.children)).toEqual(buckets.filter((_:unknown,index:number)=>index%3===0).map((bucket:{label:string})=>bucket.label.replace(/[.\s]/g,'').slice(0,3)));
    expect(labels).toContain('2025');
    expect(labels).toContain('2026');
  });
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

it('fills calendar days with translucent root sectors without emoji underlines',async()=>{
  const second={...habit,id:'second',name:'Walking',color:'purple' as const,sortOrder:1},zero={...habit,id:'zero',name:'Zero',sortOrder:2},child={...habit,id:'child',parentId:habit.id};
  const record=(habitId:string,localDate:string,value=1)=>({id:habitId+localDate,habitId,localDate,value,occurredAt:localDate,timezone:'UTC',createdAt:localDate,updatedAt:localDate});
  state.app={...state.app,habits:[{...habit,color:'green'},second,zero,child],entries:[record('second','2026-09-08'),record('child','2026-09-08'),record('habit','2026-09-08'),record('zero','2026-09-08',0),record('second','2026-09-07')]};
  const root=await render(<Calendar/>);
  await act(async()=>{root.findAllByType('View' as React.ElementType)[0].props.onLayout({nativeEvent:{layout:{width:360}}})});
  const cells=root.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.props.accessibilityLabel?.startsWith(t('editDay')));
  const day=(date:string)=>cells.find(node=>node.props.accessibilityLabel.includes(date))!;
  expect(day('2026-09-08').findByType(CalendarDayBackground).props.colors).toEqual([habitAccentPalette.green,habitAccentPalette.purple]);
  expect(day('2026-09-08').props.accessibilityLabel).toContain('Reading, Walking');
  expect(day('2026-09-08').props.accessibilityLabel).not.toContain('Zero');
  expect(day('2026-09-07').findByType(CalendarDayBackground).props.colors).toEqual([habitAccentPalette.purple]);
  expect(day('2026-09-06').findByType(CalendarDayBackground).props.colors).toEqual([]);
  const background=day('2026-09-08').findByType(CalendarDayBackground);
  expect(background.findByType('View' as React.ElementType).props.style[1].opacity).toBe(.3);
  expect(background.findAllByType('Path' as React.ElementType).map(node=>node.props.fill)).toEqual([habitAccentPalette.green,habitAccentPalette.purple]);
  expect(background.findAllByType('Pattern' as React.ElementType)).toHaveLength(0);
  expect(day('2026-09-08').findAll(node=>node.type===('View' as React.ElementType)&&node.props.style?.borderBottomWidth)).toHaveLength(0);
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

it('switches the Insights overview from Month to Year',async()=>{
  const root=await render(<Insights/>);
  const periodButton=(label:string)=>root.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.findAll(child=>child.type===('Text' as React.ElementType)&&child.props.children===label).length>0)[0];
  expect(periodButton(t('month')).props.accessibilityState.selected).toBe(true);
  await press(periodButton(t('year')));
  expect(periodButton(t('year')).props.accessibilityState.selected).toBe(true);
  expect(periodButton(t('month')).props.accessibilityState.selected).toBe(false);
  expect(root.findAll(node=>node.type===('Text' as React.ElementType)&&node.props.children===t('habitContributionHelp'))).toHaveLength(1);
  expect(root.findAll(node=>node.type===('Text' as React.ElementType)&&node.props.children===t('noActivityPeriod'))).toHaveLength(1);
});

it('shows parent contribution slices and navigates historical months',async()=>{
  const second={...habit,id:'second',name:'Walking',sortOrder:1};
  const child={...habit,id:'child',parentId:'habit'};
  const record=(habitId:string,localDate:string)=>({id:habitId+localDate,habitId,localDate,value:1,occurredAt:localDate,timezone:'UTC',createdAt:localDate,updatedAt:localDate});
  state.app={...state.app,habits:[habit,second,child],entries:[record('habit','2026-09-01'),record('child','2026-09-01'),record('child','2026-09-02'),record('second','2026-09-01'),record('second','2026-08-01')]};
  const root=await render(<Insights/>);
  const chart=()=>root.findAllByType('Svg' as React.ElementType)[0];
  expect(chart().props.accessibilityLabel).toContain(new Intl.NumberFormat(undefined,{style:'percent',maximumFractionDigits:1}).format(2/3));
  expect(chart().findAllByType('Circle' as React.ElementType)).toHaveLength(2);
  expect(chart().findAllByType('SvgText' as React.ElementType)).toHaveLength(2);
  expect(root.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.props.style?.width==='50%').every(node=>!JSON.stringify(node.props.accessibilityLabel).includes('%'))).toBe(true);
  expect(chart().props.accessibilityLabel).not.toContain('child:');
  expect(button(root,t('nextPeriod')).props.disabled).toBe(true);
  await press(button(root,t('previousPeriod')));
  expect(button(root,t('nextPeriod')).props.disabled).toBe(false);
  expect(chart().props.accessibilityLabel).toContain('Walking: '+new Intl.NumberFormat(undefined,{style:'percent',maximumFractionDigits:1}).format(1));
  expect(chart().findAllByType('Circle' as React.ElementType)).toHaveLength(1);
  await press(button(root,t('nextPeriod')));
  expect(chart().findAllByType('Circle' as React.ElementType)).toHaveLength(2);
  expect(chart().findAllByType('SvgText' as React.ElementType)).toHaveLength(2);
  expect(root.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.props.style?.width==='50%').every(node=>!JSON.stringify(node.props.accessibilityLabel).includes('%'))).toBe(true);
});

it('groups parent icons in two columns with active days over elapsed period days',async()=>{
  state.today='2026-10-08';
  const second={...habit,id:'second',name:'Walking',sortOrder:1},third={...habit,id:'third',name:'Yoga',sortOrder:2};
  const record=(localDate:string)=>({id:localDate,habitId:habit.id,localDate,value:1,occurredAt:localDate,timezone:'UTC',createdAt:localDate,updatedAt:localDate});
  state.app={...state.app,habits:[third,second,habit],entries:[record('2026-10-05'),record('2026-10-06')]};
  const root=await render(<Insights/>);
  const periodButton=(label:string)=>root.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.findAll(child=>child.type===('Text' as React.ElementType)&&child.props.children===label).length>0)[0];
  await press(periodButton(t('week')));
  const tiles=()=>root.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.props.style?.width==='50%');
  expect(tiles()).toHaveLength(3);
  expect(tiles().map(node=>node.props.accessibilityLabel.split(',')[0])).toEqual([t('openInsights')+' Reading',t('openInsights')+' Walking',t('openInsights')+' Yoga']);
  expect(tiles()[0].props.accessibilityLabel).toContain('2/4');
  expect(tiles()[1].props.accessibilityLabel).toContain('0/4');
  expect(root.findAll(node=>node.type===('Text' as React.ElementType)&&node.props.children==='5-11/10/2026')).toHaveLength(4);
  await press(button(root,t('previousPeriod')));
  expect(tiles()[0].props.accessibilityLabel).toContain('0/7');
  await press(periodButton(t('month')));
  expect(tiles()[0].props.accessibilityLabel).toContain('2/8');
  await press(periodButton(t('year')));
  expect(tiles()[0].props.accessibilityLabel).toContain('2/281');
});

it('compares only root scores with one, several or all curves and twelve-month Year',async()=>{
  const second={...habit,id:'second',name:'Walking',color:'blue' as const,sortOrder:1},third={...habit,id:'third',name:'Yoga',color:'pink' as const,sortOrder:2},child={...habit,id:'child',name:'Child',parentId:habit.id};
  state.app={...state.app,habits:[{...habit,color:'green'},second,third,child]};
  const root=await render(<Insights/>),score=()=>root.findByType(StrengthChart);
  expect(score().props.selected.map((item:{habit:Habit})=>item.habit.id)).toEqual(['habit','second','third']);
  expect(score().props.showSummary).toBe(false);
  await press(button(root,t('selectMultiple')));
  const modal=root.findAll(node=>node.type===('Modal' as React.ElementType)&&node.props.visible)[0];
  const choices=()=>modal.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.props.accessibilityRole==='checkbox');
  expect(choices().map(node=>node.props.accessibilityLabel)).toEqual(['Reading','Walking','Yoga']);
  await press(choices()[2]);expect(score().props.selected).toHaveLength(2);
  await press(choices()[1]);expect(score().props.selected).toHaveLength(1);
  await press(choices()[0]);expect(score().props.selected).toHaveLength(1);
  const all=modal.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.findAll(child=>child.type===('Text' as React.ElementType)&&child.props.children===t('allCategories')).length>0)[0];
  await press(all);expect(score().props.selected).toHaveLength(3);
  expect(score().props.selected.map((item:{color:string})=>item.color)).toEqual([habitAccentPalette.green,habitAccentPalette.blue,habitAccentPalette.pink]);
  await press(button(root,t('year')));
  expect(score().props.period).toBe('quarter');
  expect(root.findByType(HistoryChart).props.period).toBe('quarter');
  expect(root.findAll(node=>node.props.accessibilityLabel===t('year')+' '+t('score'))).toHaveLength(0);
  expect(root.findAll(node=>node.props.accessibilityLabel===t('quarter')+' '+t('history'))).toHaveLength(0);
  expect(score().props.buckets).toHaveLength(12);
  expect(score().props.buckets[0].key).toBe('2025-10');
  expect(score().props.buckets[11].key).toBe('2026-09');
  await press(button(root,t('previousPeriod')+' '+t('score')));
  expect(score().props.buckets[11].key).toBe('2025-12');
  expect(root.findByType(HistoryChart).props.buckets[11].key).toBe('2025-12');
  await press(button(root,t('month')));
  expect(score().props.buckets[0].key).toBe('2026-09-01');
  expect(score().props.selected).toHaveLength(3);
});

it('shows daily overview History bars and filters one, two or all roots independently from Score',async()=>{
  const second={...habit,id:'second',name:'Walking',type:'duration' as const,sortOrder:1},third={...habit,id:'third',name:'Yoga',sortOrder:2},child={...habit,id:'child',name:'Child',parentId:habit.id};
  const record=(habitId:string,value:number)=>({id:habitId,habitId,localDate:'2026-09-08',value,occurredAt:'2026-09-08',timezone:'UTC',createdAt:'2026-09-08',updatedAt:'2026-09-08'});
  state.app={...state.app,habits:[habit,second,third,child],entries:[record('habit',1),record('child',1),record('second',3600)]};
  const root=await render(<Insights/>),history=()=>root.findByType(HistoryChart);
  await press(button(root,t('month')));
  expect(history().props.buckets).toHaveLength(30);
  expect(history().props.series.map((item:{values:number[]})=>item.values[7])).toEqual([1,1,0]);
  expect(history().props.type).toBe('boolean');
  await press(button(root,t('selectMultiple')+' '+t('history')));
  const modal=root.findAll(node=>node.type===('Modal' as React.ElementType)&&node.props.visible)[0];
  const choices=()=>modal.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.props.accessibilityRole==='checkbox');
  expect(choices().map(node=>node.props.accessibilityLabel)).toEqual(['Reading','Walking','Yoga']);
  await press(choices()[2]);expect(history().props.series).toHaveLength(2);
  await press(choices()[1]);expect(history().props.series).toHaveLength(1);
  expect(root.findByType(StrengthChart).props.selected).toHaveLength(3);
  const all=modal.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.findAll(child=>child.type===('Text' as React.ElementType)&&child.props.children===t('allCategories')).length>0)[0];
  await press(all);expect(history().props.series).toHaveLength(3);
  await press(button(root,t('year')));
  expect(history().props.buckets).toHaveLength(12);
  expect(history().props.buckets[0].key).toBe('2025-10');
});

it('opens each root detail from its icon and disables all tiles while navigation is pending',async()=>{
  const second={...habit,id:'second',name:'Walking',sortOrder:1};
  state.app={...state.app,habits:[habit,second]};
  const root=await render(<Insights/>),tiles=()=>root.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.props.style?.width==='50%');
  await press(tiles()[0]);expect(state.push).toHaveBeenLastCalledWith('/insight/habit');
  await press(tiles()[1]);expect(state.push).toHaveBeenLastCalledWith('/insight/second');
  state.pending='/insight/second';
  await act(async()=>renderer.update(<Insights/>));
  expect(tiles().every(node=>node.props.disabled)).toBe(true);
  expect(tiles()[1].props.accessibilityState.busy).toBe(true);
});

it('does not recompute history or hidden single-habit summaries when opening comparison filters',async()=>{
  const root=await render(<Insights/>);
  expect(strengthSummary).not.toHaveBeenCalled();
  const calls=vi.mocked(buildRootActivitySeries).mock.calls.length;
  await press(button(root,t('selectMultiple')+' '+t('history')));
  expect(buildRootActivitySeries).toHaveBeenCalledTimes(calls);
  const modal=root.findAll(node=>node.type===('Modal' as React.ElementType)&&node.props.visible)[0];
  await act(async()=>modal.props.onRequestClose());
  expect(buildRootActivitySeries).toHaveBeenCalledTimes(calls);
});

it('handles empty analyses and recovers selection when the selected root is archived',async()=>{
  state.app={...state.app,habits:[],entries:[]};
  const root=await render(<Insights/>);
  expect(root.findAllByType(StrengthChart)).toHaveLength(0);
  expect(root.findAllByType(HistoryChart)).toHaveLength(0);
  const second={...habit,id:'second',name:'Walking'};
  state.app={...state.app,habits:[habit,second]};
  await act(async()=>renderer.update(<Insights/>));
  await press(button(root,t('selectMultiple')));
  const modal=root.findAll(node=>node.type===('Modal' as React.ElementType)&&node.props.visible)[0];
  const reading=modal.findAll(node=>node.type===('TouchableOpacity' as React.ElementType)&&node.props.accessibilityLabel==='Reading')[0];
  await press(reading);
  expect(root.findByType(StrengthChart).props.selected.map((item:{habit:Habit})=>item.habit.id)).toEqual(['second']);
  state.app={...state.app,habits:[habit,{...second,archivedAt:'2026-09-08'}]};
  await act(async()=>renderer.update(<Insights/>));
  expect(root.findByType(StrengthChart).props.selected.map((item:{habit:Habit})=>item.habit.id)).toEqual(['habit']);
});

it.each([['number',9999],['duration',7200]] as const)('keeps %s History labels inside their gutter and omits future readouts',async(type,value)=>{
  const buckets=[{key:'2026-09-08',label:'8',dates:new Set(['2026-09-08'])},{key:'2026-09-09',label:'9',dates:new Set<string>()}];
  const root=await render(<HistoryChart series={[{habit:{...habit,type},color:light.accent,values:[value,0]}]} buckets={buckets} period="month" type={type} c={light}/>);
  const svg=root.findByType('Svg' as React.ElementType);
  expect(svg.props.accessibilityLabel).toContain('2026-09-08');
  expect(svg.props.accessibilityLabel).not.toContain('2026-09-09');
  for(const node of root.findAllByType('SvgText' as React.ElementType).filter(node=>node.props.textAnchor==='end'))expect(node.props.x-String(node.props.children).length*6).toBeGreaterThanOrEqual(0);
  await act(async()=>root.findAllByType('View' as React.ElementType)[0].props.onLayout({nativeEvent:{layout:{width:240}}}));
  expect(svg.props.width).toBe(240);
});

it.each([28,29,30,31])('keeps the final day readable on %i-day monthly axes',async(days)=>{
  const buckets=Array.from({length:days},(_,index)=>({key:`2026-10-${index+1}`,label:String(index+1),dates:new Set<string>()}));
  const root=await render(<><StrengthChart habit={habit} selected={[{habit,color:light.accent}]} habits={[habit]} entries={[]} today="2026-10-02" buckets={buckets} period="month" c={light}/><HistoryChart series={[{habit,color:light.accent,values:buckets.map(()=>0)}]} buckets={buckets} period="month" type="boolean" c={light}/></>);
  for(const chart of [root.findByType(StrengthChart),root.findByType(HistoryChart)]){
    const labels=chart.findAllByType('SvgText' as React.ElementType).filter(node=>node.props.y===178||node.props.y===177);
    expect(labels[0].props.children).toBe('1');
    expect(labels.at(-1)?.props.children).toBe(String(days));
    expect(labels.at(-1)?.props.x-labels.at(-2)?.props.x).toBeGreaterThanOrEqual(24);
  }
});

it('labels every third month in quarterly History while retaining all twelve bars',async()=>{
  const buckets=Array.from({length:12},(_,index)=>({key:`2026-${String(index+1).padStart(2,'0')}`,label:`m${index+1}`,dates:new Set([`2026-${String(index+1).padStart(2,'0')}-01`])}));
  const root=await render(<HistoryChart series={[{habit,color:light.accent,values:buckets.map(()=>1)}]} buckets={buckets} period="quarter" type="boolean" c={light}/>);
  expect(root.findAllByType('Rect' as React.ElementType)).toHaveLength(12);
  expect(root.findAllByType('SvgText' as React.ElementType).filter(node=>node.props.y===177).map(node=>node.props.children)).toEqual(['m1','m4','m7','m10']);
});

it('uses the chosen habit color for overview bars and score series',async()=>{
  state.app={...state.app,habits:[{...habit,color:'purple'}]};
  const overview=await render(<Insights/>);
  expect(overview.findAll(node=>node.type===('View' as React.ElementType)&&node.props.style?.backgroundColor===habitAccentPalette.purple+'3A')).not.toHaveLength(0);
  await act(async()=>renderer.unmount());
  const detail=await render(<InsightDetailScreen/>);
  expect(detail.findAll(node=>node.type===('Polyline' as React.ElementType)&&node.props.stroke===habitAccentPalette.purple)).not.toHaveLength(0);
});
