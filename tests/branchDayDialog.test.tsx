import React from 'react';
import { act,create,type ReactTestRenderer,type ReactTestInstance } from 'react-test-renderer';
import { afterEach,expect,it,vi } from 'vitest';
import type { Habit,Entry } from '../src/domain/types';
import { BranchDayDialog } from '../src/features/home/BranchDayDialog';
import { light } from '../src/theme';
import { t } from '../src/i18n';

const mocks=vi.hoisted(()=>({app:{} as Record<string,unknown>,save:vi.fn(),direct:vi.fn(),alert:vi.fn()}));
vi.mock('react-native',()=>({View:'View',Text:'Text',Pressable:'Button',ScrollView:'ScrollView',Modal:'Modal',KeyboardAvoidingView:'KeyboardAvoidingView',Switch:'Switch',TextInput:'Input',Platform:{OS:'ios'},Alert:{alert:mocks.alert},StyleSheet:{create:(styles:unknown)=>styles,hairlineWidth:1}}));
vi.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
vi.mock('../src/features/AppProvider',()=>({useApp:()=>mocks.app}));
vi.mock('../src/features/home/BranchDatePicker',()=>({BranchDatePicker:'DatePicker'}));
vi.mock('../src/features/insights/CalendarEntryModal',()=>({CalendarEntryModal:'DirectEditor'}));
const date='2026-01-01',destination='2026-01-02';
const root:Habit={id:'root',name:'Root',type:'number',parentId:null,emoji:'🌱',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'',updatedAt:''};
const child={...root,id:'child',name:'Child',parentId:'root',emoji:'🌿'};
const record:Entry={id:'entry',habitId:'child',value:2,localDate:date,occurredAt:'',timezone:'UTC',createdAt:'',updatedAt:''};
let renderer:ReactTestRenderer;
const close=vi.fn();
async function setup(habit=root,records:Entry[]=[record],descendants:Habit[]=[{...child,type:habit.type}]){
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});mocks.save.mockResolvedValue(undefined);mocks.direct.mockResolvedValue(undefined);
 mocks.app={habits:[habit,...descendants],entries:records,changeBranchDay:mocks.save,changeEntry:mocks.direct,palette:light};
 await act(async()=>{renderer=create(<BranchDayDialog habit={habit} date={date} onClose={close}/>)});
}
const button=(text:string)=>renderer.root.findAll(node=>node.type as unknown==='Button'&&node.findAll(child=>child.type as unknown==='Text'&&child.props.children===text).length>0).at(-1)!;
const press=async(node:ReactTestInstance)=>{await act(async()=>node.props.onPress())};
const texts=()=>renderer.root.findAllByType('Text' as React.ElementType).map(node=>node.props.children);
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount());vi.clearAllMocks();mocks.save.mockReset();mocks.direct.mockReset()});

it('switches Boolean records off and on while keeping the branch preview and deletion draft aligned',async()=>{
 await setup({...root,type:'boolean'},[{...record,value:1}]);
 const toggle=()=>renderer.root.findByType('Switch' as React.ElementType);
 expect(toggle().props.value).toBe(true);
 await act(async()=>toggle().props.onValueChange(false));expect(toggle().props.value).toBe(false);
 expect(texts()).toContain('–');
 await act(async()=>toggle().props.onValueChange(true));expect(toggle().props.value).toBe(true);
 await act(async()=>toggle().props.onValueChange(false));await press(button(t('save')));
 expect(mocks.save).toHaveBeenCalledWith(root.id,date,[expect.objectContaining({value:1})],[{id:record.id,value:null}],date);
});

it('preserves duration values when changing units and sanitizes edited decimal input',async()=>{
 await setup({...root,type:'duration'},[{...record,value:5400}]);
 const input=()=>renderer.root.findByType('Input' as React.ElementType);
 expect(input().props.value).toBe('90');await press(button(t('hours')));expect(input().props.value).toBe('1.5');
 await act(async()=>input().props.onChangeText('2,5'));expect(input().props.value).toBe('2.5');
 await press(button(t('minutes')));expect(input().props.value).toBe('150');
 await press(button(t('save')));expect(mocks.save).toHaveBeenLastCalledWith(root.id,date,[expect.anything()],[{id:record.id,value:9000}],date);
});

