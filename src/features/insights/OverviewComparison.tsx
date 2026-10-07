import { OverviewLegend } from './OverviewLegend';
import { HistoryChart } from './HistoryChart';
import { buildRootActivitySeries,OverviewPeriod } from '@/domain/insightsOverview';
import React,{useMemo,useState} from 'react';
import { Modal,Pressable,ScrollView,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StrengthChart } from './StrengthChart';
import { SheetHandle } from '../SheetHandle';
import { buildStrengthWindow,strengthWindowLabel } from '@/domain/strengthWindow';
import { Entry,Habit } from '@/domain/types';
import { light } from '@/theme';
import { t } from '@/i18n';

export function OverviewComparison({roots,habits,entries,today,c,period,anchor,onMove,history=false}:{period:OverviewPeriod;anchor:string;onMove:(amount:number)=>void;history?:boolean;roots:{habit:Habit;color:string}[];habits:Habit[];entries:Entry[];today:string;c:typeof light}){
  const [highlight,setHighlight]=useState<string|null>(null);
  const [ids,setIds]=useState<Set<string>|null>(null),[filter,setFilter]=useState(false);
  const chartAnchor=period==='year'&&anchor.slice(0,4)!==today.slice(0,4)?anchor.slice(0,4)+'-12-31':anchor;
  const insets=useSafeAreaInsets(),scale=period==='year'?'quarter':period,window=useMemo(()=>buildStrengthWindow(scale,chartAnchor,today),[scale,chartAnchor,today]);
  const current=window.start===useMemo(()=>buildStrengthWindow(scale,today,today).start,[scale,today]);
  const selected=useMemo(()=>{const matching=roots.filter(item=>ids===null||ids.has(item.habit.id));return matching.length?matching:roots},[roots,ids]);
  const highlightedId=selected.some(item=>item.habit.id===highlight)?highlight:null;
  const title=t(history?'history':'score');
  const historySeries=useMemo(()=>history?buildRootActivitySeries(selected.map(item=>item.habit),habits,entries,window.buckets).map(item=>({...item,color:selected.find(value=>value.habit.id===item.habit.id)!.color})):[],[history,selected,habits,entries,window.buckets]);
  const toggle=(id:string)=>setIds(()=>{const next=new Set(selected.map(item=>item.habit.id));if(next.has(id)){if(next.size>1)next.delete(id)}else next.add(id);return next});
  return <View style={[s.card,{backgroundColor:c.card}]}>
    <View style={s.header}><Text accessibilityRole="header" style={[s.title,{color:c.text}]}>{title}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={history?t('selectMultiple')+' '+title:t('selectMultiple')} onPress={()=>setFilter(true)} style={[s.filter,{backgroundColor:c.soft}]}><Text style={{color:c.text}}>{selected.length} {t('selected')}</Text><Ionicons name="options-outline" size={18} color={c.text}/></TouchableOpacity>
    </View>
    {roots.length?<><OverviewLegend items={selected} highlightedId={highlightedId} onHighlight={setHighlight} c={c}/>
      {history?<HistoryChart series={historySeries} buckets={window.buckets} period={scale} type="boolean" c={c} showLegend={false} highlightedId={highlightedId}/>:<StrengthChart habit={selected[0].habit} selected={selected} habits={habits} entries={entries} today={today} buckets={window.buckets} period={scale} c={c} showSummary={false} showPoints={false} highlightedId={highlightedId}/>}
    </>:<Text style={{color:c.muted,textAlign:'center',paddingVertical:24}}>{t('empty')}</Text>}
    <View style={s.navigation}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('previousPeriod')+' '+title} onPress={()=>onMove(-1)} style={s.arrow}><Ionicons name="chevron-back" size={18} color={c.text}/></TouchableOpacity>
      <Text accessibilityLiveRegion="polite" style={{flex:1,color:c.muted,textAlign:'center',fontSize:11}}>{strengthWindowLabel(scale,chartAnchor,window.start,false)}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('nextPeriod')+' '+title} disabled={current} accessibilityState={{disabled:current}} onPress={()=>onMove(1)} style={[s.arrow,{opacity:current?.3:1}]}><Ionicons name="chevron-forward" size={18} color={c.text}/></TouchableOpacity>
    </View>
    <Modal transparent visible={filter} animationType="slide" onRequestClose={()=>setFilter(false)}>
      <Pressable style={s.overlay} onPress={()=>setFilter(false)}><Pressable accessibilityViewIsModal onAccessibilityEscape={()=>setFilter(false)} onPress={()=>undefined} style={[s.sheet,{backgroundColor:c.card,paddingBottom:24+insets.bottom}]}>
        <SheetHandle onClose={()=>setFilter(false)}/>
        <View style={s.header}><Text accessibilityRole="header" style={[s.title,{color:c.text}]}>{t('selectMultiple')}</Text><TouchableOpacity accessibilityRole="button" onPress={()=>setIds(null)} style={s.arrow}><Text style={{color:c.accent}}>{t('allCategories')}</Text></TouchableOpacity></View>
        <Text style={{color:c.muted,marginBottom:12}}>{t('multipleHint')}</Text>
        <ScrollView>{roots.map(item=><TouchableOpacity key={item.habit.id} accessibilityRole="checkbox" accessibilityLabel={item.habit.name} accessibilityState={{checked:selected.some(value=>value.habit.id===item.habit.id)}} onPress={()=>toggle(item.habit.id)} style={s.choice}><View style={[s.dot,{backgroundColor:item.color}]}/><Text style={{flex:1,color:c.text,fontSize:16}}>{item.habit.emoji} {item.habit.name}</Text><Ionicons name={selected.some(value=>value.habit.id===item.habit.id)?'checkbox':'square-outline'} size={24} color={c.accent}/></TouchableOpacity>)}</ScrollView>
      </Pressable></Pressable>
    </Modal>
  </View>;
}
const s=StyleSheet.create({card:{marginTop:20,borderRadius:24,padding:16},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},title:{fontSize:20,fontWeight:'700',flexShrink:1},filter:{minHeight:44,borderRadius:14,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8},dot:{width:9,height:9,borderRadius:5},navigation:{flexDirection:'row',alignItems:'center'},arrow:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},overlay:{flex:1,backgroundColor:'#0008',justifyContent:'flex-end'},sheet:{maxHeight:'80%',borderTopLeftRadius:24,borderTopRightRadius:24,paddingHorizontal:20},choice:{minHeight:56,flexDirection:'row',alignItems:'center',gap:10}});
