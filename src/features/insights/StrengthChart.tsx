import React,{useMemo,useState} from 'react';
import { Text,View } from 'react-native';
import Svg,{Circle,Line,Polyline,Text as SvgText} from 'react-native-svg';
import { habitStrength,strengthSummary } from '@/domain/habitStrength';
import { InsightPeriod,TimeBucket } from '@/domain/analytics';
import { Entry,Habit } from '@/domain/types';
import { t } from '@/i18n';
import { light } from '@/theme';

export function StrengthChart({habit,selected,habits,entries,today,buckets,period,c}:{habit:Habit;selected:{habit:Habit;color:string}[];habits:Habit[];entries:Entry[];today:string;buckets:TimeBucket[];period:InsightPeriod;c:typeof light}){
  const [width,setWidth]=useState(320);
  const summary=useMemo(()=>strengthSummary(habit,habits,entries,today),[habit,habits,entries,today]);
  const series=useMemo(()=>selected.map(item=>({...item,values:habitStrength(item.habit,habits,entries,buckets)})),[selected,habits,entries,buckets]);
  const left=42,right=width-14,span=Math.max(1,right-left),stride=Math.max(1,Math.ceil(buckets.length/Math.max(2,Math.floor(span/32))));
  const x=(index:number)=>left+span*index/Math.max(1,buckets.length-1),y=(value:number)=>160-value*1.4;
  const percent=(value:number,signed=false)=>new Intl.NumberFormat(undefined,{style:'percent',maximumFractionDigits:0,signDisplay:signed?'always':'auto'}).format(value/100);
  const stats=[
    {label:t('score'),value:percent(summary.current),accessible:t('strengthCurrent')},
    {label:t('month'),value:percent(summary.monthChange,true),accessible:t('strengthMonthChange')},
    {label:t('year'),value:percent(summary.yearChange,true),accessible:t('strengthYearChange')},
    {label:t('total'),value:new Intl.NumberFormat().format(summary.total),accessible:t('strengthTotal')},
  ];
  return <View onLayout={event=>setWidth(event.nativeEvent.layout.width)}>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:16,marginBottom:8}}>{stats.map(stat=><View key={stat.label} accessible accessibilityLabel={`${stat.accessible}: ${stat.value}`} style={{flexGrow:1,minWidth:56,alignItems:'center'}}><Text style={{color:c.accent,fontSize:19,fontWeight:'700'}}>{stat.value}</Text><Text style={{color:c.muted,fontSize:11}}>{stat.label}</Text></View>)}</View>
    <Svg accessible accessibilityLabel={`${t('score')}. ${buckets.filter(bucket=>bucket.dates.size>0).map(bucket=>{const index=buckets.indexOf(bucket);return `${bucket.key}: ${series.map(item=>`${item.habit.name} ${percent(item.values[index])}`).join(', ')}`}).join('; ')}`} width={width} height={202} viewBox={`0 0 ${width} 202`}>
      {[100,80,60,40,20,0].map(value=><React.Fragment key={value}><Line x1={left} x2={right} y1={y(value)} y2={y(value)} stroke={c.line}/><SvgText x={left-8} y={y(value)+4} textAnchor="end" fill={c.muted} fontSize={10}>{`${value}%`}</SvgText></React.Fragment>)}
      {series.map(item=><React.Fragment key={item.habit.id}><Polyline points={item.values.flatMap((value,index)=>buckets[index].dates.size?[`${x(index)},${y(value)}`]:[]).join(' ')} fill="none" stroke={item.color} strokeWidth={2}/>{item.values.map((value,index)=>buckets[index].dates.size>0&&<Circle key={buckets[index].key} cx={x(index)} cy={y(value)} r={3.5} fill={item.color}/>)}</React.Fragment>)}
      {buckets.map((bucket,index)=>{
        const label=period==='month'||period==='quarter'?bucket.label.replace(/[.\s]/g,'').slice(0,3):bucket.label;
        return <React.Fragment key={bucket.key}>{(index%stride===0||index===buckets.length-1)&&<SvgText x={x(index)} y={178} textAnchor={index===0?'start':index===buckets.length-1?'end':'middle'} fill={c.muted} fontSize={11}>{label}</SvgText>}{period==='quarter'&&(index===0||bucket.key.slice(0,4)!==buckets[index-1].key.slice(0,4))&&<SvgText x={x(index)} y={194} textAnchor={index===0?'start':'middle'} fill={c.muted} fontSize={11}>{bucket.key.slice(0,4)}</SvgText>}</React.Fragment>;
      })}
    </Svg>
  </View>;
}
