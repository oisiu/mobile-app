import React from 'react';
import { act,create,ReactTestRenderer } from 'react-test-renderer';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { Entry,Habit } from '../src/domain/types';
import { AppProvider,useApp } from '../src/features/AppProvider';

const mocks=vi.hoisted(()=>({saveEntry:vi.fn(),clearEntry:vi.fn(),editBranchDay:vi.fn(),habits:vi.fn(),entries:vi.fn(),open:vi.fn(),migrate:vi.fn(),close:vi.fn(),storage:vi.fn(),storeTheme:vi.fn(),alert:vi.fn()}));
vi.mock('react-native',()=>({Alert:{alert:mocks.alert},StyleSheet:{create:(value:unknown)=>value},Text:'Text',View:'View',useColorScheme:()=> 'light'}));
vi.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
vi.mock('expo-sqlite',()=>({openDatabaseAsync:mocks.open}));
vi.mock('expo-sqlite/kv-store',()=>({default:{getItem:mocks.storage,setItem:mocks.storeTheme}}));
vi.mock('../src/data/migrations',()=>({migrate:mocks.migrate}));
vi.mock('../src/data/repository',()=>({HabitRepository:class{saveEntry=mocks.saveEntry;clearEntry=mocks.clearEntry;editBranchDay=mocks.editBranchDay;habits=mocks.habits;entries=mocks.entries}}));

let renderer:ReactTestRenderer,current:ReturnType<typeof useApp>;
let snapshots:{habits:Habit[];entries:Entry[]}[];
function Consumer(){const value=useApp();React.useEffect(()=>{current=value;snapshots.push({habits:value.habits,entries:value.entries})},[value]);return null}
const deferred=<T,>()=>{let resolve!:(value:T)=>void;const promise=new Promise<T>(yes=>{resolve=yes});return {promise,resolve}};
beforeEach(async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});snapshots=[];mocks.storeTheme.mockReset().mockResolvedValue(undefined);mocks.alert.mockClear();
  mocks.open.mockReset().mockResolvedValue({closeAsync:mocks.close});mocks.close.mockReset().mockResolvedValue(undefined);mocks.migrate.mockReset().mockResolvedValue(undefined);mocks.storage.mockReset().mockResolvedValue(null);
  mocks.habits.mockReset().mockResolvedValue([]);mocks.entries.mockReset().mockResolvedValue([]);
  mocks.saveEntry.mockReset().mockResolvedValue(undefined);mocks.clearEntry.mockReset().mockResolvedValue(undefined);mocks.editBranchDay.mockReset().mockResolvedValue(undefined);
  await act(async()=>{renderer=create(<AppProvider><Consumer/></AppProvider>)});
});
afterEach(async()=>{await act(async()=>renderer.unmount())});

it('starts both refresh reads together and never publishes a mixed snapshot',async()=>{
  const habits=deferred<Habit[]>(),entries=deferred<Entry[]>();
  mocks.habits.mockReturnValueOnce(habits.promise);mocks.entries.mockReturnValueOnce(entries.promise);
  const start=snapshots.length,refresh=current.refresh();
  expect(mocks.habits).toHaveBeenCalledTimes(2);expect(mocks.entries).toHaveBeenCalledTimes(2);
  const nextHabits=[{id:'new'}] as Habit[],nextEntries=[{habitId:'new'}] as Entry[];
  await act(async()=>habits.resolve(nextHabits));
  expect(snapshots).toHaveLength(start);
  await act(async()=>{entries.resolve(nextEntries);await refresh});
  expect(snapshots.slice(start)).toEqual([{habits:nextHabits,entries:nextEntries}]);
});
it('keeps the previous snapshot if either refresh read fails',async()=>{
  const before={habits:current.habits,entries:current.entries};
  mocks.habits.mockResolvedValueOnce([{id:'partial'}]);mocks.entries.mockRejectedValueOnce(new Error('read failed'));
  await act(async()=>{await expect(current.refresh()).rejects.toThrow('read failed')});
  expect(current.habits).toBe(before.habits);expect(current.entries).toBe(before.entries);
});

