import React from 'react';
import { act,create,ReactTestRenderer } from 'react-test-renderer';
import { afterEach,expect,it,vi } from 'vitest';
import Calendar from '../app/(tabs)/calendar';
import { EntryRefreshError } from '../src/features/entryWriteError';
import { Habit } from '../src/domain/types';
import { light } from '../src/theme';
import { t } from '../src/i18n';

const mocks=vi.hoisted(()=>({app:{} as Record<string,unknown>,alert:vi.fn()}));
vi.mock('react-native',()=>({View:'View',Text:'Text',Pressable:'Pressable',TouchableOpacity:'Button',ScrollView:'ScrollView',Modal:'Modal',KeyboardAvoidingView:'KeyboardAvoidingView',TextInput:'Input',FlatList:({data,renderItem,...props}:{data:unknown[];renderItem:(info:{item:unknown})=>React.ReactNode})=><>{React.createElement('List',props)}{data.map((item,index)=><React.Fragment key={index}>{renderItem({item})}</React.Fragment>)}</>,Platform:{OS:'android'},Alert:{alert:mocks.alert},StyleSheet:{create:(styles:unknown)=>styles,hairlineWidth:1}}));
vi.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
vi.mock('../src/features/AppProvider',()=>({useApp:()=>mocks.app,SuccessToast:'Toast'}));
vi.mock('../src/features/SheetHandle',()=>({SheetHandle:'Handle'}));
vi.mock('../src/features/CalendarDayBackground',()=>({CalendarDayBackground:'Background'}));
let renderer:ReactTestRenderer;
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount());vi.clearAllMocks()});
const button=(text:string)=>renderer.root.findAll(node=>node.type as unknown==='Button'&&node.findAll(child=>child.type as unknown==='Text'&&child.props.children===text).length>0).at(-1)!;

it.each([{type:'number',remove:false},{type:'boolean',remove:false},{type:'number',remove:true}] as const)('retries a committed $type calendar operation (delete: $remove) without changing its value',async({type,remove})=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const habit:Habit={id:'root',parentId:null,name:'Root',emoji:'',type,sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'',updatedAt:''};
 const change=vi.fn().mockRejectedValueOnce(new EntryRefreshError()).mockResolvedValue(undefined);
 mocks.app={habits:[habit],entries:remove?[{id:'entry',habitId:'root',value:2,localDate:new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0')+'-01'}]:[],changeEntry:change,palette:light};
 await act(async()=>{renderer=create(<Calendar/>)});
 await act(async()=>renderer.root.findAll(node=>node.type as unknown==='View')[0].props.onLayout({nativeEvent:{layout:{width:350}}}));
 const day=renderer.root.findAll(node=>node.type as unknown==='Button'&&node.props.accessibilityLabel?.startsWith(t('editDay'))&&!node.props.disabled)[0];
 await act(async()=>day.props.onPress());
 const row=()=>renderer.root.find(node=>node.type as unknown==='Button'&&node.props.accessibilityLabel?.startsWith('Root,'));
 await act(async()=>row().props.onPress());
 if(type==='number'){
   await act(async()=>renderer.root.find(node=>node.type as unknown==='Input').props.onChangeText('3'));
   await act(async()=>button(t(remove?'deleteEntry':'save')).props.onPress());
   expect(renderer.root.find(node=>node.type as unknown==='Input').props.editable).toBe(false);
   await act(async()=>renderer.root.find(node=>node.type as unknown==='Input').props.onChangeText('9'));
 }else expect(row().props.disabled).toBe(true);
 expect(mocks.alert).toHaveBeenLastCalledWith(t('habitSavedRefreshFailed'),t('entrySavedRefreshHelp'));
 const original=change.mock.calls[0];
 await act(async()=>button(t('retry')).props.onPress());
 expect(change.mock.calls[1]).toEqual(original);
 expect(change.mock.calls[1][2]).toBe(remove?null:type==='number'?3:1);
});
