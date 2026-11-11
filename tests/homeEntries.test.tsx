import React,{useLayoutEffect} from 'react';
import { act,create,type ReactTestRenderer } from 'react-test-renderer';
import { afterEach,expect,it,vi } from 'vitest';
import type { Entry,Habit } from '../src/domain/types';
import { buildTree } from '../src/domain/tree';
import { EntryRefreshError } from '../src/features/entryWriteError';
import { useHomeEntries } from '../src/features/home/useHomeEntries';
import { HomeEntryDialogs } from '../src/features/home/HomeEntryDialogs';
import { t } from '../src/i18n';

const mocks=vi.hoisted(()=>({app:{} as Record<string,unknown>,alert:vi.fn(),haptic:vi.fn().mockResolvedValue(undefined)}));
vi.mock('react-native',()=>({Alert:{alert:mocks.alert}}));
vi.mock('expo-haptics',()=>({impactAsync:mocks.haptic,ImpactFeedbackStyle:{Light:'light'}}));
vi.mock('../src/features/AppProvider',()=>({useApp:()=>mocks.app}));
vi.mock('../src/features/home/BranchDayDialog',()=>({BranchDayDialog:'BranchDialog'}));
vi.mock('../src/features/insights/CalendarEntryModal',()=>({CalendarEntryModal:'EntryEditor'}));
const date='2026-09-08';
const habit=(type:Habit['type']='number'):Habit=>({id:'root',name:'Root',type,parentId:null,emoji:'',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'',updatedAt:''});
const entry=(habitId:string,value:number):Entry=>({id:'entry',habitId,value,localDate:date,occurredAt:'',timezone:'UTC',createdAt:'',updatedAt:''});
let renderer:ReactTestRenderer;
let editing:ReturnType<typeof useHomeEntries>;
function Harness(){
 const current=useHomeEntries(date);useLayoutEffect(()=>{editing=current});return <HomeEntryDialogs editing={current}/>;
}
const change=vi.fn();
async function setup(habits:Habit[],entries:Entry[]=[]){
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});change.mockResolvedValue(undefined);
 mocks.app={habits,entries,changeEntry:change,palette:{}};
 await act(async()=>{renderer=create(<Harness/>)});
 return buildTree(habits)[0];
}
const editor=()=>renderer.root.findByType('EntryEditor' as React.ElementType);
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount());vi.clearAllMocks();change.mockReset()});

it.each([0,1])('toggles a Boolean day with current value %s exactly once while its write is pending',async value=>{
 const root=await setup([habit('boolean')],value?[entry('root',value)]:[]);
 let finish=()=>{};change.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve}));
 let pending:Promise<void>;
 await act(async()=>{pending=editing.toggle(root,date);void editing.toggle(root,date)});
 expect(change).toHaveBeenCalledOnce();expect(change).toHaveBeenCalledWith('root',date,value?null:1);
 await act(async()=>{finish();await pending!});expect(mocks.haptic).toHaveBeenCalledOnce();
});

it('ignores future entries',async()=>{
 const root=await setup([habit('boolean')]);await act(async()=>editing.toggle(root,'2026-09-09'));
 expect(change).not.toHaveBeenCalled();
});

it.each(['number','duration'] as const)('opens the branch editor for a recorded zero in a %s descendant',async type=>{
 const root=habit(type),child={...root,id:'child',parentId:'root'};
 const node=await setup([root,child],[entry('child',0)]);
 await act(async()=>editing.toggle(node,date));
 expect(renderer.root.findByType('BranchDialog' as React.ElementType).props.date).toBe(date);
 expect(renderer.root.findAllByType('EntryEditor' as React.ElementType)).toHaveLength(0);
 expect(change).not.toHaveBeenCalled();
 await act(async()=>renderer.root.findByType('BranchDialog' as React.ElementType).props.onClose());
 expect(renderer.root.findAllByType('BranchDialog' as React.ElementType)).toHaveLength(0);
});

it('opens branch review for an active Boolean descendant and direct entry for an inactive one',async()=>{
 const root=habit('boolean'),child={...root,id:'child',parentId:'root'};
 const node=await setup([root,child],[entry('child',1)]);
 await act(async()=>editing.toggle(node,date));expect(change).not.toHaveBeenCalled();
 await act(async()=>renderer.root.findByType('BranchDialog' as React.ElementType).props.onClose());
 mocks.app={...mocks.app,entries:[entry('child',0)]};await act(async()=>renderer.update(<Harness/>));
 await act(async()=>editing.toggle(node,date));expect(change).toHaveBeenCalledWith('root',date,1);
});

