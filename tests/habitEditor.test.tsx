import React from 'react';
import { act,create,ReactTestRenderer } from 'react-test-renderer';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import HabitEditor from '../app/habit/[id]';
import { language,t } from '../src/i18n';
import { light } from '../src/theme';
import { Habit } from '../src/domain/types';
const mocks=vi.hoisted(()=>({id:'new',habits:[] as Habit[],entries:[] as import('../src/domain/types').Entry[],archive:vi.fn(),remove:vi.fn(),deletionImpact:vi.fn(),create:vi.fn(),createTree:vi.fn(),editTree:vi.fn(),refresh:vi.fn(),leave:vi.fn(),back:vi.fn(),dismissTo:vi.fn(),guard:vi.fn(),alert:vi.fn()}));
vi.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})}));
vi.mock('react-native',()=>({useWindowDimensions:()=>({width:390,height:844,scale:1,fontScale:1}),Keyboard:{addListener:()=>({remove:vi.fn()}),dismiss:vi.fn()},KeyboardAvoidingView:'KeyboardAvoidingView',Pressable:'Pressable',Platform:{OS:'ios'},Modal:'Modal',ActivityIndicator:'Spinner',ScrollView:'ScrollView',Text:'Text',TextInput:'TextInput',TouchableOpacity:'Button',View:'View',Alert:{alert:mocks.alert},StyleSheet:{create:(v:unknown)=>v,hairlineWidth:1}}));
vi.mock('expo-router',()=>({useLocalSearchParams:()=>({id:mocks.id}),router:{back:mocks.back,dismissTo:mocks.dismissTo}}));
vi.mock('../src/features/useDraftGuard',()=>({useDraftGuard:(dirty:boolean)=>{mocks.guard(dirty);return mocks.leave}}));
vi.mock('../src/features/AppProvider',()=>({useApp:()=>({ready:true,habits:mocks.habits,entries:mocks.entries,repo:{archive:mocks.archive,remove:mocks.remove,deletionImpact:mocks.deletionImpact,create:mocks.create,createTree:mocks.createTree,editTree:mocks.editTree},refresh:mocks.refresh,showSuccess:vi.fn(),palette:light})}));
let renderer:ReactTestRenderer;
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});mocks.id='new';mocks.habits=[];mocks.entries=[];vi.clearAllMocks();mocks.create.mockResolvedValue('new');mocks.createTree.mockResolvedValue('new');mocks.editTree.mockResolvedValue(undefined);mocks.refresh.mockResolvedValue(undefined);mocks.archive.mockResolvedValue(undefined);mocks.remove.mockResolvedValue(undefined);mocks.deletionImpact.mockResolvedValue({habits:1,entries:0})});
afterEach(async()=>{await act(async()=>renderer.unmount())});
const colorButton=()=>renderer.root.findAll(node=>node.type as unknown==='Button'&&typeof node.props.accessibilityState?.expanded==='boolean')[0];
const input=(index:number)=>renderer.root.findAll(node=>node.type as unknown==='TextInput')[index];
const button=(text:string)=>renderer.root.findAll(node=>node.type as unknown==='Button').find(node=>node.props.accessibilityLabel===text||node.findAll(child=>child.type as unknown==='Text').some(child=>child.props.children===text))!;
it('creates a colored root with a complete family emoji without a code-unit limit',async()=>{
  await act(async()=>{renderer=create(<HabitEditor/>)});
  expect(input(0).props.maxLength).toBeUndefined();expect(input(0).props.accessibilityLabel).toBe(t('habitEmoji'));
  expect(renderer.root.findAll(node=>node.type as unknown==='Button'&&node.props.accessibilityRole==='radio')).toHaveLength(0);
  await act(async()=>colorButton().props.onPress());
  await act(async()=>{input(0).props.onChangeText('👨‍👩‍👧‍👦');input(1).props.onChangeText('Family');button(t('pink')).props.onPress()});
  expect(colorButton().props.accessibilityState.expanded).toBe(false);
  expect(colorButton().props.accessibilityLabel).toBe(t('habitColor')+': '+t('pink'));
  await act(async()=>colorButton().props.onPress());
  expect(renderer.root.find(node=>node.type as unknown==='Button'&&node.props.accessibilityRole==='radio'&&node.props.accessibilityLabel===t('pink')).props.accessibilityState.checked).toBe(true);
  await act(async()=>colorButton().props.onPress());
  expect(renderer.root.findAll(node=>node.type as unknown==='Button'&&node.props.accessibilityRole==='radio')).toHaveLength(0);
  await act(async()=>button(t('save')).props.onPress());
  expect(mocks.create).toHaveBeenCalledWith({name:'Family',emoji:'👨‍👩‍👧‍👦',color:'pink',type:'boolean',parentId:null});expect(mocks.dismissTo).toHaveBeenCalledWith('/(tabs)');expect(mocks.back).not.toHaveBeenCalled();
});
it('rejects multiple emojis with localized feedback and retains the draft',async()=>{
  await act(async()=>{renderer=create(<HabitEditor/>)});
  await act(async()=>{input(0).props.onChangeText('✨✨');input(1).props.onChangeText('Name')});
  await act(async()=>button(t('save')).props.onPress());expect(mocks.create).not.toHaveBeenCalled();expect(mocks.alert).toHaveBeenCalledWith(t('invalidEmoji'));expect(input(0).props.value).toBe('✨✨');
});
it('preserves a legacy emoji during color editing and lets children reset to inheritance',async()=>{
  const root:Habit={id:'root',parentId:null,name:'Root',emoji:'✨✨',color:'blue',type:'boolean',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'',updatedAt:''};
  mocks.id='root';mocks.habits=[root,{...root,id:'child',parentId:'root',name:'Child',emoji:'👍🏽',color:'pink'}];
  await act(async()=>{renderer=create(<HabitEditor/>)});
  const triggers=renderer.root.findAll(node=>node.type as unknown==='Button'&&node.props.accessibilityState?.expanded===false&&node.props.accessibilityLabel?.startsWith(t('habitColor')));
  await act(async()=>{triggers.forEach(trigger=>trigger.props.onPress())});
  const automatic=renderer.root.findAll(node=>node.props.accessibilityRole==='radio'&&node.props.accessibilityLabel===t('automaticColor'));
  await act(async()=>{automatic[1].props.onPress();button(t('purple')).props.onPress()});
  await act(async()=>button(t('save')).props.onPress());
  expect(mocks.editTree).toHaveBeenCalledWith('root',[{id:'root',name:'Root',emoji:'✨✨',color:'purple',calendarThreshold:null},{id:'child',name:'Child',emoji:'👍🏽',color:null,calendarThreshold:null}],[],[]);
});

