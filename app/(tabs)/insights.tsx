import { visibleHabitSnapshot } from '@/domain/habitVisibility';
import { OverviewLegend } from '@/features/insights/OverviewLegend';
import { PieCategoryFilter } from '@/features/insights/PieCategoryFilter';
import { OverviewComparison } from '@/features/insights/OverviewComparison';
import { habitChartColor } from '@/theme/habitColors';
import { mainTitle } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import React,{useMemo,useState} from 'react';
import { ActivityIndicator,ScrollView,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import Svg,{Circle,Text as SvgText} from 'react-native-svg';
import { buildInsightWindow,shiftInsightAnchor } from '@/domain/analytics';
import { strengthWindowLabel } from '@/domain/strengthWindow';
import { todayLocal } from '@/domain/entries';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';
import { buildInsightsOverview,OverviewPeriod } from '@/domain/insightsOverview';
import { usePrefetchRoutes,useResponsiveNavigation } from '@/features/useResponsiveNavigation';

export default function Insights(){
  const [pieHighlight,setPieHighlight]=useState<string|null>(null);
  const [period,setPeriod]=useState<OverviewPeriod>('month'),[pieIds,setPieIds]=useState<Set<string>|null>(null);
  const today=todayLocal(),[anchor,setAnchor]=useState(today);
  const {habits:allHabits,entries:allEntries,palette:c}=useApp(),{habits,entries}=useMemo(()=>visibleHabitSnapshot(allHabits,allEntries),[allHabits,allEntries]),{elapsedDays,ranked}=buildInsightsOverview(habits,entries,today,period,anchor),navigation=useResponsiveNavigation();
  const matching=ranked.filter(item=>pieIds===null||pieIds.has(item.habit.id)),pieRanked=matching.length?matching:ranked;
  const highlightedId=pieRanked.some(item=>item.habit.id===pieHighlight&&item.active>0)?pieHighlight:null;
  const total=pieRanked.reduce((sum,item)=>sum+item.active,0),window=buildInsightWindow(period,anchor,today),current=window.start===buildInsightWindow(period,today,today).start;
  const gridTitle=strengthWindowLabel(period,anchor,window.start,false);
  const percentage=(active:number)=>new Intl.NumberFormat(undefined,{style:'percent',maximumFractionDigits:1}).format(total?active/total:0);
  const color=(index:number)=>habitChartColor(ranked[index].habit,allHabits);
  const move=(amount:number)=>setAnchor(value=>{const next=shiftInsightAnchor(value,period,amount);return next>today?today:next});

  usePrefetchRoutes(ranked.map(item=>`/insight/${item.habit.id}`));
  return <ScrollView style={[s.page,{backgroundColor:c.bg}]} contentContainerStyle={s.content}>
    <View style={{minHeight:48,justifyContent:'center'}}><Text style={[s.title,{color:c.text}]}>{t('insights')}</Text></View><Text style={[s.intro,{color:c.muted}]}>{t('habitContributionHelp')}</Text>
    <View style={[s.periodControls,{backgroundColor:c.soft}]}>{(['week','month','year'] as const).map(option=><TouchableOpacity key={option} accessibilityLabel={t(option)} accessibilityRole="button" accessibilityState={{selected:period===option}} onPress={()=>{setPeriod(option);setAnchor(today)}} style={[s.periodButton,period===option&&{backgroundColor:c.card}]}><Text style={[s.periodText,{color:period===option?c.accent:c.muted}]}>{t(option)}</Text></TouchableOpacity>)}</View>
    <View style={[s.list,{backgroundColor:c.card}]}>
      <PieCategoryFilter roots={[...ranked].sort((a,b)=>a.habit.sortOrder-b.habit.sortOrder).map(item=>({habit:item.habit,color:habitChartColor(item.habit,allHabits)}))} selected={pieRanked.map(item=>item.habit)} onChange={setPieIds} c={c}/>
      <View style={{flexDirection:'row',alignItems:'center'}}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('previousPeriod')} onPress={()=>move(-1)} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Ionicons name="chevron-back" size={20} color={c.text}/></TouchableOpacity>
        <Text accessibilityLiveRegion="polite" style={{flex:1,textAlign:'center',color:c.text,fontSize:13}}>{strengthWindowLabel(period,anchor,window.start,false)}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('nextPeriod')} disabled={current} accessibilityState={{disabled:current}} onPress={()=>move(1)} style={{width:44,height:44,alignItems:'center',justifyContent:'center',opacity:current?.3:1}}><Ionicons name="chevron-forward" size={20} color={c.text}/></TouchableOpacity>
      </View>
      <View style={{alignItems:'center',paddingVertical:20}}><Svg width={240} height={240} viewBox="0 0 240 240" accessible accessibilityLabel={t('habitContribution')+'. '+pieRanked.filter(item=>item.active>0).map(item=>item.habit.name+': '+percentage(item.active)).join('; ')}>
        {!total&&<Circle cx={120} cy={120} r={60} fill="none" stroke={c.soft} strokeWidth={120}/>}
        {pieRanked.map((item,index)=>{const fraction=total?item.active/total:0,start=total?pieRanked.slice(0,index).reduce((sum,previous)=>sum+previous.active,0)/total:0;return fraction>0&&<Circle key={item.habit.id} cx={120} cy={120} r={60} fill="none" stroke={habitChartColor(item.habit,allHabits)} strokeWidth={120} opacity={highlightedId&&highlightedId!==item.habit.id?.22:1} strokeDasharray={[fraction*2*Math.PI*60,2*Math.PI*60]} strokeDashoffset={-start*2*Math.PI*60} rotation={-90} origin="120, 120"/>})}
        {pieRanked.map((item,index)=>{
          if(!total||!item.active)return null;
          const fraction=item.active/total,start=pieRanked.slice(0,index).reduce((sum,previous)=>sum+previous.active,0)/total,angle=(start+fraction/2)*2*Math.PI-Math.PI/2,radius=fraction===1?0:84;
          return <SvgText key={'label-'+item.habit.id} x={120+Math.cos(angle)*radius} y={120+Math.sin(angle)*radius} textAnchor="middle" alignmentBaseline="central" fontSize={fraction<.08?9:14} fontWeight="700" fill="white" opacity={highlightedId&&highlightedId!==item.habit.id?.22:1}>{percentage(item.active)}</SvgText>;
        })}
      </Svg></View>
      <OverviewLegend items={pieRanked.filter(item=>item.active>0).sort((a,b)=>a.habit.sortOrder-b.habit.sortOrder).map(item=>({habit:item.habit,color:habitChartColor(item.habit,allHabits)}))} highlightedId={highlightedId} onHighlight={setPieHighlight} c={c}/>
      {!total&&<Text style={[s.empty,{color:c.muted}]}>{t('noActivityPeriod')}</Text>}
    </View>
    <View style={[s.list,{backgroundColor:c.card,marginTop:20,paddingVertical:20}]}>
      <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{color:c.text,fontSize:18,fontWeight:'700',textAlign:'center'}}>{gridTitle}</Text>
      <Text style={{color:c.muted,fontSize:14,textAlign:'center',marginTop:6,marginBottom:20}}>{t('activeDays')}</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>
        {[...ranked].sort((a,b)=>a.habit.sortOrder-b.habit.sortOrder).map(item=>{const index=ranked.indexOf(item),href='/insight/'+item.habit.id,pending=navigation.pending===href;return <TouchableOpacity disabled={navigation.pending!==null} accessibilityRole="button" accessibilityLabel={t('openInsights')+' '+item.habit.name+', '+t('activeDays')+': '+item.active+'/'+elapsedDays} accessibilityState={{busy:pending,disabled:navigation.pending!==null}} onPress={()=>navigation.push(href)} key={item.habit.id} style={{width:'33.333333%',alignItems:'center',paddingHorizontal:8,paddingVertical:16,gap:8}}>
          <View style={{width:64,height:64,borderRadius:20,backgroundColor:color(index)+'3A',alignItems:'center',justifyContent:'center'}}>{pending?<ActivityIndicator color={c.accent}/>:<Text style={{fontSize:34}}>{item.habit.emoji}</Text>}</View>
          <Text style={{color:c.text,fontSize:15,textAlign:'center'}}>{item.habit.name}</Text>
          <Text style={{color:c.text,fontSize:22,fontWeight:'700',fontVariant:['tabular-nums']}}>{item.active}/{elapsedDays}</Text>
        </TouchableOpacity>})}
      </View>
      {!ranked.length&&<Text style={[s.empty,{color:c.muted}]}>{t('empty')}</Text>}
    </View>
    <OverviewComparison period={period} anchor={anchor} onMove={move} roots={[...ranked].filter(item=>item.habit.parentId===null).sort((a,b)=>a.habit.sortOrder-b.habit.sortOrder).map(item=>({habit:item.habit,color:color(ranked.indexOf(item))}))} habits={habits} entries={entries} today={today} c={c}/>
    <OverviewComparison history period={period} anchor={anchor} onMove={move} roots={[...ranked].filter(item=>item.habit.parentId===null).sort((a,b)=>a.habit.sortOrder-b.habit.sortOrder).map(item=>({habit:item.habit,color:color(ranked.indexOf(item))}))} habits={habits} entries={entries} today={today} c={c}/>
  </ScrollView>;
}