it('retries a committed deletion without changing its value or discarding the draft',async()=>{
 const node=await setup([habit()],[entry('root',2)]);
 await act(async()=>editing.toggle(node,date));expect(editor().props.hasRecord).toBe(true);
 change.mockRejectedValueOnce(new EntryRefreshError());
 await act(async()=>editor().props.onClear());expect(editor().props.locked).toBe(true);
 const originalValue=editor().props.editor.value;
 await act(async()=>editor().props.setEditor((current:Record<string,unknown>)=>({...current,value:'9'})));
 expect(editor().props.editor.value).toBe(originalValue);
 await act(async()=>editor().props.onSave());
 expect(change.mock.calls).toEqual([['root',date,null],['root',date,null]]);
 expect(renderer.root.findAllByType('EntryEditor' as React.ElementType)).toHaveLength(0);
});

it('rejects invalid input and keeps a failed write editable for retry',async()=>{
 const node=await setup([habit()]);await act(async()=>editing.toggle(node,date));
 await act(async()=>editor().props.setEditor((current:Record<string,unknown>)=>({...current,value:'invalid'})));
 await act(async()=>editor().props.onSave());expect(mocks.alert).toHaveBeenLastCalledWith(t('invalidNumber'));expect(change).not.toHaveBeenCalled();
 await act(async()=>editor().props.setEditor((current:Record<string,unknown>)=>({...current,value:'3'})));
 change.mockRejectedValueOnce(new Error('Write failed'));
 await act(async()=>editor().props.onSave());expect(editor().props.locked).toBe(false);expect(editor().props.editor.value).toBe('3');
 await act(async()=>editor().props.onSave());expect(change).toHaveBeenLastCalledWith('root',date,3);
});

it('opens branch review explicitly and cancels a direct editor without writing',async()=>{
 const node=await setup([habit()]);await act(async()=>editing.openBranch(node,date));
 expect(renderer.root.findByType('BranchDialog' as React.ElementType).props.habit.id).toBe('root');
 await act(async()=>renderer.root.findByType('BranchDialog' as React.ElementType).props.onClose());
 await act(async()=>editing.toggle(node,date));await act(async()=>editor().props.setEditor(null));
 expect(renderer.root.findAllByType('EntryEditor' as React.ElementType)).toHaveLength(0);expect(change).not.toHaveBeenCalled();
});


it('blocks stale save, cancel, and branch actions while a direct entry is being saved',async()=>{
 const node=await setup([habit()]);await act(async()=>editing.toggle(node,date));
 await act(async()=>editor().props.setEditor((current:Record<string,unknown>)=>({...current,value:'4'})));
 let finish=()=>{};change.mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve}));
 const staleEditor=editor().props;let saving!:Promise<void>;
 await act(async()=>{saving=staleEditor.onSave()});expect(editor().props.saving).toBe(true);
 await act(async()=>{void staleEditor.onSave();staleEditor.setEditor(null);editing.openBranch(node,date)});
 expect(change).toHaveBeenCalledOnce();expect(editor().props.editor.value).toBe('4');
 expect(renderer.root.findAllByType('BranchDialog' as React.ElementType)).toHaveLength(0);
 await act(async()=>{finish();await saving});
 expect(renderer.root.findAllByType('EntryEditor' as React.ElementType)).toHaveLength(0);
});

it.each(['number','duration'] as const)('saves a valid zero %s direct entry from an object draft',async type=>{
 const node=await setup([habit(type)]);await act(async()=>editing.toggle(node,date));
 await act(async()=>editor().props.setEditor({...editor().props.editor,value:'0'}));
 await act(async()=>editor().props.onSave());expect(change).toHaveBeenCalledWith('root',date,0);
});

it('releases the Boolean write guard after a failure and tolerates unavailable haptics',async()=>{
 const node=await setup([habit('boolean')]);change.mockRejectedValueOnce('Write failed');
 await act(async()=>editing.toggle(node,date));expect(mocks.alert).toHaveBeenCalled();
 mocks.haptic.mockRejectedValueOnce(new Error('Haptics unavailable'));
 await act(async()=>editing.toggle(node,date));expect(change).toHaveBeenCalledTimes(2);expect(mocks.alert).toHaveBeenCalledOnce();
});