it.each([['en-US','Habit color','Automatic','Blue'],['es-ES','Color del hábito','Automático','Azul']])('localizes the collapsed color button and options for %s',async(locale,label,automatic,blue)=>{
  const options=new Intl.DateTimeFormat().resolvedOptions();
  vi.spyOn(Intl.DateTimeFormat.prototype,'resolvedOptions').mockReturnValue({...options,locale});vi.resetModules();
  const {HabitColorPicker}=await import('../src/features/HabitColorPicker');
  const onChange=vi.fn();
  await act(async()=>{renderer=create(<HabitColorPicker value="blue" onChange={onChange} c={light}/>)});
  expect(colorButton().props.accessibilityLabel).toBe(label+': '+blue);
  await act(async()=>colorButton().props.onPress());
  expect(renderer.root.findAll(node=>node.type as unknown==='Button'&&node.props.accessibilityRole==='radio')).toHaveLength(13);
  const option=renderer.root.find(node=>node.type as unknown==='Button'&&node.props.accessibilityRole==='radio'&&node.props.accessibilityLabel===automatic);
  await act(async()=>option.props.onPress());
  expect(onChange).toHaveBeenCalledWith(null);expect(colorButton().props.accessibilityState.expanded).toBe(false);
  vi.restoreAllMocks();
});

it.each([
 ['en-US','Move a habit into Leisure','Move a habit here','Search habits','No compatible categories available.'],
 ['es-ES','Mover un hábito dentro de Leisure','Mover un hábito aquí','Buscar hábitos','No hay categorías compatibles disponibles.'],
])('localizes the move picker and its empty state for %s',async(locale,label,title,search,empty)=>{
 const options=new Intl.DateTimeFormat().resolvedOptions();
 vi.spyOn(Intl.DateTimeFormat.prototype,'resolvedOptions').mockReturnValue({...options,locale});vi.resetModules();
 try{
  const {MoveHabitPicker}=await import('../src/features/MoveHabitPicker');
  await act(async()=>{renderer=create(<MoveHabitPicker habits={[]} type="boolean" excluded={new Set()} parentName="Leisure" onSelect={vi.fn()} c={light}/>)});
  const trigger=renderer.root.find(node=>node.type as unknown==='Button'&&node.props.accessibilityLabel===label);
  await act(async()=>trigger.props.onPress());
  expect(renderer.root.findAll(node=>node.type as unknown==='Text'&&node.props.children===title)).toHaveLength(1);
  expect(renderer.root.findAll(node=>node.type as unknown==='TextInput'&&node.props.accessibilityLabel===search)).toHaveLength(1);
  expect(renderer.root.findAll(node=>node.type as unknown==='Text'&&node.props.children===empty)).toHaveLength(1);
 }finally{vi.restoreAllMocks()}
});
it('defaults new roots to automatic and treats the untouched or reverted color as clean',async()=>{
  await act(async()=>{renderer=create(<HabitEditor/>)});
  expect(colorButton().props.accessibilityLabel).toBe(t('habitColor')+': '+t('automaticColor'));expect(mocks.guard).toHaveBeenLastCalledWith(false);
  await act(async()=>colorButton().props.onPress());await act(async()=>button(t('blue')).props.onPress());expect(mocks.guard).toHaveBeenLastCalledWith(true);
  await act(async()=>colorButton().props.onPress());await act(async()=>button(t('automaticColor')).props.onPress());expect(mocks.guard).toHaveBeenLastCalledWith(false);
  await act(async()=>input(1).props.onChangeText('Automatic habit'));await act(async()=>button(t('save')).props.onPress());
  expect(mocks.create).toHaveBeenCalledWith({name:'Automatic habit',emoji:'✨',color:null,type:'boolean',parentId:null});
});
it('cancel returns to Home without saving or bypassing the draft guard',async()=>{
  await act(async()=>{renderer=create(<HabitEditor/>)});
  await act(async()=>button(t('cancel')).props.onPress());
  expect(mocks.dismissTo).toHaveBeenCalledWith('/(tabs)');expect(mocks.back).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();expect(mocks.editTree).not.toHaveBeenCalled();expect(mocks.leave).not.toHaveBeenCalled();
});