const entryHabit:Habit={id:'root',parentId:null,name:'Root',emoji:'🌱',type:'number',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'',updatedAt:''};
const record:Entry={id:'record',habitId:'root',value:2,localDate:'2026-10-15',occurredAt:'2026-10-15T12:00:00Z',timezone:'UTC',createdAt:'created',updatedAt:'updated'};
it('refreshes the snapshot even when a requested entry value is already stored',async()=>{
 mocks.habits.mockResolvedValue([entryHabit]);mocks.entries.mockResolvedValue([record]);
 await act(async()=>current.changeEntry('root',record.localDate,2));
 expect(current.entries).toEqual([record]);expect(mocks.saveEntry).not.toHaveBeenCalled();expect(mocks.clearEntry).not.toHaveBeenCalled();
});
it.each([2,null])('retries only snapshot publication after a committed entry change to %s',async value=>{
 mocks.habits.mockResolvedValue([entryHabit]);
 const before=value===null?[record]:[],after=value===null?[]:[record];
 mocks.entries.mockResolvedValueOnce(before).mockRejectedValueOnce(new Error('Read failed')).mockResolvedValue(after);
 await act(async()=>{await expect(current.changeEntry('root',record.localDate,value)).rejects.toMatchObject({name:'EntryRefreshError'})});
 expect(current.toast).toBeNull();
 await act(async()=>current.changeEntry('root',record.localDate,value));
 expect(value===null?mocks.clearEntry:mocks.saveEntry).toHaveBeenCalledOnce();expect(current.entries).toEqual(after);expect(current.toast).not.toBeNull();
});
it.each(['edit','clear','move'] as const)('does not repeat a committed branch %s after repeated refresh failures',async action=>{
 const destination=action==='move'?'2026-10-14':record.localDate,value=action==='clear'?null:3;
 const edits=[{id:record.id,value}],after=value===null?[]:[{...record,value,localDate:destination}];
 mocks.entries.mockRejectedValueOnce(new Error('First read failed')).mockRejectedValueOnce(new Error('Second read failed')).mockResolvedValue(after);
 for(let attempt=0;attempt<2;attempt++)await act(async()=>{await expect(current.changeBranchDay('root',record.localDate,[record],edits,destination)).rejects.toMatchObject({name:'EntryRefreshError'})});
 expect(mocks.editBranchDay).toHaveBeenCalledOnce();expect(current.toast).toBeNull();
 await act(async()=>current.changeBranchDay('root',record.localDate,[record],edits,destination));
 expect(mocks.editBranchDay).toHaveBeenCalledOnce();expect(current.entries).toEqual(after);expect(current.toast).not.toBeNull();
});
it('retries a branch write failure instead of incorrectly treating it as committed',async()=>{
 mocks.editBranchDay.mockRejectedValueOnce(new Error('Write failed'));
 await act(async()=>{await expect(current.changeBranchDay('root',record.localDate,[record],[{id:record.id,value:3}],record.localDate)).rejects.toThrow('Write failed')});
 await act(async()=>current.changeBranchDay('root',record.localDate,[record],[{id:record.id,value:3}],record.localDate));
 expect(mocks.editBranchDay).toHaveBeenCalledTimes(2);
});

it.each(['open','migrate','entries'] as const)('recovers from %s startup failure and blocks duplicate retries',async stage=>{
  await act(async()=>renderer.unmount());
  mocks[stage].mockRejectedValueOnce(new Error('startup failure'));
  await act(async()=>{renderer=create(<AppProvider><Consumer/></AppProvider>)});
  expect(current.ready).toBe(false);expect(current.error).toBe('startup failure');
  if(stage!=='open')expect(mocks.close).toHaveBeenCalled();
  const pending=deferred<Entry[]>();mocks.entries.mockReturnValueOnce(pending.promise);
  const opens=mocks.open.mock.calls.length;let retry!:Promise<void>;
  await act(async()=>{retry=current.retryStartup();await current.retryStartup()});
  expect(mocks.open).toHaveBeenCalledTimes(opens+1);expect(current.ready).toBe(false);expect(current.error).toBeNull();
  await act(async()=>{pending.resolve([]);await retry});expect(current.ready).toBe(true);expect(current.error).toBeNull();
});
it('uses system appearance when reading the saved preference fails',async()=>{
  await act(async()=>renderer.unmount());mocks.storage.mockRejectedValueOnce(new Error('storage unavailable'));
  await act(async()=>{renderer=create(<AppProvider><Consumer/></AppProvider>)});
  expect(current.themeReady).toBe(true);expect(current.themeMode).toBe('system');expect(current.ready).toBe(true);expect(current.error).toBeNull();
});

it('waits for the complete initial snapshot before becoming ready',async()=>{
  await act(async()=>renderer.unmount());
  const pending=deferred<Entry[]>();mocks.entries.mockReturnValueOnce(pending.promise);
  mocks.habits.mockResolvedValueOnce([{id:'loaded'}]);
  await act(async()=>{renderer=create(<AppProvider><Consumer/></AppProvider>)});
  expect(current.ready).toBe(false);expect(current.repo).toBeNull();expect(current.habits).toEqual([]);
  await act(async()=>pending.resolve([{habitId:'loaded'}] as Entry[]));
  expect(current.ready).toBe(true);expect(current.habits).toEqual([{id:'loaded'}]);expect(current.entries).toEqual([{habitId:'loaded'}]);
});

it('persists rapid appearance selections in order',async()=>{
 const first=deferred<void>();mocks.storeTheme.mockReturnValueOnce(first.promise);
 let dark!:Promise<void>,light!:Promise<void>;
 await act(async()=>{dark=current.setThemeMode('dark');light=current.setThemeMode('light')});
 expect(current.themeMode).toBe('light');expect(mocks.storeTheme).toHaveBeenCalledTimes(1);
 await act(async()=>{first.resolve();await Promise.all([dark,light])});
 expect(mocks.storeTheme.mock.calls).toEqual([['theme-mode','dark'],['theme-mode','light']]);
 expect(current.themeMode).toBe('light');
});
it('restores persisted appearance after a failed preference write and remains retryable',async()=>{
 await act(async()=>current.setThemeMode('dark'));
 mocks.storeTheme.mockRejectedValueOnce(new Error('Storage failed'));
 await act(async()=>current.setThemeMode('light'));
 expect(current.themeMode).toBe('dark');expect(mocks.alert).toHaveBeenCalledOnce();
 await act(async()=>current.setThemeMode('light'));
 expect(current.themeMode).toBe('light');expect(mocks.storeTheme).toHaveBeenCalledTimes(3);
});
