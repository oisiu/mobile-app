import { useEffect,useRef } from 'react';
import { NativeScrollEvent,NativeSyntheticEvent,ScrollView } from 'react-native';
import { TimeBucket } from '@/domain/analytics';

export function useTimelineScroll(buckets:TimeBucket[],onLoadEarlier?:()=>void){
  const scroll=useRef<ScrollView>(null),offset=useRef(0),loading=useRef(false),gestureLoaded=useRef(false);
  const first=buckets[0]?.key;
  useEffect(()=>{loading.current=false},[first]);
  const previous=useRef<{width:number;count:number;first:string|undefined;last:string|undefined}|null>(null);
  const onContentSizeChange=(width:number)=>{
    const next={width,count:buckets.length,first:buckets[0]?.key,last:buckets.at(-1)?.key},before=previous.current;
    if(!before)scroll.current?.scrollToEnd({animated:false});
    else if(next.count>before.count&&next.first!==before.first&&next.last===before.last){
      offset.current=Math.max(0,offset.current+width-before.width);
      scroll.current?.scrollTo({x:offset.current,animated:false});
    }
    previous.current=next;loading.current=false;
  };
  const onScroll=(event:NativeSyntheticEvent<NativeScrollEvent>)=>{offset.current=event.nativeEvent.contentOffset.x};
  const loadEarlier=(event:NativeSyntheticEvent<NativeScrollEvent>)=>{
    if(event.nativeEvent.contentOffset.x>=64||loading.current||gestureLoaded.current||!onLoadEarlier)return;
    loading.current=true;gestureLoaded.current=true;onLoadEarlier();
  };
  return {ref:scroll,onContentSizeChange,onScroll,onScrollBeginDrag:()=>{gestureLoaded.current=false},onScrollEndDrag:loadEarlier,onMomentumScrollEnd:loadEarlier};
}
