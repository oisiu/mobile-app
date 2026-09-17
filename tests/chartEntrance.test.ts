import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { observeChartEntrance } from '../src/features/insights/chartEntrance';

let idleTasks:Map<number,()=>void>,nextIdle:number;
beforeEach(()=>{
  vi.useFakeTimers();idleTasks=new Map();nextIdle=0;
  vi.stubGlobal('requestIdleCallback',vi.fn((callback:()=>void)=>{const id=++nextIdle;idleTasks.set(id,callback);return id}));
  vi.stubGlobal('cancelIdleCallback',vi.fn((id:number)=>idleTasks.delete(id)));
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()});

function fixture(focused=true){
  type Navigation=Parameters<typeof observeChartEntrance>[0];
  const listeners=new Map<string,(event:{data:{closing:boolean}})=>void>();
  const navigation:Navigation={
    isFocused:()=>focused,
    addListener:((event:string,listener:(event:{data:{closing:boolean}})=>void)=>{listeners.set(event,listener);return()=>listeners.delete(event)}) as Navigation['addListener'],
  };
  const ready=vi.fn(),dispose=observeChartEntrance(navigation,ready);
  return {ready,dispose,listeners,focus:(value:boolean)=>{focused=value},emit:(event:string,closing=false)=>listeners.get(event)?.({data:{closing}})};
}
function flushIdle(){const tasks=[...idleTasks.values()];idleTasks.clear();for(const task of tasks)task()}

it('does not build charts for a prefetched, unfocused route',()=>{
  const f=fixture(false);vi.advanceTimersByTime(5000);flushIdle();
  expect(requestIdleCallback).not.toHaveBeenCalled();expect(f.ready).not.toHaveBeenCalled();f.dispose();
});
it('waits for the opening slide to finish, then for an idle slot',()=>{
  const f=fixture();f.emit('transitionStart');vi.advanceTimersByTime(5000);
  expect(idleTasks.size).toBe(0);expect(f.ready).not.toHaveBeenCalled();
  f.emit('transitionEnd');expect(f.ready).not.toHaveBeenCalled();flushIdle();
  expect(f.ready).toHaveBeenCalledOnce();vi.advanceTimersByTime(5000);flushIdle();expect(f.ready).toHaveBeenCalledOnce();f.dispose();
});
it('reveals direct launches without transition events using the fallback',()=>{
  const f=fixture();vi.advanceTimersByTime(999);expect(idleTasks.size).toBe(0);
  vi.advanceTimersByTime(1);expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function),{timeout:1000});
  flushIdle();expect(f.ready).toHaveBeenCalledOnce();f.dispose();
});
it('starts the fallback when a prefetched route receives focus',()=>{
  const f=fixture(false);f.focus(true);f.emit('focus');vi.advanceTimersByTime(1000);flushIdle();
  expect(f.ready).toHaveBeenCalledOnce();f.dispose();
});
it('does not reveal charts at the end of a closing transition',()=>{
  const f=fixture();f.emit('transitionStart');f.emit('transitionEnd',true);vi.advanceTimersByTime(5000);flushIdle();
  expect(f.ready).not.toHaveBeenCalled();f.dispose();
});
it('cancels pending idle work when leaving the screen',()=>{
  const f=fixture();f.emit('transitionEnd');expect(idleTasks.size).toBe(1);
  f.focus(false);f.emit('blur');expect(idleTasks.size).toBe(0);flushIdle();
  expect(f.ready).not.toHaveBeenCalled();f.dispose();
});
it('checks focus again if it changes without a blur event',()=>{
  const f=fixture();f.emit('transitionEnd');f.focus(false);flushIdle();
  expect(f.ready).not.toHaveBeenCalled();f.dispose();
});
it('replaces pending work when transition end is delivered twice',()=>{
  const f=fixture();f.emit('transitionEnd');f.emit('transitionEnd');expect(idleTasks.size).toBe(1);
  flushIdle();expect(f.ready).toHaveBeenCalledOnce();f.dispose();
});
it('unsubscribes and cancels the fallback on unmount',()=>{
  const f=fixture();f.dispose();expect(f.listeners.size).toBe(0);
  vi.advanceTimersByTime(5000);flushIdle();expect(f.ready).not.toHaveBeenCalled();
});
it('cancels queued idle work on unmount',()=>{
  const f=fixture();f.emit('transitionEnd');f.dispose();expect(idleTasks.size).toBe(0);
  flushIdle();expect(f.ready).not.toHaveBeenCalled();
});
it('does not schedule an opening reveal for an unfocused screen',()=>{
  const f=fixture(false);f.emit('transitionEnd');expect(idleTasks.size).toBe(0);f.dispose();
});
