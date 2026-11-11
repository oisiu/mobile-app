import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useCallback,useEffect,useRef,useState } from 'react';
import { StyleSheet,View } from 'react-native';
import type { useAppearance } from './useAppearance';

type ToastState={id:number;message:string};
type Props={toast:ToastState|null;palette:ReturnType<typeof useAppearance>['palette'];bottom:number};

export function useSuccessToast(){
  const [toast,setToast]=useState<ToastState|null>(null);
  const toastId=useRef(0);
  const showSuccess=useCallback((message:string)=>setToast({id:++toastId.current,message}),[]);
  useEffect(()=>{
    if(!toast)return;
    const timer=setTimeout(()=>setToast(current=>current?.id===toast.id?null:current),2600);
    return()=>clearTimeout(timer);
  },[toast]);
  return {toast,showSuccess};
}

export function SuccessToastView({toast,palette:c,bottom}:Props){
  if(!toast)return null;
  return <View pointerEvents="none" style={[s.toastLayer,{bottom}]}>
    <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[s.toast,{backgroundColor:`${c.card}EB`,borderColor:`${c.accent}40`}]}>
      <View style={[s.toastIcon,{backgroundColor:`${c.accent}1F`}]}>
        <Ionicons name="checkmark" size={18} color={c.accent}/>
      </View>
      <Text numberOfLines={2} style={[s.toastText,{color:c.text}]}>{toast.message}</Text>
    </View>
  </View>;
}

const s=StyleSheet.create({
  toastLayer:{position:'absolute',left:16,right:16,alignItems:'center',zIndex:100,elevation:20},
  toast:{width:'100%',maxWidth:460,minHeight:52,borderRadius:20,borderWidth:1,paddingHorizontal:14,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:11,shadowColor:'#000',shadowOpacity:.12,shadowRadius:18,shadowOffset:{width:0,height:6},elevation:6},
  toastIcon:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center'},
  toastText:{flex:1,fontSize:14,lineHeight:20,fontWeight:'600'},
});
