import React,{useMemo,useRef} from 'react';
import { PanResponder,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/i18n';

export function CategoryDragHandle({name,color,disabled,onStart,onMove,onEnd,onCancel,onStep}:{name:string;color:string;disabled:boolean;onStart:()=>void;onMove:(dy:number)=>void;onEnd:()=>void;onCancel:()=>void;onStep:(direction:number)=>void}){
  const latest=useRef({disabled,onStart,onMove,onEnd,onCancel});latest.current={disabled,onStart,onMove,onEnd,onCancel};
  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>!latest.current.disabled,
    onPanResponderGrant:()=>latest.current.onStart(),
    onPanResponderMove:(_,gesture)=>latest.current.onMove(gesture.dy),
    onPanResponderRelease:()=>latest.current.onEnd(),
    onPanResponderTerminate:()=>latest.current.onCancel(),
    onPanResponderTerminationRequest:()=>false,
  }),[]);
  return <View {...responder.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={`${t('reorder')} ${name}`} accessibilityHint={t('dragCategoryHint')} accessibilityState={{disabled}} accessibilityActions={[{name:'increment',label:t('moveDown')},{name:'decrement',label:t('moveUp')}]} onAccessibilityAction={event=>{if(!disabled)onStep(event.nativeEvent.actionName==='increment'?1:-1)}} style={{width:24,minHeight:48,alignItems:'center',justifyContent:'center'}}><Ionicons name="reorder-two" size={18} color={color}/></View>;
}
