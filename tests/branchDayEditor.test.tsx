import React,{useLayoutEffect} from 'react';
import { act,create,type ReactTestRenderer } from 'react-test-renderer';
import { afterEach,expect,it,vi } from 'vitest';
import type { Habit,Entry } from '../src/domain/types';
import { EntryRefreshError } from '../src/features/entryWriteError';
import { useBranchDayEditor } from '../src/features/home/branchDay/useBranchDayEditor';

const mocks=vi.hoisted(()=>({app:{} as Record<string,unknown>,save:vi.fn(),direct:vi.fn(),alert:vi.fn()}));
vi.mock('react-native',()=>({Alert:{alert:mocks.alert}}));
vi.mock('../src/features/AppProvider',()=>({useApp:()=>mocks.app}));
const date='2026-01-01',destination='2026-01-02';
const root:Habit={id:'root',name:'Root',type:'number',parentId:null,emoji:'',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'',updatedAt:''};
const child={...root,id:'child',name:'Child',parentId:root.id};
const record:Entry={id:'entry',habitId:'child',value:2,localDate:date,occurredAt:'',timezone:'UTC',createdAt:'',updatedAt:''};
let renderer:ReactTestRenderer;
let editor:ReturnType<typeof useBranchDayEditor>;
const close=vi.fn();
function Harness(){const current=useBranchDayEditor(root,date,close);useLayoutEffect(()=>{editor=current});return null}
async function setup(entries:Entry[]=[record]){
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});mocks.save.mockResolvedValue(undefined);mocks.direct.mockResolvedValue(undefined);
 mocks.app={habits:[root,child],entries,changeEntry:mocks.direct,changeBranchDay:mocks.save,palette:{}};
 await act(async()=>{renderer=create(<Harness/>)});
}
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount());vi.clearAllMocks();mocks.save.mockReset();mocks.direct.mockReset()});

it('blocks stale draft and dismissal callbacks while a reviewed branch write is pending',async()=>{
 await setup();await act(async()=>editor.updateValue(0,'3'));
 let finish=()=>{};mocks.save.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve}));
 let pending:Promise<void>;
 await act(async()=>{pending=editor.save()});expect(editor.locked).toBe(true);
 await act(async()=>{
  editor.toggleRecord(0,false);editor.updateValue(0,'9');editor.changeUnit(0,'hours');editor.clearRecords();
  editor.toggleDatePicker();editor.selectDate(destination);editor.keepDate();editor.openDirectEditor();editor.close();
 });
 expect(editor.drafts[0].value).toBe('3');expect(editor.removed.size).toBe(0);expect(editor.target).toBe(date);
 expect(editor.pickingDate).toBe(false);expect(editor.directEditor).toBeNull();expect(close).not.toHaveBeenCalled();
 await act(async()=>{finish();await pending!});expect(close).toHaveBeenCalledOnce();
});

it('blocks a move into a stored zero conflict until the conflicting record is removed',async()=>{
 await setup([record,{...record,id:'destination',localDate:destination,value:0}]);
 await act(async()=>editor.selectDate(destination));
 expect(editor.conflictRecords).toHaveLength(1);expect(editor.conflictRecords[0].destinationValue).toBe(0);expect(editor.saveDisabled).toBe(true);
 await act(async()=>editor.save());expect(mocks.save).not.toHaveBeenCalled();
 await act(async()=>editor.toggleRecord(0,false));expect(editor.conflictRecords).toHaveLength(0);
 await act(async()=>editor.save());
 expect(mocks.save).toHaveBeenCalledWith(root.id,date,[record],[{id:record.id,value:null}],destination);
});

it('keeps the reviewed snapshot and locks drafts after a committed refresh failure',async()=>{
 await setup();await act(async()=>editor.updateValue(0,'4'));mocks.save.mockRejectedValueOnce(new EntryRefreshError());
 await act(async()=>editor.save());expect(editor.refreshOnly).toBe(true);expect(editor.saveDisabled).toBe(false);
 const original=mocks.save.mock.calls[0];
 mocks.app={...mocks.app,entries:[]};await act(async()=>renderer.update(<Harness/>));
 await act(async()=>{editor.updateValue(0,'99');editor.selectDate(destination);editor.clearRecords()});
 expect(editor.drafts[0].value).toBe('4');expect(editor.target).toBe(date);expect(editor.records).toEqual([expect.objectContaining({entry:record})]);
 await act(async()=>editor.save());expect(mocks.save.mock.calls[1]).toEqual(original);
});

it('rejects invalid retained input but lets removal repair the draft',async()=>{
 await setup();await act(async()=>editor.updateValue(0,''));expect(editor.invalid).toBe(true);
 await act(async()=>editor.save());expect(mocks.alert).toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();
 await act(async()=>editor.clearRecords());expect(editor.invalid).toBe(false);expect(editor.total).toBe(0);
 await act(async()=>editor.save());expect(mocks.save).toHaveBeenLastCalledWith(root.id,date,[record],[{id:record.id,value:null}],date);
});