it('creates a hidden root and guards unsaved visibility changes',async()=>{
  await act(async()=>{renderer=create(<HabitEditor/>)});
  expect(button(t('hideFromOverview')).props.accessibilityState.checked).toBe(false);
  await act(async()=>button(t('hideFromOverview')).props.onPress());expect(mocks.guard).toHaveBeenLastCalledWith(true);
  await act(async()=>button(t('hideFromOverview')).props.onPress());expect(mocks.guard).toHaveBeenLastCalledWith(false);
  await act(async()=>{input(1).props.onChangeText('Private category');button(t('hideFromOverview')).props.onPress()});
  await act(async()=>button(t('save')).props.onPress());
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({parentId:null,hideFromOverview:true}));
});
it('offers visibility only for the root and can restore it to overview',async()=>{
  const root:Habit={id:'root',parentId:null,name:'Root',emoji:'✨',type:'boolean',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'',updatedAt:'',hideFromOverview:true};
  mocks.id='child';mocks.habits=[root,{...root,id:'child',parentId:'root',hideFromOverview:undefined}];
  await act(async()=>{renderer=create(<HabitEditor/>)});
  expect(renderer.root.findAll(node=>node.type as unknown==='Button'&&node.props.accessibilityRole==='switch')).toHaveLength(2);
  expect(button(t('hideFromOverview')).props.accessibilityState.checked).toBe(true);
  await act(async()=>button(t('hideFromOverview')).props.onPress());expect(mocks.guard).toHaveBeenLastCalledWith(true);
  await act(async()=>button(t('save')).props.onPress());
  expect(mocks.editTree.mock.calls[0][1][0]).toEqual(expect.objectContaining({id:'root',hideFromOverview:false}));
  expect(mocks.editTree.mock.calls[0][1][1].hideFromOverview).toBeUndefined();
});

it('creates and edits complete hiding without changing the separate overview preference',async()=>{
  await act(async()=>{renderer=create(<HabitEditor/>)});
  await act(async()=>{input(1).props.onChangeText('Hidden');button(t('hideCompletely')).props.onPress()});
  expect(button(t('hideCompletely')).props.accessibilityState.checked).toBe(true);
  await act(async()=>button(t('save')).props.onPress());expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({isHidden:true}));
  expect(mocks.create.mock.calls[0][0].hideFromOverview).toBeUndefined();
  const root:Habit={id:'root',parentId:null,name:'Root',emoji:'✨',type:'boolean',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'',updatedAt:'',isHidden:true};
  mocks.id='root';mocks.habits=[root];await act(async()=>renderer.update(<HabitEditor/>));
  expect(button(t('hideCompletely')).props.accessibilityState.checked).toBe(true);
  await act(async()=>button(t('hideCompletely')).props.onPress());await act(async()=>button(t('save')).props.onPress());
  expect(mocks.editTree.mock.calls[0][1][0]).toEqual(expect.objectContaining({id:'root',isHidden:false}));
});

it.each(['number','duration'] as const)('creates a %s habit with an optional color threshold',async type=>{
 await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>{input(1).props.onChangeText('Practice');button(t(type)).props.onPress()});
 const threshold=()=>renderer.root.findAll(node=>node.type as unknown==='TextInput'&&node.props.accessibilityLabel===t('calendarThresholdFor',{name:'Practice'}))[0];
 await act(async()=>threshold().props.onChangeText('2,5'));
 await act(async()=>button(t('save')).props.onPress());
 expect(mocks.create.mock.calls[0][0].calendarThreshold).toBe(type==='duration'?150:2.5);
});
it.each(['number','duration'] as const)('preserves the %s threshold when reselecting the current type',async type=>{
 await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>{input(1).props.onChangeText('Practice');button(t(type)).props.onPress()});
 const threshold=()=>renderer.root.findAll(node=>node.type as unknown==='TextInput'&&node.props.accessibilityLabel===t('calendarThresholdFor',{name:'Practice'}))[0];
 await act(async()=>threshold().props.onChangeText('2.5'));
 await act(async()=>button(t(type)).props.onPress());
 expect(threshold().props.value).toBe('2.5');
 await act(async()=>button(t('save')).props.onPress());
 expect(mocks.create.mock.calls[0][0].calendarThreshold).toBe(type==='duration'?150:2.5);
});
it('preserves duration thresholds when changing units and rejects invalid drafts',async()=>{
 await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>{input(1).props.onChangeText('Practice');button(t('duration')).props.onPress()});
 const threshold=()=>renderer.root.findAll(node=>node.type as unknown==='TextInput'&&node.props.accessibilityLabel===t('calendarThresholdFor',{name:'Practice'}))[0];
 await act(async()=>threshold().props.onChangeText('30'));
 await act(async()=>button(t('hours')).props.onPress());expect(threshold().props.value).toBe('0.5');
 await act(async()=>threshold().props.onChangeText('-1'));
 await act(async()=>button(t('save')).props.onPress());expect(mocks.create).not.toHaveBeenCalled();expect(mocks.alert).toHaveBeenLastCalledWith(t('invalidCalendarThreshold'));
 await act(async()=>threshold().props.onChangeText(''));
 await act(async()=>button(t('save')).props.onPress());expect(mocks.create.mock.calls[0][0].calendarThreshold).toBeUndefined();
});
it('retains an invalid duration draft across unit changes and rejects non-finite values',async()=>{
 await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>{input(1).props.onChangeText('Practice');button(t('duration')).props.onPress()});
 const threshold=()=>renderer.root.findAll(node=>node.type as unknown==='TextInput'&&node.props.accessibilityLabel===t('calendarThresholdFor',{name:'Practice'}))[0];
 await act(async()=>threshold().props.onChangeText('invalid'));
 await act(async()=>button(t('hours')).props.onPress());expect(threshold().props.value).toBe('invalid');
 await act(async()=>button(t('save')).props.onPress());expect(mocks.create).not.toHaveBeenCalled();
 await act(async()=>threshold().props.onChangeText('1e309'));
 await act(async()=>button(t('minutes')).props.onPress());expect(threshold().props.value).toBe('1e309');
 await act(async()=>button(t('save')).props.onPress());expect(mocks.create).not.toHaveBeenCalled();
});

