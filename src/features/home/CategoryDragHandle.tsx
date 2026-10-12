import React,{useMemo,useRef} from 'react';
import { PanResponder,View } from 'react-native';
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
  return <View {...responder.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={`${t('reorder')} ${name}`} accessibilityHint={t('dragCategoryHint')} accessibilityState={{disabled}} accessibilityActions={[{name:'increment',label:t('moveDown')},{name:'decrement',label:t('moveUp')}]} onAccessibilityAction={event=>{if(!disabled)onStep(event.nativeEvent.actionName==='increment'?1:-1)}} style={{width:24,minHeight:48,alignItems:'center',justifyContent:'center'}}>
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:8,height:13,flexDirection:'row',flexWrap:'wrap',gap:2,opacity:0.65}}>
      {Array.from({length:6},(_,index)=><View key={index} style={{width:3,height:3,borderRadius:1.5,backgroundColor:color}}/>)}
    </View>
  </View>;
}
