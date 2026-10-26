import React from 'react';
import { act,create,type ReactTestRenderer } from 'react-test-renderer';
import { afterEach,expect,it,vi } from 'vitest';
import { Text,TextInput } from '../src/theme/Typography';
import { SvgText } from '../src/theme/SvgTypography';

vi.unmock('@/theme/Typography');
vi.unmock('@/theme/SvgTypography');
vi.mock('react-native',()=>({Text:'NativeText',TextInput:'NativeInput',StyleSheet:{flatten:(style:unknown):object=>Array.isArray(style)?Object.assign({},...style.map(item=>item&&typeof item==='object'?item:{})):style??{}}}));
vi.mock('react-native-svg',()=>({Text:'NativeSvgText'}));
let renderer:ReactTestRenderer;
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount())});

it.each([[undefined,'Manrope-Regular'],['normal','Manrope-Regular'],['bold','Manrope-Bold'],['600','Manrope-SemiBold'],['700','Manrope-Bold'],['800','Manrope-ExtraBold']] as const)('uses the bundled font for native text weight %s',async(weight,font)=>{
 await act(async()=>{renderer=create(<Text accessibilityLabel="label" style={[{color:'red'},{fontWeight:weight}]}>Example</Text>)});
 const node=renderer.root.findByType('NativeText' as React.ElementType);
 expect(node.props.style[1]).toEqual({fontFamily:font,fontWeight:'normal'});
 expect(node.props.style[0]).toEqual([{color:'red'},{fontWeight:weight}]);
 expect(node.props.children).toBe('Example');expect(node.props.accessibilityLabel).toBe('label');
});

it('uses the regular font for unstyled text and preserves input props and refs',async()=>{
 const change=vi.fn(),ref=React.createRef<never>();
 await act(async()=>{renderer=create(<><Text>Example</Text><TextInput ref={ref} value="Draft" onChangeText={change} style={{fontWeight:'600'}}/></>)});
 expect(renderer.root.findByType('NativeText' as React.ElementType).props.style[1].fontFamily).toBe('Manrope-Regular');
 const input=renderer.root.findByType('NativeInput' as React.ElementType);
 expect(input.props.style[1]).toEqual({fontFamily:'Manrope-SemiBold',fontWeight:'normal'});
 expect(input.props.ref).toBe(ref);expect(input.props.value).toBe('Draft');expect(input.props.onChangeText).toBe(change);
});

it.each([[undefined,'Manrope-Regular'],['bold','Manrope-Bold'],[600,'Manrope-SemiBold'],[700,'Manrope-Bold'],[800,'Manrope-ExtraBold']] as const)('uses the bundled font for SVG weight %s',async(weight,font)=>{
 await act(async()=>{renderer=create(<SvgText fontWeight={weight} x={12} fill="red">Example</SvgText>)});
 const node=renderer.root.findByType('NativeSvgText' as React.ElementType);
 expect(node.props.fontFamily).toBe(font);expect(node.props.fontWeight).toBe('normal');
 expect(node.props.x).toBe(12);expect(node.props.fill).toBe('red');expect(node.props.children).toBe('Example');
});
