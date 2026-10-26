import { Text } from '@/theme/Typography';
import { openPopover,PopoverAnchor } from '../AnchoredPopover';
import { OverviewLegend } from './OverviewLegend';
import { HistoryChart } from './HistoryChart';
import { buildRootActivitySeries,OverviewPeriod } from '@/domain/insightsOverview';
import React,{useMemo,useState} from 'react';
import { ScrollView,StyleSheet,TouchableOpacity,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StrengthChart } from './StrengthChart';
import { SelectionPopover } from '../SelectionPopover';
import { buildStrengthWindow,strengthWindowLabel } from '@/domain/strengthWindow';
import { Entry,Habit } from '@/domain/types';
import { light } from '@/theme';
import { t } from '@/i18n';

export function OverviewComparison({roots,habits,entries,today,c,period,anchor,onMove,history=false}:{period:OverviewPeriod;anchor:string;onMove:(amount:number)=>void;history?:boolean;roots:{habit:Habit;color:string}[];habits:Habit[];entries:Entry[];today:string;c:typeof light}){
  const [popoverAnchor,setPopoverAnchor]=useState<PopoverAnchor|null>(null);
  const [highlight,setHighlight]=useState<string|null>(null);
  const [ids,setIds]=useState<Set<string>|null>(null),[filter,setFilter]=useState(false);
  const chartAnchor=period==='year'&&anchor.slice(0,4)!==today.slice(0,4)?anchor.slice(0,4)+'-12-31':anchor;
  const scale=period==='year'?'quarter':period,window=useMemo(()=>buildStrengthWindow(scale,chartAnchor,today),[scale,chartAnchor,today]);
  const current=window.start===useMemo(()=>buildStrengthWindow(scale,today,today).start,[scale,today]);
  const selected=useMemo(()=>{const matching=roots.filter(item=>ids===null||ids.has(item.habit.id));return matching.length?matching:roots},[roots,ids]);
  const highlightedId=selected.some(item=>item.habit.id===highlight)?highlight:null;
  const title=t(history?'history':'score');
  const historySeries=useMemo(()=>history?buildRootActivitySeries(selected.map(item=>item.habit),habits,entries,window.buckets).map(item=>({...item,color:selected.find(value=>value.habit.id===item.habit.id)!.color})):[],[history,selected,habits,entries,window.buckets]);
  const toggle=(id:string)=>setIds(()=>{const next=new Set(selected.map(item=>item.habit.id));if(next.has(id)){if(next.size>1)next.delete(id)}else next.add(id);return next});
  return <View style={[s.card,{backgroundColor:c.card}]}>
    <View style={s.header}><Text accessibilityRole="header" style={[s.title,{color:c.text}]}>{title}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={history?t('selectMultiple')+' '+title:t('selectMultiple')} accessibilityState={{expanded:filter,disabled:!roots.length}} disabled={!roots.length} onPress={event=>openPopover(event,anchor=>{setPopoverAnchor(anchor);setFilter(true)})} style={[s.filter,{backgroundColor:c.soft}]}><Text style={{color:c.accent,fontSize:12,fontWeight:'700'}}>{selected.length} {t('selected')}</Text></TouchableOpacity>
    </View>
    {roots.length?<>
      {history?<HistoryChart series={historySeries} buckets={window.buckets} bucketSize={period==='year'?'month':'day'} type="boolean" c={c} showLegend={false} highlightedId={highlightedId} onHighlight={setHighlight}/>:<StrengthChart habit={selected[0].habit} selected={selected} habits={habits} entries={entries} today={today} buckets={window.buckets} bucketSize={period==='year'?'month':'day'} c={c} showSummary={false} showPoints={false} highlightedId={highlightedId} onHighlight={setHighlight}/>}
      <OverviewLegend items={selected} highlightedId={highlightedId} onHighlight={setHighlight} c={c}/>
    </>:<Text style={{color:c.muted,textAlign:'center',paddingVertical:24}}>{t('empty')}</Text>}
    <View style={s.navigation}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('previousPeriod')+' '+title} onPress={()=>onMove(-1)} style={s.arrow}><Ionicons name="chevron-back" size={18} color={c.text}/></TouchableOpacity>
      <Text accessibilityLiveRegion="polite" style={{flex:1,color:c.muted,textAlign:'center',fontSize:11}}>{strengthWindowLabel(scale,chartAnchor,window.start,false)}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('nextPeriod')+' '+title} disabled={current} accessibilityState={{disabled:current}} onPress={()=>onMove(1)} style={[s.arrow,{opacity:current?.3:1}]}><Ionicons name="chevron-forward" size={18} color={c.text}/></TouchableOpacity>
    </View>
    <SelectionPopover visible={filter} onClose={()=>setFilter(false)} anchor={popoverAnchor} c={c} title={t('selectMultiple')} hint={t('multipleHint')} action={<TouchableOpacity accessibilityRole="button" onPress={()=>setIds(null)} style={s.arrow}><Text style={{color:c.accent}}>{t('allCategories')}</Text></TouchableOpacity>}>
        <ScrollView>{roots.map(item=><TouchableOpacity key={item.habit.id} accessibilityRole="checkbox" accessibilityLabel={item.habit.name} accessibilityState={{checked:selected.some(value=>value.habit.id===item.habit.id)}} onPress={()=>toggle(item.habit.id)} style={s.choice}><Text style={{flex:1,color:c.text,fontSize:16}}>{item.habit.emoji} {item.habit.name}</Text><Ionicons name={selected.some(value=>value.habit.id===item.habit.id)?'checkbox':'square-outline'} size={23} color={c.accent}/></TouchableOpacity>)}</ScrollView>
    </SelectionPopover>
  </View>;
}
const s=StyleSheet.create({card:{marginTop:20,borderRadius:24,padding:16},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},title:{fontSize:20,fontWeight:'700',flexShrink:1},filter:{minHeight:36,borderRadius:15,paddingHorizontal:11,justifyContent:'center'},dot:{width:9,height:9,borderRadius:5},navigation:{flexDirection:'row',alignItems:'center'},arrow:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},choice:{minHeight:54,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#8885'}});