const category=(id:string,type:Habit['type']='boolean',parentId:string|null=null):Habit=>({id,name:id,emoji:'✨',type,parentId,isGeneral:false,sortOrder:0,archivedAt:null,createdAt:'',updatedAt:''});
it('shows live root and child name counts without truncating the draft',async()=>{
 await act(async()=>{renderer=create(<HabitEditor/>)});
 const counter=(count:number)=>renderer.root.findAll(node=>node.type as unknown==='Text'&&node.props.accessibilityLabel===t('habitNameCount',{count,limit:25}));
 expect(counter(0)).toHaveLength(1);
 await act(async()=>input(1).props.onChangeText('  🌱Plan  '));expect(counter(5)).toHaveLength(1);
 await act(async()=>button(t('addChild')).props.onPress());expect(counter(0)).toHaveLength(1);
 await act(async()=>input(3).props.onChangeText('a'.repeat(26)));expect(counter(26)).toHaveLength(1);expect(input(3).props.value).toHaveLength(26);
});
it('reports child deletion review failures and stages a successful retry without deleting immediately',async()=>{
 mocks.id='Root';mocks.habits=[category('Root'),category('Child','boolean','Root')];
 mocks.deletionImpact.mockRejectedValueOnce(new Error('Synthetic child review failure'));
 await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>button(t('delete')+' Child').props.onPress());
 expect(mocks.alert).toHaveBeenLastCalledWith(t('couldNotSave'),'Synthetic child review failure');
 expect(input(3).props.value).toBe('Child');expect(button(t('save')).props.disabled).toBe(false);
 let review!:Promise<void>;await act(async()=>{review=button(t('delete')+' Child').props.onPress()});
 expect(button(t('save')).props.disabled).toBe(true);
 await act(async()=>{mocks.alert.mock.calls.at(-1)![2][1].onPress();await review});
 expect(mocks.remove).not.toHaveBeenCalled();expect(mocks.editTree).not.toHaveBeenCalled();
 await act(async()=>button(t('save')).props.onPress());expect(mocks.editTree.mock.calls[0][3]).toEqual(['Child']);
});
it.each(['new','existing'] as const)('explains blank and overlong %s root names without writing',async mode=>{
 if(mode==='existing'){mocks.id='Root';mocks.habits=[category('Root')]}
 await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>input(1).props.onChangeText('   '));await act(async()=>button(t('save')).props.onPress());
 expect(mocks.alert).toHaveBeenLastCalledWith(t('nameRequired'));
 await act(async()=>input(1).props.onChangeText('a'.repeat(26)));await act(async()=>button(t('save')).props.onPress());
 expect(mocks.alert).toHaveBeenLastCalledWith(t('habitNameTooLong',{limit:25}));expect(mocks.create).not.toHaveBeenCalled();expect(mocks.editTree).not.toHaveBeenCalled();
 expect(input(1).props.accessibilityHint).toBe(t('habitNameLimitHelp',{limit:25}));
});
it('validates child names while retaining unchanged legacy names',async()=>{
 mocks.id='Root';mocks.habits=[{...category('Root'),name:'a'.repeat(60)}];
 await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>button(t('addChild')).props.onPress());await act(async()=>input(3).props.onChangeText('b'.repeat(26)));
 await act(async()=>button(t('save')).props.onPress());expect(mocks.alert).toHaveBeenLastCalledWith(t('habitNameTooLong',{limit:25}));expect(mocks.editTree).not.toHaveBeenCalled();
 await act(async()=>input(3).props.onChangeText('Valid child'));await act(async()=>button(t('save')).props.onPress());expect(mocks.editTree).toHaveBeenCalledOnce();
});
it.each([false,true])('confirms discarding a dirty draft before archive/restore (archived: %s)',async archived=>{
 mocks.id='Root';mocks.habits=[{...category('Root'),archivedAt:archived?'2026-01-01':null}];
 await act(async()=>{renderer=create(<HabitEditor/>)});await act(async()=>input(1).props.onChangeText('Unsaved name'));
 let action!:Promise<void>;await act(async()=>{action=button(t(archived?'restore':'archive')).props.onPress()});
 expect(mocks.archive).not.toHaveBeenCalled();expect(mocks.alert).toHaveBeenLastCalledWith(t('archiveDraftTitle'),t('archiveDraftHelp'),expect.any(Array),expect.any(Object));
 await act(async()=>{mocks.alert.mock.calls.at(-1)![2][0].onPress();await action});expect(mocks.archive).not.toHaveBeenCalled();expect(input(1).props.value).toBe('Unsaved name');
 await act(async()=>{action=button(t(archived?'restore':'archive')).props.onPress()});
 await act(async()=>{mocks.alert.mock.calls.at(-1)![2][1].onPress();await action});
 expect(mocks.archive).toHaveBeenCalledExactlyOnceWith('Root',!archived);expect(mocks.editTree).not.toHaveBeenCalled();expect(mocks.dismissTo).toHaveBeenCalledOnce();
});
it.each(['new','existing'] as const)('retries only refresh after a committed %s save',async mode=>{
 if(mode==='existing'){mocks.id='Root';mocks.habits=[category('Root')]}
 mocks.refresh.mockRejectedValueOnce(new Error('Synthetic refresh failure'));
 await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>input(1).props.onChangeText('Saved name'));
 await act(async()=>button(t('save')).props.onPress());
 expect(mocks.alert).toHaveBeenLastCalledWith(t('habitSavedRefreshFailed'),t('habitSavedRefreshFailedHelp'));
 expect(mocks.dismissTo).not.toHaveBeenCalled();
 expect(renderer.root.findAll(node=>node.type as unknown==='View'&&node.props.pointerEvents==='none').length).toBeGreaterThan(0);
 await act(async()=>button(t('save')).props.onPress());
 expect(mode==='new'?mocks.create:mocks.editTree).toHaveBeenCalledOnce();expect(mocks.refresh).toHaveBeenCalledTimes(2);
 expect(mocks.dismissTo).toHaveBeenCalledExactlyOnceWith('/(tabs)');
});
it('keeps an invalid new-child draft open without treating validation as a committed save',async()=>{
 await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>input(1).props.onChangeText('Root'));
 await act(async()=>button(t('addChild')).props.onPress());
 await act(async()=>button(t('save')).props.onPress());
 expect(mocks.alert).toHaveBeenLastCalledWith(t('nameRequired'));expect(mocks.createTree).not.toHaveBeenCalled();expect(mocks.refresh).not.toHaveBeenCalled();expect(mocks.dismissTo).not.toHaveBeenCalled();
 await act(async()=>input(3).props.onChangeText('Child'));
 await act(async()=>button(t('save')).props.onPress());expect(mocks.createTree).toHaveBeenCalledOnce();expect(mocks.dismissTo).toHaveBeenCalledOnce();
});
it.each(['archive','delete'] as const)('guards duplicate %s writes and retries refresh without repeating the mutation',async action=>{
 mocks.id='Root';mocks.habits=[category('Root')];mocks.refresh.mockRejectedValueOnce(new Error('Refresh failed'));
 await act(async()=>{renderer=create(<HabitEditor/>)});
 const start=()=>button(t(action==='archive'?'archive':'delete')).props.onPress();
 if(action==='archive')await act(async()=>{await Promise.all([start(),start()])});
 else{
  await act(async()=>{await Promise.all([start(),start()])});expect(mocks.deletionImpact).toHaveBeenCalledOnce();
  const confirm=mocks.alert.mock.calls[0][2][1].onPress;
  await act(async()=>{await Promise.all([confirm(),confirm()])});
 }
 expect(action==='archive'?mocks.archive:mocks.remove).toHaveBeenCalledOnce();
 expect(mocks.alert).toHaveBeenLastCalledWith(t('habitSavedRefreshFailed'),t('habitSavedRefreshFailedHelp'));
 await act(async()=>button(t('save')).props.onPress());
 expect(action==='archive'?mocks.archive:mocks.remove).toHaveBeenCalledOnce();expect(mocks.refresh).toHaveBeenCalledTimes(2);
 expect(mocks.dismissTo).toHaveBeenCalledExactlyOnceWith('/(tabs)');
});
it.each(['archive','delete','impact'] as const)('reports %s failures and allows a retry',async action=>{
 mocks.id='Root';mocks.habits=[category('Root')];
 const operation=action==='archive'?mocks.archive:action==='delete'?mocks.remove:mocks.deletionImpact;
 operation.mockRejectedValueOnce(new Error('Synthetic action failure'));
 await act(async()=>{renderer=create(<HabitEditor/>)});
 const trigger=()=>button(t(action==='archive'?'archive':'delete')).props.onPress();
 await act(async()=>trigger());
 if(action==='delete')await act(async()=>mocks.alert.mock.calls[0][2][1].onPress());
 expect(mocks.alert).toHaveBeenLastCalledWith(t('couldNotSave'),'Synthetic action failure');expect(mocks.refresh).not.toHaveBeenCalled();
 await act(async()=>trigger());
 if(action!=='archive')await act(async()=>mocks.alert.mock.calls.at(-1)![2][1].onPress());
 expect(mocks.dismissTo).toHaveBeenCalledExactlyOnceWith('/(tabs)');
});
it.each(['rename','hideCompletely','hideFromOverview'] as const)('dismisses stale detail routes after saving %s from a descendant editor',async change=>{
 mocks.id='Child';mocks.habits=[category('Root'),category('Child','boolean','Root')];
 await act(async()=>{renderer=create(<HabitEditor/>)});
 if(change==='rename')await act(async()=>input(1).props.onChangeText('Renamed'));
 else await act(async()=>button(t(change)).props.onPress());
 await act(async()=>button(t('save')).props.onPress());
 expect(mocks.editTree).toHaveBeenCalledOnce();expect(mocks.refresh).toHaveBeenCalledOnce();
 expect(mocks.leave).toHaveBeenCalledOnce();expect(mocks.dismissTo).toHaveBeenCalledWith('/(tabs)');expect(mocks.back).not.toHaveBeenCalled();
});
it.each(['boolean','number','duration'] as const)('stages compatible %s roots under a new category until Save',async type=>{
 mocks.habits=[category('Reading',type),category('Painting',type),category('Different',type==='boolean'?'number':'boolean')];
 await act(async()=>{renderer=create(<HabitEditor/>)});
 if(type!=='boolean')await act(async()=>button(t(type)).props.onPress());
 await act(async()=>input(1).props.onChangeText('Leisure'));
 await act(async()=>button(t('addExistingTo',{name:'Leisure'})).props.onPress());
 expect(button(t('selectExistingCategory',{name:'Different'}))).toBeUndefined();
 await act(async()=>button(t('selectExistingCategory',{name:'Reading'})).props.onPress());await act(async()=>button(t('confirmCategoryMove')).props.onPress());
 expect(mocks.createTree).not.toHaveBeenCalled();expect(mocks.guard).toHaveBeenLastCalledWith(true);
 await act(async()=>button(t('addExistingTo',{name:'Leisure'})).props.onPress());
 expect(button(t('selectExistingCategory',{name:'Reading'}))).toBeUndefined();
 await act(async()=>button(t('selectExistingCategory',{name:'Painting'})).props.onPress());await act(async()=>button(t('confirmCategoryMove')).props.onPress());
 await act(async()=>button(t('save')).props.onPress());
 expect(mocks.create).not.toHaveBeenCalled();expect(mocks.createTree).toHaveBeenCalledWith(expect.objectContaining({name:'Leisure',type}),expect.any(Array),[],[{id:'Reading',parentKey:expect.any(String),expectedParentId:null,index:0},{id:'Painting',parentKey:expect.any(String),expectedParentId:null,index:1}],expect.any(String));
});
it('stages an existing grandchild under a draft child of an existing root',async()=>{
 mocks.id='Leisure';mocks.habits=[category('Leisure'),category('Other'),category('Arts','boolean','Other'),category('Painting','boolean','Arts')];
 await act(async()=>{renderer=create(<HabitEditor/>)});await act(async()=>button(t('addChild')).props.onPress());
 await act(async()=>input(3).props.onChangeText('Creative'));
 await act(async()=>button(t('addExistingTo',{name:'Creative'})).props.onPress());
 await act(async()=>button(t('selectExistingCategory',{name:'Other / Arts / Painting'})).props.onPress());await act(async()=>button(t('confirmCategoryMove')).props.onPress());
 await act(async()=>button(t('save')).props.onPress());
 const [root,,creates,,moves]=mocks.editTree.mock.calls[0];expect(root).toBe('Leisure');expect(moves).toEqual([{id:'Painting',parentKey:creates[0].key,expectedParentId:'Arts',index:0}]);
});
it('previews full destination ancestry using edited names and submits new-child positions',async()=>{
 mocks.id='Leisure';mocks.habits=[category('Leisure'),category('Arts','boolean','Leisure'),category('Creative','boolean','Arts'),category('Reading')];
 await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>input(1).props.onChangeText('Renamed root'));
 await act(async()=>button(t('addExistingTo',{name:'Creative'})).props.onPress());
 await act(async()=>button(t('selectExistingCategory',{name:'Reading'})).props.onPress());
 expect(renderer.root.findAll(node=>node.type as unknown==='Text'&&Array.isArray(node.props.children)&&node.props.children.join('')==='Renamed root / Arts / Creative / Reading')).toHaveLength(1);
 await act(async()=>button(t('close')).props.onPress());
 await act(async()=>button(t('addChild')).props.onPress());
 await act(async()=>input(3).props.onChangeText('First'));
 await act(async()=>button(t('save')).props.onPress());
 expect(mocks.editTree.mock.calls[0][2]).toEqual([expect.objectContaining({name:'First',parentKey:'Leisure',index:0})]);
});

