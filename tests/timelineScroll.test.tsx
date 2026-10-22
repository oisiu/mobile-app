import React from 'react';
import { act,create,ReactTestRenderer } from 'react-test-renderer';
import { afterEach,expect,it,vi } from 'vitest';
import { ScrollView } from 'react-native';
import { useTimelineScroll } from '../src/features/insights/useTimelineScroll';
import { TimeBucket } from '../src/domain/analytics';
vi.mock('react-native',()=>({ScrollView:'ScrollView'}));
let renderer:ReactTestRenderer;
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount())});
const buckets=(keys:string[]):TimeBucket[]=>keys.map(key=>({key,label:key,dates:new Set([key])}));
function Harness({keys,onLoadEarlier}:{keys:string[];onLoadEarlier?:()=>void}){return <ScrollView {...useTimelineScroll(buckets(keys),onLoadEarlier)}/>}
const event=(x:number)=>({nativeEvent:{contentOffset:{x}}});

it('anchors prepended history, ignores reformatting and appends, and guards duplicate gesture callbacks',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const scrollToEnd=vi.fn(),scrollTo=vi.fn(),load=vi.fn();
 await act(async()=>{renderer=create(<Harness keys={['2026-10-21','2026-10-22']} onLoadEarlier={load}/>,{createNodeMock:()=>({scrollToEnd,scrollTo})})});
 const props=()=>renderer.root.findByType('ScrollView' as React.ElementType).props;
 await act(async()=>props().onContentSizeChange(1000));expect(scrollToEnd).toHaveBeenCalledOnce();
 await act(async()=>props().onScroll(event(40)));
 await act(async()=>{props().onScrollEndDrag(event(40));props().onMomentumScrollEnd(event(0))});expect(load).toHaveBeenCalledOnce();
 await act(async()=>renderer.update(<Harness keys={['2026-10-20','2026-10-21','2026-10-22']} onLoadEarlier={load}/>));
 await act(async()=>props().onContentSizeChange(1500));expect(scrollTo).toHaveBeenLastCalledWith({x:540,animated:false});
 await act(async()=>props().onScrollEndDrag(event(500)));expect(load).toHaveBeenCalledOnce();
 await act(async()=>props().onMomentumScrollEnd(event(0)));expect(load).toHaveBeenCalledOnce();
 await act(async()=>props().onScrollBeginDrag());
 await act(async()=>props().onScrollEndDrag(event(0)));expect(load).toHaveBeenCalledTimes(2);
 scrollTo.mockClear();
 await act(async()=>props().onContentSizeChange(1700));expect(scrollTo).not.toHaveBeenCalled();
 await act(async()=>renderer.update(<Harness keys={['2026-10-20','2026-10-21','2026-10-22','2026-10-23']} onLoadEarlier={load}/>));
 await act(async()=>props().onContentSizeChange(2200));expect(scrollTo).not.toHaveBeenCalled();
});

it('does not request history without a loader',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 await act(async()=>{renderer=create(<Harness keys={[]}/>)});
 await act(async()=>{renderer.root.findByType('ScrollView' as React.ElementType).props.onScrollEndDrag(event(0))});
 expect(renderer.toJSON()).not.toBeNull();
});

it('allows another history request when new buckets still fit the same viewport width',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});const load=vi.fn();
 await act(async()=>{renderer=create(<Harness keys={['2026-10-22']} onLoadEarlier={load}/>)});
 const props=()=>renderer.root.findByType('ScrollView' as React.ElementType).props;
 await act(async()=>props().onScrollEndDrag(event(0)));expect(load).toHaveBeenCalledOnce();
 await act(async()=>renderer.update(<Harness keys={['2026-10-21','2026-10-22']} onLoadEarlier={load}/>));
 await act(async()=>props().onMomentumScrollEnd(event(0)));expect(load).toHaveBeenCalledOnce();
 await act(async()=>{props().onScrollBeginDrag();props().onScrollEndDrag(event(0))});expect(load).toHaveBeenCalledTimes(2);
});
