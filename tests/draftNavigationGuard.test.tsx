import React from 'react';
import { act,create,ReactTestRenderer } from 'react-test-renderer';
import { expect,it,vi } from 'vitest';
import { useDraftGuard } from '../src/features/useDraftGuard';
const state=vi.hoisted(()=>({prevent:vi.fn(),alert:vi.fn(),dispatch:vi.fn(),remove:null as null|((event:{data:{action:{type:string}}})=>void)}));
vi.mock('react-native',()=>({Alert:{alert:state.alert}}));
vi.mock('expo-router/react-navigation',()=>({useNavigation:()=>({dispatch:state.dispatch}),usePreventRemove:(dirty:boolean,handler:typeof state.remove)=>{state.prevent(dirty);state.remove=handler}}));
it('blocks dismissal while a conversion is pending and lets the completed save leave',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});const busy={current:true};let allow!:()=>void,renderer!:ReactTestRenderer;
 function Guard(){allow=useDraftGuard(true,busy);return null}
 await act(async()=>{renderer=create(<Guard/>)});
 state.remove!({data:{action:{type:'GO_BACK'}}});expect(state.alert).not.toHaveBeenCalled();expect(state.dispatch).not.toHaveBeenCalled();
 busy.current=false;state.remove!({data:{action:{type:'GO_BACK'}}});expect(state.alert).toHaveBeenCalledOnce();
 busy.current=true;allow();state.remove!({data:{action:{type:'GO_BACK'}}});expect(state.dispatch).toHaveBeenCalledWith({type:'GO_BACK'});
 await act(async()=>renderer.unmount());
});
it('prevents removal of an unchanged editor while its mutation is pending',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.clearAllMocks();const busy={current:true};let renderer!:ReactTestRenderer;
 function Guard(){useDraftGuard(false,busy);return null}
 await act(async()=>{renderer=create(<Guard/>)});expect(state.prevent).toHaveBeenLastCalledWith(true);
 state.remove!({data:{action:{type:'GO_BACK'}}});expect(state.dispatch).not.toHaveBeenCalled();expect(state.alert).not.toHaveBeenCalled();
 busy.current=false;await act(async()=>renderer.update(<Guard/>));expect(state.prevent).toHaveBeenLastCalledWith(false);
 await act(async()=>renderer.unmount());
});