const s=StyleSheet.create({page:{flex:1},content:{padding:20,paddingTop:12,paddingBottom:40},title:{...mainTitle},intro:{fontSize:15,lineHeight:21,marginTop:5,maxWidth:340,marginBottom:16},periodControls:{flexDirection:'row',borderRadius:18,padding:3,marginBottom:20},periodButton:{flex:1,minHeight:44,borderRadius:15,alignItems:'center',justifyContent:'center'},periodText:{fontSize:13,fontWeight:'700'},list:{borderRadius:24,paddingHorizontal:15},row:{minHeight:92,flexDirection:'row',alignItems:'center',gap:10,paddingVertical:14},rank:{width:16,fontSize:12,fontWeight:'600',textAlign:'center'},emojiBubble:{width:42,height:42,borderRadius:15,alignItems:'center',justifyContent:'center'},emoji:{fontSize:22},copy:{flex:1},rowTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},habit:{fontSize:16,fontWeight:'600',flex:1},score:{fontSize:13,fontWeight:'700',fontVariant:['tabular-nums']},track:{height:5,borderRadius:3,overflow:'hidden',marginTop:8},fill:{height:'100%',borderRadius:3},meta:{fontSize:12,fontWeight:'600',marginTop:6},empty:{textAlign:'center',padding:30}})
