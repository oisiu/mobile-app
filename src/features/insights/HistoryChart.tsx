import React,{useState} from 'react';
import { Text,View } from 'react-native';
import Svg,{Line,Rect,Text as SvgText} from 'react-native-svg';
import { historyAxis } from '@/domain/history';
import { InsightPeriod,TimeBucket } from '@/domain/analytics';
import { Habit } from '@/domain/types';
import { light } from '@/theme';
import { t } from '@/i18n';

export function HistoryChart({series,buckets,period,type,c}:{series:{habit:Habit;color:string;values:number[]}[];buckets:TimeBucket[];period:InsightPeriod;type:Habit['type'];c:typeof light}){
  const [width,setWidth]=useState(320);
  const totals=buckets.map((_,index)=>series.reduce((sum,item)=>sum+item.values[index],0)),axis=historyAxis(totals,type);
  const format=(value:number)=>new Intl.NumberFormat(undefined,{maximumFractionDigits:Math.min(12,Math.max(0,-Math.floor(Math.log10(axis.step)))),notation:axis.max>=10000?'compact':'standard'}).format(value);
  const left=Math.max(28,...axis.ticks.map(value=>format(value).length*6+12)),right=Math.max(left+1,width-4),slot=(right-left)/Math.max(1,buckets.length);
  const labelStride=period==='quarter'?3:period==='month'?Math.max(1,Math.ceil(24/slot)):1;
  return <View onLayout={event=>setWidth(event.nativeEvent.layout.width)}>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:16,marginBottom:8}}>{series.map(item=><View key={item.habit.id} style={{flexDirection:'row',alignItems:'center',gap:5}}><View style={{width:9,height:9,borderRadius:5,backgroundColor:item.color}}/><Text style={{color:c.muted,fontSize:11}}>{item.habit.emoji} {item.habit.name}</Text></View>)}</View>
    {type==='duration'&&<Text style={{fontSize:10,marginTop:8,color:c.muted}}>{t(axis.unit)}</Text>}
    <Svg accessible accessibilityLabel={t('history')+', '+t(axis.unit)+'. '+buckets.flatMap((bucket,index)=>bucket.dates.size?[bucket.key+': '+series.map(item=>item.habit.name+': '+item.values[index]/axis.divisor).join(', ')]:[]).join('; ')} width={width} height={202} viewBox={'0 0 '+width+' 202'}>
      {axis.ticks.map(value=>{const y=160-value/axis.max*140;return <React.Fragment key={value}><Line x1={left} y1={y} x2={right} y2={y} stroke={c.line}/><SvgText x={left-6} y={y+3} fill={c.muted} fontSize={11} textAnchor="end">{format(value)}</SvgText></React.Fragment>})}
      {buckets.map((bucket,index)=>{
        const x=left+slot*(index+.5),barWidth=Math.min(22,slot*.7);
        return <React.Fragment key={bucket.key}>{series.map((item,seriesIndex)=>{
          const value=item.values[index]/axis.divisor,height=value/axis.max*140,stacked=series.slice(0,seriesIndex+1).reduce((sum,part)=>sum+part.values[index]/axis.divisor/axis.max*140,0);
          return value>0?<Rect key={item.habit.id} x={x-barWidth/2} y={160-stacked} width={barWidth} height={height} fill={item.color}/>:null;
        })}
          {(period==='quarter'?index%labelStride===0:index===0||index===buckets.length-1||(index%labelStride===0&&buckets.length-1-index>=labelStride))&&<SvgText x={x} y={177} fill={c.muted} fontSize={period==='quarter'?9:11} textAnchor="middle">{period==='quarter'?bucket.label.replace(/[.\s]/g,'').slice(0,3):bucket.label}</SvgText>}
          {period==='quarter'&&(index===0||bucket.key.slice(0,4)!==buckets[index-1].key.slice(0,4))&&<SvgText x={x} y={193} fill={c.muted} fontSize={11} textAnchor={index===0?'start':'middle'}>{bucket.key.slice(0,4)}</SvgText>}
        </React.Fragment>;
      })}
    </Svg>
  </View>;
}