it('removing a staged attachment cancels its move without deleting the original category',async()=>{
 mocks.id='Leisure';mocks.habits=[category('Leisure'),category('Reading')];
 await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>button(t('addExistingTo',{name:'Leisure'})).props.onPress());await act(async()=>button(t('selectExistingCategory',{name:'Reading'})).props.onPress());await act(async()=>button(t('confirmCategoryMove')).props.onPress());
 await act(async()=>button(t('cancelCategoryMove',{name:'Reading'})).props.onPress());expect(mocks.alert).not.toHaveBeenCalled();expect(mocks.guard).toHaveBeenLastCalledWith(false);
 await act(async()=>button(t('save')).props.onPress());expect(mocks.editTree).toHaveBeenCalledWith('Leisure',expect.any(Array),[],[]);
});

it('cancels nested attachments when their new draft parent is removed',async()=>{
 mocks.id='Leisure';mocks.habits=[category('Leisure'),category('Reading')];
 await act(async()=>{renderer=create(<HabitEditor/>)});await act(async()=>button(t('addChild')).props.onPress());await act(async()=>input(3).props.onChangeText('Arts'));
 await act(async()=>button(t('addExistingTo',{name:'Arts'})).props.onPress());await act(async()=>button(t('selectExistingCategory',{name:'Reading'})).props.onPress());await act(async()=>button(t('confirmCategoryMove')).props.onPress());
 await act(async()=>button(t('delete')+' Arts').props.onPress());await act(async()=>button(t('save')).props.onPress());expect(mocks.editTree).toHaveBeenCalledWith('Leisure',expect.any(Array),[],[]);
});
it('guards duplicate saves and retains the attachment draft after a failed write',async()=>{
 mocks.id='Leisure';mocks.habits=[category('Leisure'),category('Reading')];let reject!:(error:Error)=>void;mocks.editTree.mockImplementationOnce(()=>new Promise<void>((_,fail)=>{reject=fail}));
 await act(async()=>{renderer=create(<HabitEditor/>)});await act(async()=>button(t('addExistingTo',{name:'Leisure'})).props.onPress());await act(async()=>button(t('selectExistingCategory',{name:'Reading'})).props.onPress());await act(async()=>button(t('confirmCategoryMove')).props.onPress());
 let write!:Promise<void>;await act(async()=>{write=button(t('save')).props.onPress();void button(t('save')).props.onPress()});expect(mocks.editTree).toHaveBeenCalledOnce();expect(button(t('save')).props.disabled).toBe(true);
 await act(async()=>{reject(new Error('Synthetic save failure'));await write});expect(mocks.back).not.toHaveBeenCalled();expect(button(t('cancelCategoryMove',{name:'Reading'}))).toBeDefined();expect(button(t('save')).props.disabled).toBe(false);
});

