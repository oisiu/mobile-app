import React from 'react';
import { act,create,ReactTestRenderer } from 'react-test-renderer';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import HabitEditor from '../app/habit/[id]';
import { light } from '../src/theme';
import { Habit } from '../src/domain/types';
const mocks=vi.hoisted(()=>({id:'new',habits:[] as Habit[],create:vi.fn(),editTree:vi.fn(),refresh:vi.fn(),leave:vi.fn(),back:vi.fn(),alert:vi.fn()}));
vi.mock('react-native',()=>({ActivityIndicator:'Spinner',ScrollView:'ScrollView',Text:'Text',TextInput:'TextInput',TouchableOpacity:'Button',View:'View',Alert:{alert:mocks.alert},StyleSheet:{create:(v:unknown)=>v,hairlineWidth:1}}));
vi.mock('expo-router',()=>({useLocalSearchParams:()=>({id:mocks.id}),router:{back:mocks.back}}));
vi.mock('../src/features/useDraftGuard',()=>({useDraftGuard:()=>mocks.leave}));
vi.mock('../src/features/AppProvider',()=>({useApp:()=>({ready:true,habits:mocks.habits,repo:{create:mocks.create,editTree:mocks.editTree},refresh:mocks.refresh,showSuccess:vi.fn(),palette:light})}));
let renderer:ReactTestRenderer;
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});mocks.id='new';mocks.habits=[];vi.clearAllMocks();mocks.create.mockResolvedValue('new');mocks.editTree.mockResolvedValue(undefined);mocks.refresh.mockResolvedValue(undefined)});
afterEach(async()=>{await act(async()=>renderer.unmount())});
const input=(index:number)=>renderer.root.findAll(node=>node.type as unknown==='TextInput')[index];
const button=(text:string)=>renderer.root.findAll(node=>node.type as unknown==='Button').find(node=>node.findAll(child=>child.type as unknown==='Text').some(child=>child.props.children===text))!;
it('creates a colored root with a complete family emoji without a code-unit limit',async()=>{
  await act(async()=>{renderer=create(<HabitEditor/>)});
  expect(input(0).props.maxLength).toBeUndefined();expect(input(0).props.accessibilityLabel).toBe('Habit emoji');
  await act(async()=>{input(0).props.onChangeText('👨‍👩‍👧‍👦');input(1).props.onChangeText('Family');button('Pink').props.onPress()});
  expect(button('Pink').props.accessibilityState.checked).toBe(true);
  await act(async()=>button('Save').props.onPress());
  expect(mocks.create).toHaveBeenCalledWith({name:'Family',emoji:'👨‍👩‍👧‍👦',color:'pink',type:'boolean',parentId:null});expect(mocks.back).toHaveBeenCalledOnce();
});
it('rejects multiple emojis with localized feedback and retains the draft',async()=>{
  await act(async()=>{renderer=create(<HabitEditor/>)});
  await act(async()=>{input(0).props.onChangeText('✨✨');input(1).props.onChangeText('Name')});
  await act(async()=>button('Save').props.onPress());expect(mocks.create).not.toHaveBeenCalled();expect(mocks.alert).toHaveBeenCalledWith('Choose one complete emoji, or leave the field empty.');expect(input(0).props.value).toBe('✨✨');
});
it('preserves a legacy emoji during color editing and lets children reset to inheritance',async()=>{
  const root:Habit={id:'root',parentId:null,name:'Root',emoji:'✨✨',color:'blue',type:'boolean',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'',updatedAt:''};
  mocks.id='root';mocks.habits=[root,{...root,id:'child',parentId:'root',name:'Child',emoji:'👍🏽',color:'pink'}];
  await act(async()=>{renderer=create(<HabitEditor/>)});
  const automatic=renderer.root.findAll(node=>node.props.accessibilityRole==='radio'&&node.props.accessibilityLabel==='Automatic');
  await act(async()=>{automatic[1].props.onPress();button('Purple').props.onPress()});
  await act(async()=>button('Save').props.onPress());
  expect(mocks.editTree).toHaveBeenCalledWith('root',[{id:'root',name:'Root',emoji:'✨✨',color:'purple'},{id:'child',name:'Child',emoji:'👍🏽',color:null}],[],[]);
});
