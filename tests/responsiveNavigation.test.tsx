import React from 'react';
import { act,create,ReactTestRenderer } from 'react-test-renderer';
import { afterEach,expect,it,vi } from 'vitest';
import { useResponsiveNavigation } from '../src/features/useResponsiveNavigation';

const mocks=vi.hoisted(()=>({push:vi.fn(),focus:null as null|(()=>()=>void)}));
vi.mock('expo-router',()=>({router:{push:mocks.push},useFocusEffect:(effect:()=>()=>void)=>{mocks.focus=effect}}));
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks()});

it('accepts navigation after a queued transition was canceled on blur',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const frames=new Map<number,FrameRequestCallback>();let nextId=0;
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.set(++nextId,callback);return nextId});
 const cancel=vi.fn((id:number)=>frames.delete(id));vi.stubGlobal('cancelAnimationFrame',cancel);
 let navigation!:ReturnType<typeof useResponsiveNavigation>,renderer!:ReactTestRenderer;
 function Harness(){navigation=useResponsiveNavigation();return null}
 await act(async()=>{renderer=create(<Harness/>)});
 let blur!:()=>void;await act(async()=>{blur=mocks.focus!()});
 await act(async()=>{navigation.push('/insight/first');navigation.push('/insight/duplicate')});
 expect(frames.size).toBe(1);
 await act(async()=>blur());expect(cancel).toHaveBeenCalledWith(1);
 await act(async()=>{mocks.focus!()});expect(navigation.pending).toBeNull();
 await act(async()=>navigation.push('/insight/second'));
 expect(frames.size).toBe(1);await act(async()=>frames.get(2)!(0));
 expect(mocks.push).toHaveBeenCalledExactlyOnceWith('/insight/second');
 await act(async()=>navigation.push('/insight/duplicate-after-frame'));
 expect(frames.size).toBe(1);expect(mocks.push).toHaveBeenCalledOnce();
 await act(async()=>renderer.unmount());
});
