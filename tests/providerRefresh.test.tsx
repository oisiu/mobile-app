import React from 'react';
import { act,create,ReactTestRenderer } from 'react-test-renderer';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { Entry,Habit } from '../src/domain/types';
import { AppProvider,useApp } from '../src/features/AppProvider';

const mocks=vi.hoisted(()=>({habits:vi.fn(),entries:vi.fn(),open:vi.fn(),migrate:vi.fn(),close:vi.fn(),storage:vi.fn()}));
vi.mock('react-native',()=>({StyleSheet:{create:(value:unknown)=>value},Text:'Text',View:'View',useColorScheme:()=> 'light'}));
vi.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
vi.mock('expo-sqlite',()=>({openDatabaseAsync:mocks.open}));
vi.mock('expo-sqlite/kv-store',()=>({default:{getItem:mocks.storage,setItem:async()=>{}}}));
vi.mock('../src/data/migrations',()=>({migrate:mocks.migrate}));
vi.mock('../src/data/repository',()=>({HabitRepository:class{habits=mocks.habits;entries=mocks.entries}}));

let renderer:ReactTestRenderer,current:ReturnType<typeof useApp>;
let snapshots:{habits:Habit[];entries:Entry[]}[];
function Consumer(){const value=useApp();React.useEffect(()=>{current=value;snapshots.push({habits:value.habits,entries:value.entries})},[value]);return null}
const deferred=<T,>()=>{let resolve!:(value:T)=>void;const promise=new Promise<T>(yes=>{resolve=yes});return {promise,resolve}};
beforeEach(async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});snapshots=[];
  mocks.open.mockReset().mockResolvedValue({closeAsync:mocks.close});mocks.close.mockReset().mockResolvedValue(undefined);mocks.migrate.mockReset().mockResolvedValue(undefined);mocks.storage.mockReset().mockResolvedValue(null);
  mocks.habits.mockReset().mockResolvedValue([]);mocks.entries.mockReset().mockResolvedValue([]);
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
