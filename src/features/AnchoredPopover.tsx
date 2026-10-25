import React,{useEffect,useState} from 'react';
import { GestureResponderEvent,Keyboard,Modal,Pressable,StyleSheet,useWindowDimensions,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { light } from '@/theme';

export type PopoverAnchor={x:number;y:number;width:number;height:number};

export function openPopover(event:GestureResponderEvent|undefined,onOpen:(anchor:PopoverAnchor|null)=>void){
  const target=event?.currentTarget as unknown as {measureInWindow?:(callback:(x:number,y:number,width:number,height:number)=>void)=>void}|undefined;
  if(target?.measureInWindow)target.measureInWindow((x,y,width,height)=>onOpen({x,y,width,height}));
  else onOpen(null);
}

export function AnchoredPopover({visible,onClose,onEscape=onClose,onShow,anchor,c,children,maxWidth=320,maxHeight=440,footer,fillHeight=false}:{visible:boolean;onClose:()=>void;onEscape?:()=>void;onShow?:()=>void;anchor:PopoverAnchor|null;c:typeof light;children:React.ReactNode;maxWidth?:number;maxHeight?:number;footer?:React.ReactNode;fillHeight?:boolean}){
  const insets=useSafeAreaInsets(),window=useWindowDimensions(),[keyboardTop,setKeyboardTop]=useState<number|null>(null);
  useEffect(()=>{
    if(!visible){setKeyboardTop(null);return}
    const show=Keyboard.addListener('keyboardDidShow',event=>setKeyboardTop(event.endCoordinates.screenY));
    const hide=Keyboard.addListener('keyboardDidHide',()=>setKeyboardTop(null));
    return ()=>{show.remove();hide.remove()};
  },[visible]);
  const height=Math.min(window.height,keyboardTop??window.height),width=Math.min(maxWidth,window.width-insets.left-insets.right-24);
  const source=anchor??{x:window.width-width-12,y:insets.top+60,width,height:36};
  const target={...source,y:Math.max(insets.top+12,Math.min(source.y,height-insets.bottom-source.height-20))};
  const below=height-insets.bottom-target.y-target.height-20,above=target.y-insets.top-20;
  const opensBelow=below>=Math.min(320,above),available=Math.max(0,opensBelow?below:above);
  const left=Math.max(insets.left+12,Math.min(target.x+target.width-width,window.width-insets.right-width-12));
  return <Modal transparent visible={visible} animationType="fade" statusBarTranslucent navigationBarTranslucent onShow={onShow} onRequestClose={onEscape}><View style={{flex:1}}><View style={{flex:1}}><Pressable style={StyleSheet.absoluteFill} onPress={onClose}/><Pressable accessibilityViewIsModal onAccessibilityEscape={onEscape} onPress={()=>undefined} style={[{position:'absolute',left,width,maxHeight:Math.min(maxHeight,available),height:fillHeight?Math.min(maxHeight,available):undefined,borderRadius:18,padding:12,backgroundColor:c.card,borderWidth:StyleSheet.hairlineWidth,borderColor:c.line,boxShadow:'0 6px 24px #0003'},opensBelow?{top:target.y+target.height+8}:{bottom:window.height-target.y+8}]}>{children}</Pressable></View>{footer}</View></Modal>;
}
