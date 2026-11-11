import React from 'react';
import { act,create,type ReactTestRenderer } from 'react-test-renderer';
import { afterEach,expect,it,vi } from 'vitest';
import { SheetHandle } from '../src/features/SheetHandle';
import { t } from '../src/i18n';

vi.mock('react-native',()=>({Pressable:'Pressable',StyleSheet:{create:(styles:unknown)=>styles}}));
vi.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
vi.mock('../src/features/AppProvider',()=>({useApp:()=>({palette:{muted:'#123456'}})}));
let renderer:ReactTestRenderer;
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount());vi.clearAllMocks()});

it('offers an accessible close target with pressed feedback and calls the sheet dismissal',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});const close=vi.fn();
  await act(async()=>{renderer=create(<SheetHandle onClose={close}/>)});
  const button=renderer.root.findByType('Pressable' as React.ElementType);
  expect(button.props.accessibilityRole).toBe('button');expect(button.props.accessibilityLabel).toBe(t('close'));
  expect(button.props.disabled).toBe(false);expect(button.props.accessibilityState.disabled).toBe(false);
  expect(button.props.style({pressed:false})).toEqual([expect.objectContaining({minHeight:44}),{opacity:1}]);
  expect(button.props.style({pressed:true})).toEqual([expect.anything(),{opacity:.5}]);
  expect(renderer.root.findByType('Icon' as React.ElementType).props.color).toBe('#123456');
  await act(async()=>button.props.onPress());expect(close).toHaveBeenCalledOnce();
});

it('keeps the native control and accessibility state disabled during a pending write',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});const close=vi.fn();
  await act(async()=>{renderer=create(<SheetHandle onClose={close} disabled/>)});
  const button=renderer.root.findByType('Pressable' as React.ElementType);
  expect(button.props.disabled).toBe(true);expect(button.props.accessibilityState.disabled).toBe(true);
  await act(async()=>renderer.update(<SheetHandle onClose={close} disabled={false}/>));
  expect(button.props.disabled).toBe(false);expect(button.props.accessibilityState.disabled).toBe(false);
  await act(async()=>button.props.onPress());expect(close).toHaveBeenCalledOnce();
});
