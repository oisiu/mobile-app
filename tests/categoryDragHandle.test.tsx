import React from 'react';
import { act,create,ReactTestRenderer } from 'react-test-renderer';
import { afterEach,expect,it,vi } from 'vitest';
import { CategoryDragHandle } from '../src/features/home/CategoryDragHandle';
import { t } from '../src/i18n';

vi.mock('react-native',()=>({View:'View',PanResponder:{create:(handlers:unknown)=>({panHandlers:handlers})}}));
vi.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
let renderer:ReactTestRenderer;
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount())});
it('tracks a drag, commits on release, and cancels interrupted gestures',async()=>{
  const onStart=vi.fn(),onMove=vi.fn(),onEnd=vi.fn(),onCancel=vi.fn();
  await act(async()=>{renderer=create(<CategoryDragHandle name="Reading" color="#000" disabled={false} onStart={onStart} onMove={onMove} onEnd={onEnd} onCancel={onCancel} onStep={vi.fn()}/>)});
  const handle=renderer.root.findByType('View' as React.ElementType);
  expect(handle.props.onStartShouldSetPanResponder()).toBe(true);
  handle.props.onPanResponderGrant();handle.props.onPanResponderMove({}, {dy:120});handle.props.onPanResponderRelease();
  expect(onStart).toHaveBeenCalledOnce();expect(onMove).toHaveBeenCalledWith(120);expect(onEnd).toHaveBeenCalledOnce();
  handle.props.onPanResponderTerminate();expect(onCancel).toHaveBeenCalledOnce();expect(handle.props.onPanResponderTerminationRequest()).toBe(false);
});
it('offers accessible movement in both directions and blocks gestures while saving',async()=>{
  const onStep=vi.fn(),props={name:'Reading',color:'#000',onStart:vi.fn(),onMove:vi.fn(),onEnd:vi.fn(),onCancel:vi.fn(),onStep};
  await act(async()=>{renderer=create(<CategoryDragHandle {...props} disabled={false}/>)});
  let handle=renderer.root.findByType('View' as React.ElementType);
  expect(handle.props.accessibilityHint).toBe(t('dragCategoryHint'));
  handle.props.onAccessibilityAction({nativeEvent:{actionName:'increment'}});handle.props.onAccessibilityAction({nativeEvent:{actionName:'decrement'}});expect(onStep.mock.calls).toEqual([[1],[-1]]);
  await act(async()=>renderer.update(<CategoryDragHandle {...props} disabled/>));handle=renderer.root.findByType('View' as React.ElementType);
  expect(handle.props.onStartShouldSetPanResponder()).toBe(false);handle.props.onAccessibilityAction({nativeEvent:{actionName:'increment'}});expect(onStep).toHaveBeenCalledTimes(2);
});