it('leaves attachments unwritten when canceling and resets them when a new root type changes',async()=>{
 mocks.habits=[category('Reading')];await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>button(t('addExistingTo',{name:t('newCategory')})).props.onPress());await act(async()=>button(t('selectExistingCategory',{name:'Reading'})).props.onPress());await act(async()=>button(t('confirmCategoryMove')).props.onPress());
 await act(async()=>button(t('cancel')).props.onPress());expect(mocks.create).not.toHaveBeenCalled();expect(mocks.createTree).not.toHaveBeenCalled();expect(mocks.editTree).not.toHaveBeenCalled();
 await act(async()=>button(t('number')).props.onPress());expect(button(t('cancelCategoryMove',{name:'Reading'}))).toBeUndefined();
 await act(async()=>button(t('addExistingTo',{name:t('newCategory')})).props.onPress());expect(button(t('selectExistingCategory',{name:'Reading'}))).toBeUndefined();
});

const historicalRecord=(id:string,value:number,habitId='Root'):import('../src/domain/types').Entry=>({id,value,habitId,localDate:'2025-01-01',occurredAt:'original',timezone:'UTC',createdAt:'created',updatedAt:'updated'});
it('searches full paths and previews a move before staging it',async()=>{
 mocks.id='Leisure';mocks.habits=[category('Leisure'),category('Other'),category('Arts','boolean','Other'),category('Painting','boolean','Arts'),category('Numeric','number')];
 await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>button(t('addExistingTo',{name:'Leisure'})).props.onPress());
 expect(button(t('confirmCategoryMove')).props.disabled).toBe(true);
 const search=renderer.root.find(node=>node.type as unknown==='TextInput'&&node.props.accessibilityLabel===t('searchHabits'));
 await act(async()=>search.props.onChangeText('other / arts / paint'));
 expect(button(t('selectExistingCategory',{name:'Other'}))).toBeUndefined();expect(button(t('selectExistingCategory',{name:'Numeric'}))).toBeUndefined();
 await act(async()=>button(t('selectExistingCategory',{name:'Other / Arts / Painting'})).props.onPress());
 expect(renderer.root.findAll(node=>node.type as unknown==='Text'&&Array.isArray(node.props.children)&&node.props.children.join('')==='Leisure / Painting')).toHaveLength(1);
 expect(mocks.guard).toHaveBeenLastCalledWith(false);expect(mocks.editTree).not.toHaveBeenCalled();
 await act(async()=>button(t('chooseAnotherHabit')).props.onPress());
 await act(async()=>button(t('selectExistingCategory',{name:'Other / Arts / Painting'})).props.onPress());
 await act(async()=>button(t('confirmCategoryMove')).props.onPress());
 expect(renderer.root.findAll(node=>node.type as unknown==='Modal')).toHaveLength(0);expect(mocks.guard).toHaveBeenLastCalledWith(true);expect(mocks.editTree).not.toHaveBeenCalled();
});
it.each(['close','nativeBack','escape'] as const)('dismisses the move preview through %s without changing the draft',async method=>{
 mocks.id='Leisure';mocks.habits=[category('Leisure'),category('Reading')];
 await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>button(t('addExistingTo',{name:'Leisure'})).props.onPress());
 await act(async()=>button(t('selectExistingCategory',{name:'Reading'})).props.onPress());
 await act(async()=>{
  if(method==='close')button(t('close')).props.onPress();
  else if(method==='nativeBack')renderer.root.find(node=>node.type as unknown==='Modal').props.onRequestClose();
  else renderer.root.find(node=>node.type as unknown==='Pressable'&&node.props.accessibilityViewIsModal).props.onAccessibilityEscape();
 });
 expect(mocks.guard).toHaveBeenLastCalledWith(false);expect(mocks.editTree).not.toHaveBeenCalled();
 await act(async()=>button(t('addExistingTo',{name:'Leisure'})).props.onPress());
 expect(button(t('confirmCategoryMove')).props.disabled).toBe(true);
 expect(button(t('selectExistingCategory',{name:'Reading'}))).toBeDefined();
});
const labeledInput=(label:string)=>renderer.root.find(node=>node.type as unknown==='TextInput'&&node.props.accessibilityLabel===label);
it.each(['number','duration'] as const)('asks before converting Boolean history to %s with the selected historical value',async type=>{
 mocks.id='Root';mocks.habits=[category('Root'),category('Child','boolean','Root')];mocks.entries=[historicalRecord('yes',1,'Child')];await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>button(t(type)).props.onPress());await act(async()=>labeledInput(t(type==='number'?'historyQuantity':'historyDuration')).props.onChangeText(type==='number'?'2.5':'1.5'));
 if(type==='duration')await act(async()=>button(t('hours')).props.onPress());
 let save!:Promise<void>;await act(async()=>{save=button(t('save')).props.onPress();void button(t('save')).props.onPress()});
 expect(mocks.editTree).not.toHaveBeenCalled();expect(mocks.alert).toHaveBeenCalledOnce();expect(mocks.alert.mock.calls[0][0]).toBe(t('confirmHabitTypeChange'));expect(mocks.alert.mock.calls[0][1]).toContain(language==='es'?(type==='number'?'2,5':'0,025 horas'):(type==='number'?'2.5':'0.025 hours'));
 await act(async()=>{mocks.alert.mock.calls[0][2][1].onPress();await save});
 expect(mocks.editTree).toHaveBeenCalledOnce();expect(mocks.editTree.mock.calls[0][5]).toEqual({from:'boolean',to:type,trueValue:type==='number'?2.5:90,expectedHabitIds:['Root','Child'],expectedEntries:mocks.entries});expect(mocks.dismissTo).toHaveBeenCalledWith('/(tabs)');expect(mocks.back).not.toHaveBeenCalled();
});
it('uses a duration-per-unit equivalence for proportional numeric conversion',async()=>{
 mocks.id='Root';mocks.habits=[category('Root','number')];mocks.entries=[historicalRecord('record',2)];await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>button(t('duration')).props.onPress());await act(async()=>labeledInput(t('historyUnitDuration')).props.onChangeText('30'));
 let save!:Promise<void>;await act(async()=>{save=button(t('save')).props.onPress()});expect(mocks.alert.mock.calls[0][1]).toContain('30');
 await act(async()=>{mocks.alert.mock.calls[0][2][1].onPress();await save});expect(mocks.editTree.mock.calls[0][5].unitDurationSeconds).toBe(1800);
});
it.each(['cancel','dismiss'] as const)('leaves history and other draft edits unwritten when conversion confirmation is %s',async action=>{
 mocks.id='Root';mocks.habits=[category('Root','number')];mocks.entries=[historicalRecord('zero',0)];await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>{input(1).props.onChangeText('Renamed');button(t('boolean')).props.onPress()});let save!:Promise<void>;await act(async()=>{save=button(t('save')).props.onPress()});
 expect(mocks.alert.mock.calls[0][1]).toBe(t('confirmBooleanConversion',{name:'Renamed',habits:1,records:1,type:t('boolean'),value:''}));
 await act(async()=>{if(action==='cancel')mocks.alert.mock.calls[0][2][0].onPress();else mocks.alert.mock.calls[0][3].onDismiss();await save});
 expect(mocks.editTree).not.toHaveBeenCalled();expect(mocks.back).not.toHaveBeenCalled();expect(input(1).props.value).toBe('Renamed');expect(button(t('save')).props.disabled).toBe(false);
});
it('rejects blank, negative and fractional-second historical durations before confirmation',async()=>{
 mocks.id='Root';mocks.habits=[category('Root')];mocks.entries=[historicalRecord('yes',1)];await act(async()=>{renderer=create(<HabitEditor/>)});await act(async()=>button(t('duration')).props.onPress());
 for(const value of ['', '-1','0.0001']){await act(async()=>labeledInput(t('historyDuration')).props.onChangeText(value));await act(async()=>button(t('save')).props.onPress());expect(mocks.alert).toHaveBeenLastCalledWith(t('invalidHistoryValue'))}
 expect(mocks.editTree).not.toHaveBeenCalled();
});
it('restores unsaved thresholds and a clean draft when reverting a type selection',async()=>{
 mocks.id='Root';mocks.habits=[{...category('Root','number'),calendarThreshold:10},{...category('Child','number','Root'),calendarThreshold:20}];await act(async()=>{renderer=create(<HabitEditor/>)});
 await act(async()=>button(t('boolean')).props.onPress());expect(renderer.root.findAll(node=>node.type as unknown==='TextInput'&&node.props.accessibilityLabel===t('calendarThresholdFor',{name:'Root'}))).toHaveLength(0);
 await act(async()=>button(t('number')).props.onPress());expect(labeledInput(t('calendarThresholdFor',{name:'Root'})).props.value).toBe('10');expect(labeledInput(t('calendarThresholdFor',{name:'Child'})).props.value).toBe('20');expect(mocks.guard).toHaveBeenLastCalledWith(false);
});
it('retains the conversion draft and shows localized guidance if the reviewed history changed',async()=>{
 mocks.id='Root';mocks.habits=[category('Root','number')];mocks.editTree.mockRejectedValueOnce(new Error('TYPE_CHANGE_STALE'));await act(async()=>{renderer=create(<HabitEditor/>)});await act(async()=>button(t('boolean')).props.onPress());
 let save!:Promise<void>;await act(async()=>{save=button(t('save')).props.onPress()});await act(async()=>{mocks.alert.mock.calls[0][2][1].onPress();await save});expect(mocks.alert).toHaveBeenLastCalledWith(t('couldNotSave'),t('typeChangeStaleHelp'));expect(mocks.back).not.toHaveBeenCalled();expect(button(t('boolean')).props.accessibilityState.selected).toBe(true);
});

it('changes an empty category without asking for an unused historical value',async()=>{
 mocks.id='Root';mocks.habits=[category('Root')];await act(async()=>{renderer=create(<HabitEditor/>)});await act(async()=>button(t('number')).props.onPress());
 expect(renderer.root.findAll(node=>node.type as unknown==='TextInput'&&node.props.accessibilityLabel===t('historyQuantity'))).toHaveLength(0);
 let save!:Promise<void>;await act(async()=>{save=button(t('save')).props.onPress()});expect(mocks.alert.mock.calls[0][1]).toBe(t('confirmEmptyHistory',{name:'Root',habits:1,type:t('number')}));
 await act(async()=>{mocks.alert.mock.calls[0][2][1].onPress();await save});expect(mocks.editTree.mock.calls[0][5].expectedEntries).toEqual([]);
});
