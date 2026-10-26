import { Text } from '@/theme/Typography';
import { SvgText } from '@/theme/SvgTypography';
import { dayBucketContext } from '@/domain/chartTimeline';
import { useTimelineScroll } from './useTimelineScroll';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import { AccessibilityInfo,Animated,ScrollView,View } from 'react-native';
import Svg,{Circle,Line,Polyline} from 'react-native-svg';
import { habitStrength,strengthSummary } from '@/domain/habitStrength';
import { BucketSize,TimeBucket } from '@/domain/analytics';
import { Entry,Habit } from '@/domain/types';
import { t } from '@/i18n';
import { light } from '@/theme';

export function StrengthChart({habit,selected,habits,entries,today,buckets,bucketSize,c,showSummary=true,showPoints=true,highlightedId=null,onHighlight,timeline=false,onLoadEarlier,loading=false,animateEntrance=false}:{habit:Habit;selected:{habit:Habit;color:string}[];habits:Habit[];entries:Entry[];today:string;buckets:TimeBucket[];bucketSize:BucketSize;c:typeof light;showSummary?:boolean;showPoints?:boolean;highlightedId?:string|null;onHighlight?:(id:string|null)=>void;timeline?:boolean;onLoadEarlier?:()=>void;loading?:boolean;animateEntrance?:boolean}){
  const [width,setWidth]=useState(320);
  const summary=useMemo(()=>showSummary&&!loading?strengthSummary(habit,habits,entries,today):null,[showSummary,loading,habit,habits,entries,today]);
  const series=useMemo(()=>loading?[]:selected.map(item=>({...item,values:habitStrength(item.habit,habits,entries,buckets)})),[loading,selected,habits,entries,buckets]);
  const timelineScroll=useTimelineScroll(buckets,onLoadEarlier);
  const plotWidth=timeline?Math.max(width,buckets.length*(bucketSize==='day'?32:bucketSize==='week'?60:52)+56):width;
  const progress=useRef(new Animated.Value(animateEntrance?0:1)).current;
  const [drawProgress,setDrawProgress]=useState(animateEntrance?0:1);
  useEffect(()=>{
    if(loading||!animateEntrance)return;
    let active=true;
    const listener=progress.addListener(({value})=>setDrawProgress(value));
    const reveal=(reduceMotion:boolean)=>{
      if(!active)return;
      if(reduceMotion){progress.setValue(1);setDrawProgress(1);return}
      Animated.timing(progress,{toValue:1,delay:600,duration:600,useNativeDriver:false}).start(({finished})=>{if(active&&finished)setDrawProgress(1)});
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(reveal,()=>reveal(true));
    const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',reduceMotion=>{if(reduceMotion){progress.stopAnimation();reveal(true)}});
    return()=>{active=false;progress.stopAnimation();progress.removeListener(listener);subscription.remove()};
  },[loading,animateEntrance,progress]);
  const left=timeline&&bucketSize!=='day'?8:42,right=plotWidth-14,span=Math.max(1,right-left),stride=timeline?1:bucketSize==='month'?(buckets.length<=3?1:3):Math.max(1,Math.ceil(buckets.length/Math.max(2,Math.floor(span/32))));
  const x=(index:number)=>left+span*index/Math.max(1,buckets.length-1),y=(value:number)=>160-value*1.4;
  const revealX=plotWidth-Math.max(0,width-(timeline?42:0))*(1-drawProgress);
  const linePoints=(values:number[])=>{
    const points=values.flatMap((value,index)=>buckets[index].dates.size?[{x:x(index),y:y(value)}]:[]);
    const visible=points.filter(point=>point.x<=revealX);
    const next=points.find(point=>point.x>revealX),last=visible.at(-1);
    if(next&&last)visible.push({x:revealX,y:last.y+(next.y-last.y)*(revealX-last.x)/(next.x-last.x)});
    return visible.map(point=>`${point.x},${point.y}`).join(' ');
  };
  const percent=(value:number,signed=false)=>new Intl.NumberFormat(undefined,{style:'percent',maximumFractionDigits:0,signDisplay:signed?'always':'auto'}).format(value/100);
  const stats=summary?[
    {label:t('score'),value:percent(summary.current),accessible:t('strengthCurrent')},
    {label:t('month'),value:percent(summary.monthChange,true),accessible:t('strengthMonthChange')},
    {label:t('year'),value:percent(summary.yearChange,true),accessible:t('strengthYearChange')},
    {label:t('total'),value:new Intl.NumberFormat().format(summary.total),accessible:t('strengthTotal')},
  ]:loading?(['score','month','year','total'] as const).map(label=>({label:t(label),value:'',accessible:''})):[];
  const plot=<Svg accessible accessibilityState={{busy:loading}} accessibilityLabel={`${t('score')}. ${buckets.filter(bucket=>bucket.dates.size>0).map(bucket=>{const index=buckets.indexOf(bucket);return `${bucket.key}: ${series.map(item=>`${item.habit.name} ${percent(item.values[index])}`).join(', ')}`}).join('; ')}`} width={plotWidth} height={202} viewBox={`0 0 ${plotWidth} 202`}>
      {[100,80,60,40,20,0].map(value=><React.Fragment key={value}><Line x1={left} x2={right} y1={y(value)} y2={y(value)} stroke={c.line}/>{!timeline&&<SvgText x={left-8} y={y(value)+4} textAnchor="end" fill={c.muted} fontSize={10}>{`${value}%`}</SvgText>}</React.Fragment>)}
      {series.map(item=><React.Fragment key={item.habit.id}><Polyline onPress={onHighlight?()=>onHighlight(highlightedId===item.habit.id?null:item.habit.id):undefined} points={linePoints(item.values)} fill="none" stroke={item.color} strokeWidth={highlightedId===item.habit.id?4:2} opacity={highlightedId&&highlightedId!==item.habit.id?.22:1}/>{showPoints&&item.values.map((value,index)=>buckets[index].dates.size>0&&x(index)<=revealX&&<Circle key={buckets[index].key} cx={x(index)} cy={y(value)} r={highlightedId===item.habit.id?5:3.5} opacity={highlightedId&&highlightedId!==item.habit.id?.22:1} fill={item.color}/>)}</React.Fragment>)}
      {buckets.map((bucket,index)=>{
        const label=bucketSize==='month'?bucket.label.replace(/[.\s]/g,'').slice(0,3):bucket.label;
        const dayContext=bucketSize==='day'?dayBucketContext(buckets,index):null;
        return <React.Fragment key={bucket.key}>{(bucketSize==='month'?index%stride===0:index===0||index===buckets.length-1||(index%stride===0&&buckets.length-1-index>=stride))&&<SvgText x={x(index)} y={178} textAnchor={bucketSize==='day'?'middle':index===0?'start':index===buckets.length-1?'end':'middle'} fill={c.muted} fontSize={bucketSize==='month'?9:11}>{label}</SvgText>}{(bucketSize==='month'||bucketSize==='quarter'||bucketSize==='week')&&(index===0||bucket.key.slice(0,4)!==buckets[index-1].key.slice(0,4))&&<SvgText x={x(index)} y={194} textAnchor={index===0?'start':'middle'} fill={c.muted} fontSize={11}>{bucket.key.slice(0,4)}</SvgText>}{dayContext&&<SvgText x={x(index)} y={194} textAnchor="middle" fill={c.muted} fontSize={11}>{dayContext}</SvgText>}</React.Fragment>;
      })}
    </Svg>;
  return <View onLayout={event=>setWidth(event.nativeEvent.layout.width)}>
    {showSummary&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:16,marginBottom:8}}>{stats.map(stat=><View key={stat.label} accessible={!loading} accessibilityLabel={loading?undefined:`${stat.accessible}: ${stat.value}`} style={{flexGrow:1,minWidth:56,alignItems:'center'}}><>{loading?<View accessibilityRole="progressbar" accessibilityLabel={stat.label} style={{width:40,height:23,borderRadius:6,backgroundColor:c.soft}}/>:<Text style={{color:c.accent,fontSize:19,fontWeight:'700'}}>{stat.value}</Text>}</><Text style={{color:c.muted,fontSize:11}}>{stat.label}</Text></View>)}</View>}
    {timeline?<View><Svg width={42} height={202} style={{position:'absolute',left:0,top:0}}>{[100,80,60,40,20,0].map(value=><SvgText key={value} x={34} y={y(value)+4} textAnchor="end" fill={c.muted} fontSize={10}>{`${value}%`}</SvgText>)}</Svg><ScrollView style={{marginLeft:42}} {...timelineScroll} horizontal bounces={false} overScrollMode="never" showsHorizontalScrollIndicator={false} scrollEventThrottle={32} accessibilityLabel={t('consistencyTimeline')}>{plot}</ScrollView></View>:plot}
  </View>;
}