it('picks a move destination, shows the moving count, and restores the original preview when canceled',async()=>{
 await setup();await press(button(t('branchMoveShort')));
 await act(async()=>renderer.root.findByType('DatePicker' as React.ElementType).props.onSelect(destination));
 expect(renderer.root.findAllByType('DatePicker' as React.ElementType)).toHaveLength(0);
 expect(texts()).toContain(t('branchMovingCount',{count:1}));
 const keep=renderer.root.find(node=>node.type as unknown==='Button'&&node.props.accessibilityLabel===t('branchKeepDate'));
 await press(keep);expect(texts()).not.toContain(t('branchMovingCount',{count:1}));
 expect(button(t('save')).props.disabled).toBe(true);
});

it('shows a recorded zero as a move conflict and blocks saving until that record is cleared',async()=>{
 await setup(root,[record,{...record,id:'destination',localDate:destination,value:0}]);
 await press(button(t('branchMoveShort')));
 await act(async()=>renderer.root.findByType('DatePicker' as React.ElementType).props.onSelect(destination));
 expect(texts()).toContain(t('branchConflictShort'));expect(texts()).toContain('Root › Child');
 expect(button(t('save')).props.disabled).toBe(true);await press(button(t('save')));expect(mocks.save).not.toHaveBeenCalled();
 await press(button(t('branchClearShort')));expect(texts()).not.toContain(t('branchConflictShort'));
 expect(button(t('save')).props.disabled).toBe(false);
});

it('identifies direct General records with the parent emoji and labels nested ancestry',async()=>{
 const nested={...child,id:'nested',parentId:'child',name:'Nested'},general={...child,id:'general',name:'General',isGeneral:true};
 await setup(root,[{...record,habitId:'general'},{...record,id:'nested-entry',habitId:'nested',value:3}],[child,nested,general]);
 expect(texts()).toContain(t('branchDirectShort'));expect(texts()).toContain('Child');
 expect(renderer.root.findAllByType('Switch' as React.ElementType).map(node=>node.props.accessibilityLabel)).toContain(t('branchRecordSwitch',{name:`Root › Child › Nested`,date:new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${date}T12:00:00`))}));
});

it('returns from a direct editor to the unchanged branch sheet on Back and rejects invalid direct input',async()=>{
 await setup();await press(button(t('branchDirectShort')));
 const direct=()=>renderer.root.findByType('DirectEditor' as React.ElementType);
 await act(async()=>direct().props.setEditor((current:Record<string,unknown>)=>({...current,value:'invalid'})));
 await act(async()=>direct().props.onSave());expect(mocks.alert).toHaveBeenCalledWith(t('invalidNumber'));expect(mocks.direct).not.toHaveBeenCalled();
 await act(async()=>renderer.root.findByType('Modal' as React.ElementType).props.onRequestClose());
 expect(renderer.root.findAllByType('DirectEditor' as React.ElementType)).toHaveLength(0);expect(close).not.toHaveBeenCalled();
 await press(button(t('cancel')));expect(close).toHaveBeenCalledOnce();
});

it('shows the empty branch state and rejects invalid dates returned by a stale picker callback',async()=>{
 await setup(root,[]);expect(texts()).toContain(t('branchNoRecords'));
 expect(button(t('branchClearShort')).props.disabled).toBe(true);expect(button(t('branchMoveShort')).props.disabled).toBe(true);
 await act(async()=>renderer.unmount());await setup();await press(button(t('branchMoveShort')));
 await act(async()=>renderer.root.findByType('DatePicker' as React.ElementType).props.onSelect('2026-02-30'));
 await press(button(t('save')));expect(mocks.alert).toHaveBeenCalledWith(t('branchDateError'));expect(mocks.save).not.toHaveBeenCalled();
});
