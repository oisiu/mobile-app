import React from 'react';
import { act,create,ReactTestRenderer } from 'react-test-renderer';
import { afterEach,expect,it,vi } from 'vitest';
import { BranchDayDialog } from '../src/features/home/BranchDayDialog';
import { EntryRefreshError } from '../src/features/entryWriteError';
import { Habit,Entry } from '../src/domain/types';
import { light } from '../src/theme';
import { t } from '../src/i18n';

const mocks=vi.hoisted(()=>({app:{} as Record<string,unknown>,alert:vi.fn()}));
vi.mock('react-native',()=>({View:'View',Text:'Text',Pressable:'Button',ScrollView:'ScrollView',Modal:'Modal',KeyboardAvoidingView:'KeyboardAvoidingView',Switch:'Switch',TextInput:'Input',Platform:{OS:'android'},Alert:{alert:mocks.alert},StyleSheet:{create:(styles:unknown)=>styles}}));
vi.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
vi.mock('../src/features/AppProvider',()=>({useApp:()=>mocks.app}));
vi.mock('../src/features/home/BranchDatePicker',()=>({BranchDatePicker:'DatePicker'}));
vi.mock('../src/features/insights/CalendarEntryModal',()=>({CalendarEntryModal:'DirectEditor'}));
let renderer:ReactTestRenderer;
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount());vi.clearAllMocks()});

it('locks a committed branch draft and retries the same reviewed operation after refresh failure',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const root:Habit={id:'root',parentId:null,name:'Root',emoji:'🌱',type:'number',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'',updatedAt:''},child={...root,id:'child',parentId:'root',name:'Child'};
 const record:Entry={id:'record',habitId:'child',value:2,localDate:'2026-01-01',occurredAt:'',timezone:'UTC',createdAt:'',updatedAt:''};
 const change=vi.fn().mockRejectedValueOnce(new EntryRefreshError()).mockResolvedValue(undefined),close=vi.fn();
 mocks.app={habits:[root,child],entries:[record],changeBranchDay:change,palette:light};
 await act(async()=>{renderer=create(<BranchDayDialog habit={root} date={record.localDate} onClose={close}/>)});
 const button=(text:string)=>renderer.root.findAll(node=>node.type as unknown==='Button'&&node.findAll(child=>child.type as unknown==='Text'&&child.props.children===text).length>0).at(-1)!;
 await act(async()=>renderer.root.find(node=>node.type as unknown==='Input').props.onChangeText('3'));
 await act(async()=>button(t('save')).props.onPress());
 expect(mocks.alert).toHaveBeenLastCalledWith(t('habitSavedRefreshFailed'),t('entrySavedRefreshHelp'));expect(close).not.toHaveBeenCalled();
 expect(renderer.root.find(node=>node.type as unknown==='Input').props.editable).toBe(false);
 expect(button(t('branchClearShort')).props.disabled).toBe(true);expect(button(t('branchMoveShort')).props.disabled).toBe(true);
 expect(button(t('save')).props.disabled).toBe(false);
 const original=change.mock.calls[0];await act(async()=>button(t('save')).props.onPress());
 expect(change.mock.calls[1]).toEqual(original);expect(close).toHaveBeenCalledOnce();
});
