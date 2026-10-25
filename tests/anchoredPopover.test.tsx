import React from 'react';
import { act,create,ReactTestRenderer } from 'react-test-renderer';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { AnchoredPopover,openPopover } from '../src/features/AnchoredPopover';
import { light } from '../src/theme';

const native=vi.hoisted(()=>({window:{width:390,height:844},insets:{top:24,bottom:34,left:0,right:0},listeners:new Map<string,(event:{endCoordinates:{screenY:number}})=>void>(),remove:vi.fn()}));
vi.mock('react-native',()=>({Modal:'Modal',Pressable:'Pressable',View:'View',StyleSheet:{absoluteFill:{position:'absolute'},hairlineWidth:1},useWindowDimensions:()=>native.window,Keyboard:{addListener:(name:string,callback:(event:{endCoordinates:{screenY:number}})=>void)=>{native.listeners.set(name,callback);return {remove:native.remove}}}}));
vi.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>native.insets}));
let renderer:ReactTestRenderer;
const panel=()=>renderer.root.find(node=>node.props.accessibilityViewIsModal);
const bounds=()=>Object.assign({},...panel().props.style) as {left:number;width:number;top?:number;bottom?:number;maxHeight:number;height?:number};
const render=async(props:Partial<React.ComponentProps<typeof AnchoredPopover>>={})=>{
 await act(async()=>{renderer=create(<AnchoredPopover visible onClose={()=>{}} anchor={{x:280,y:120,width:70,height:36}} c={light} {...props}><></></AnchoredPopover>)});
};
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});native.window={width:390,height:844};native.insets={top:24,bottom:34,left:0,right:0};native.listeners.clear();native.remove.mockClear()});
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount())});

it('keeps a wide popover inside landscape safe areas and adapts to viewport changes',async()=>{
 await render({maxWidth:600,anchor:{x:0,y:120,width:44,height:44}});
 expect(bounds().left).toBe(12);expect(bounds().width).toBe(366);
 native.window={width:844,height:390};native.insets={top:0,bottom:21,left:44,right:44};
 await act(async()=>renderer.update(<AnchoredPopover visible onClose={()=>{}} anchor={{x:820,y:320,width:44,height:44}} c={light} maxWidth={600}><></></AnchoredPopover>));
 const box=bounds();expect(box.left).toBeGreaterThanOrEqual(56);expect(box.left+box.width).toBeLessThanOrEqual(788);
 expect(390-box.bottom!-box.maxHeight).toBeGreaterThanOrEqual(12);
});

it('keeps keyboard-constrained content bounded and clears stale keyboard bounds on reopen',async()=>{
 await render({anchor:{x:300,y:700,width:70,height:44},fillHeight:true,maxHeight:620});
 const initial=bounds();
 await act(async()=>native.listeners.get('keyboardDidShow')!({endCoordinates:{screenY:420}}));
 const box=bounds();expect(box.bottom).toBeGreaterThanOrEqual(844-420+12);expect(844-box.bottom!-box.maxHeight).toBeGreaterThanOrEqual(36);expect(box.height).toBe(box.maxHeight);
 await act(async()=>renderer.update(<AnchoredPopover visible={false} onClose={()=>{}} anchor={null} c={light}><></></AnchoredPopover>));
 expect(native.remove).toHaveBeenCalledTimes(2);
 await act(async()=>renderer.update(<AnchoredPopover visible onClose={()=>{}} anchor={{x:300,y:700,width:70,height:44}} c={light} fillHeight maxHeight={620}><></></AnchoredPopover>));
 expect(bounds()).toEqual(initial);
 await act(async()=>native.listeners.get('keyboardDidHide')!({endCoordinates:{screenY:844}}));
 expect(bounds()).toEqual(initial);
});

it('routes outside taps separately from Back/escape and keeps panel taps inside',async()=>{
 const close=vi.fn(),escape=vi.fn(),shown=vi.fn();await render({onClose:close,onEscape:escape,onShow:shown});
 const modal=renderer.root.findByType('Modal' as React.ElementType);
 await act(async()=>{panel().props.onPress();modal.props.onShow()});expect(close).not.toHaveBeenCalled();expect(shown).toHaveBeenCalledOnce();
 await act(async()=>renderer.root.findAllByType('Pressable' as React.ElementType)[0].props.onPress());expect(close).toHaveBeenCalledOnce();
 await act(async()=>{modal.props.onRequestClose();panel().props.onAccessibilityEscape()});expect(escape).toHaveBeenCalledTimes(2);expect(close).toHaveBeenCalledOnce();
});

it('uses the close handler for Back and positions an unmeasured trigger safely',async()=>{
 const close=vi.fn();await render({anchor:null,onClose:close});
 expect(bounds().top).toBe(128);expect(bounds().left+bounds().width).toBeLessThanOrEqual(378);
 await act(async()=>renderer.root.findByType('Modal' as React.ElementType).props.onRequestClose());expect(close).toHaveBeenCalledOnce();
});

it('removes keyboard subscriptions when unmounted',async()=>{
 await render();await act(async()=>renderer.unmount());expect(native.remove).toHaveBeenCalledTimes(2);
});

it('opens from measured native controls and safely handles missing measurement APIs',()=>{
 const opened=vi.fn();
 openPopover({currentTarget:{measureInWindow:(callback:(x:number,y:number,width:number,height:number)=>void)=>callback(10,20,80,44)}} as unknown as Parameters<typeof openPopover>[0],opened);
 expect(opened).toHaveBeenLastCalledWith({x:10,y:20,width:80,height:44});
 openPopover(undefined,opened);expect(opened).toHaveBeenLastCalledWith(null);
 openPopover({currentTarget:{}} as Parameters<typeof openPopover>[0],opened);expect(opened).toHaveBeenLastCalledWith(null);
});
