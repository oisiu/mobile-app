import { useTimelineScroll } from './useTimelineScroll';
import React,{useState} from 'react';
import { ScrollView,Text,View } from 'react-native';
import Svg,{Line,Rect,Text as SvgText} from 'react-native-svg';
import { historyAxis } from '@/domain/history';
import { BucketSize,TimeBucket } from '@/domain/analytics';
import { Habit } from '@/domain/types';
import { light } from '@/theme';
import { t } from '@/i18n';

export function HistoryChart({series,buckets,bucketSize,type,c,showLegend=true,highlightedId=null,onHighlight,timeline=false,showValues=false,onLoadEarlier}:{series:{habit:Habit;color:string;values:number[]}[];buckets:TimeBucket[];bucketSize:BucketSize;type:Habit['type'];c:typeof light;showLegend?:boolean;highlightedId?:string|null;onHighlight?:(id:string|null)=>void;timeline?:boolean;showValues?:boolean;onLoadEarlier?:()=>void}){
  const [width,setWidth]=useState(320);
  const totals=buckets.map((_,index)=>series.reduce((sum,item)=>sum+item.values[index],0)),axis=historyAxis(totals,type);
  const format=(value:number)=>new Intl.NumberFormat(undefined,{maximumFractionDigits:Math.min(12,Math.max(0,-Math.floor(Math.log10(axis.step)))),notation:axis.max>=10000?'compact':'standard'}).format(value);
  const valueLabel=(value:number)=>new Intl.NumberFormat(undefined,{maximumSignificantDigits:4,notation:value>=10000?'compact':'standard'}).format(value);
  const timelineScroll=useTimelineScroll(buckets,onLoadEarlier);
  const spacing=Math.max(bucketSize==='day'?28:bucketSize==='week'?58:40,...totals.map(value=>valueLabel(value/axis.divisor).length*6+10));
  const plotWidth=timeline?Math.max(width,buckets.length*spacing):width;
  const left=Math.max(28,...axis.ticks.map(value=>format(value).length*6+12)),right=Math.max(left+1,plotWidth-4),slot=(right-(timeline?0:left))/Math.max(1,buckets.length);
  const grouped=bucketSize==='month'||bucketSize==='quarter';
  const labelStride=timeline?1:bucketSize==='month'?(buckets.length<=3?1:3):bucketSize==='day'&&buckets.length>7?Math.max(1,Math.ceil(24/slot)):1;
  const plot=<Svg accessible accessibilityLabel={t('history')+', '+t(axis.unit)+'. '+buckets.flatMap((bucket,index)=>bucket.dates.size?[bucket.key+': '+series.map(item=>item.habit.name+': '+item.values[index]/axis.divisor).join(', ')]:[]).join('; ')} width={plotWidth} height={202} viewBox={'0 0 '+plotWidth+' 202'}>
      {axis.ticks.map(value=>{const y=160-value/axis.max*140;return <React.Fragment key={value}><Line x1={timeline?0:left} y1={y} x2={right} y2={y} stroke={c.line}/>{!timeline&&<SvgText x={left-6} y={y+3} fill={c.muted} fontSize={11} textAnchor="end">{format(value)}</SvgText>}</React.Fragment>})}
      {buckets.map((bucket,index)=>{
        const x=(timeline?0:left)+slot*(index+.5),barWidth=Math.min(22,slot*.7);
        return <React.Fragment key={bucket.key}>{series.map((item,seriesIndex)=>{
          const value=item.values[index]/axis.divisor,height=value/axis.max*140,stacked=series.slice(0,seriesIndex+1).reduce((sum,part)=>sum+part.values[index]/axis.divisor/axis.max*140,0);
          return value>0?<Rect onPress={onHighlight?()=>onHighlight(highlightedId===item.habit.id?null:item.habit.id):undefined} key={item.habit.id} x={x-barWidth/2} y={160-stacked} width={barWidth} height={height} opacity={highlightedId&&highlightedId!==item.habit.id?.22:1} stroke={highlightedId===item.habit.id?c.text:undefined} strokeWidth={highlightedId===item.habit.id?1.5:0} fill={item.color}/>:null;
        })}
          {showValues&&totals[index]>0&&<SvgText x={x} y={Math.max(12,154-totals[index]/axis.divisor/axis.max*140)} fill={c.text} fontSize={10} fontWeight="600" textAnchor="middle">{valueLabel(totals[index]/axis.divisor)}</SvgText>}
          {(grouped?index%labelStride===0:index===0||index===buckets.length-1||(index%labelStride===0&&buckets.length-1-index>=labelStride))&&<SvgText x={x} y={177} fill={c.muted} fontSize={grouped?9:11} textAnchor="middle">{bucketSize==='quarter'&&!timeline?t('quarterShort',{number:bucket.label}):grouped?bucket.label.replace(/[.\s]/g,'').slice(0,3):bucket.label}</SvgText>}
          {(grouped||bucketSize==='week')&&(index===0||bucket.key.slice(0,4)!==buckets[index-1].key.slice(0,4))&&<SvgText x={x} y={193} fill={c.muted} fontSize={11} textAnchor={index===0?'start':'middle'}>{bucket.key.slice(0,4)}</SvgText>}
        </React.Fragment>;
      })}
    </Svg>;
  return <View onLayout={event=>setWidth(event.nativeEvent.layout.width)}>

    {type==='duration'&&<Text style={{fontSize:10,marginTop:8,color:c.muted}}>{t(axis.unit)}</Text>}
    {timeline?<View><Svg width={left} height={202} style={{position:'absolute',left:0,top:0}}>{axis.ticks.map(value=><SvgText key={value} x={left-6} y={163-value/axis.max*140} textAnchor="end" fill={c.muted} fontSize={11}>{format(value)}</SvgText>)}</Svg><ScrollView {...timelineScroll} style={{marginLeft:left}} horizontal showsHorizontalScrollIndicator scrollEventThrottle={32} accessibilityLabel={t('historyTimeline')}>{plot}</ScrollView></View>:plot}
    {showLegend&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:16,marginBottom:8}}>{series.map(item=><View key={item.habit.id} style={{flexDirection:'row',alignItems:'center',gap:5}}><View style={{width:9,height:9,borderRadius:5,backgroundColor:item.color}}/><Text style={{color:c.muted,fontSize:11}}>{item.habit.emoji} {item.habit.name}</Text></View>)}</View>}
  </View>;
}
