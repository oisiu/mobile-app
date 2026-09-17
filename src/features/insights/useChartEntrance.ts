import { useNavigation } from 'expo-router';
import type { NativeStackNavigationProp } from 'expo-router/native-stack';
import { useEffect,useState } from 'react';
import { observeChartEntrance } from './chartEntrance';

export function useChartEntrance(id:string){
  const navigation=useNavigation<NativeStackNavigationProp<{ 'insight/[id]':{id:string} }>>();
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    setReady(false);
    return observeChartEntrance(navigation,()=>setReady(true));
  },[id,navigation]);
  return ready;
}
