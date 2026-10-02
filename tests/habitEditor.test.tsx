import React from 'react';
import { act,create,ReactTestRenderer } from 'react-test-renderer';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import HabitEditor from '../app/habit/[id]';
import { t } from '../src/i18n';
import { light } from '../src/theme';
import { Habit } from '../src/domain/types';
const mocks=vi.hoisted(()=>({id:'new',habits:[] as Habit[],create:vi.fn(),editTree:vi.fn(),refresh:vi.fn(),leave:vi.fn(),back:vi.fn(),dismissTo:vi.fn(),guard:vi.fn(),alert:vi.fn()}));
vi.mock('react-native',()=>({ActivityIndicator:'Spinner',ScrollView:'ScrollView',Text:'Text',TextInput:'TextInput',TouchableOpacity:'Button',View:'View',Alert:{alert:mocks.alert},StyleSheet:{create:(v:unknown)=>v,hairlineWidth:1}}));
vi.mock('expo-router',()=>({useLocalSearchParams:()=>({id:mocks.id}),router:{back:mocks.back,dismissTo:mocks.dismissTo}}));
vi.mock('../src/features/useDraftGuard',()=>({useDraftGuard:(dirty:boolean)=>{mocks.guard(dirty);return mocks.leave}}));
vi.mock('../src/features/AppProvider',()=>({useApp:()=>({ready:true,habits:mocks.habits,repo:{create:mocks.create,editTree:mocks.editTree},refresh:mocks.refresh,showSuccess:vi.fn(),palette:light})}));
let renderer:ReactTestRenderer;
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});mocks.id='new';mocks.habits=[];vi.clearAllMocks();mocks.create.mockResolvedValue('new');mocks.editTree.mockResolvedValue(undefined);mocks.refresh.mockResolvedValue(undefined)});
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
  expect(mocks.create).toHaveBeenCalledWith({name:'Family',emoji:'👨‍👩‍👧‍👦',color:'pink',type:'boolean',parentId:null});expect(mocks.back).toHaveBeenCalledOnce();
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
  const triggers=renderer.root.findAll(node=>node.type as unknown==='Button'&&node.props.accessibilityState?.expanded===false);
  await act(async()=>{triggers.forEach(trigger=>trigger.props.onPress())});
  const automatic=renderer.root.findAll(node=>node.props.accessibilityRole==='radio'&&node.props.accessibilityLabel===t('automaticColor'));
  await act(async()=>{automatic[1].props.onPress();button(t('purple')).props.onPress()});
  await act(async()=>button(t('save')).props.onPress());
  expect(mocks.editTree).toHaveBeenCalledWith('root',[{id:'root',name:'Root',emoji:'✨✨',color:'purple'},{id:'child',name:'Child',emoji:'👍🏽',color:null}],[],[]);
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

it('defaults new roots to green and treats the untouched or reverted color as clean',async()=>{
  await act(async()=>{renderer=create(<HabitEditor/>)});
  expect(colorButton().props.accessibilityLabel).toBe(t('habitColor')+': '+t('green'));expect(mocks.guard).toHaveBeenLastCalledWith(false);
  await act(async()=>colorButton().props.onPress());await act(async()=>button(t('blue')).props.onPress());expect(mocks.guard).toHaveBeenLastCalledWith(true);
  await act(async()=>colorButton().props.onPress());await act(async()=>button(t('green')).props.onPress());expect(mocks.guard).toHaveBeenLastCalledWith(false);
  await act(async()=>input(1).props.onChangeText('Green habit'));await act(async()=>button(t('save')).props.onPress());
  expect(mocks.create).toHaveBeenCalledWith({name:'Green habit',emoji:'✨',color:'green',type:'boolean',parentId:null});
});
it('cancel returns to Home without saving or bypassing the draft guard',async()=>{
  await act(async()=>{renderer=create(<HabitEditor/>)});
  await act(async()=>button(t('cancel')).props.onPress());
  expect(mocks.dismissTo).toHaveBeenCalledWith('/(tabs)');expect(mocks.back).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();expect(mocks.editTree).not.toHaveBeenCalled();expect(mocks.leave).not.toHaveBeenCalled();
});
