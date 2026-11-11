import { aggregate } from '@/domain/aggregation';
import { bestActivityStreaks } from '@/domain/analytics';
import { buildFrequency,buildFrequencyBuckets } from '@/domain/frequency';
import { descendants } from '@/domain/tree';
import { Entry,Habit } from '@/domain/types';
import { PopoverAnchor } from '@/features/AnchoredPopover';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { useEffect,useMemo,useRef } from 'react';
import { ScrollView,View } from 'react-native';
import { Header } from './DetailControls';
import { dateLabel } from './calendarLabels';
import { s,type Palette } from './detailStyles';
const activeDates=(habit:Habit,habits:Habit[],entries:Entry[],dates:string[])=>new Set(dates.filter(date=>aggregate(habits,entries,habit.id,new Set([date]))>0));
export function Streaks({habit,habits,entries,today,color,onFilter,c}:{habit:Habit;habits:Habit[];entries:Entry[];today:string;color:string;onFilter:(anchor?:PopoverAnchor)=>void;c:Palette}){const dates=[...new Set(entries.filter(entry=>entry.localDate<=today).map(entry=>entry.localDate))],streaks=bestActivityStreaks(activeDates(habit,habits,entries,dates)),max=Math.max(...streaks.map(item=>item.length),1);return <View style={[s.card,{backgroundColor:c.card}]}><Header chart="bestStreaks" habit={habit} onFilter={onFilter} c={c}/><View style={[s.chartBody,{gap:8}]}>{streaks.length?streaks.map((item,index)=><View key={`${item.start}-${item.end}`} style={{gap:4}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={[s.streakDate,{color:c.muted}]}>{dateLabel(item.start)}</Text><Text style={{color:c.muted,fontSize:11}}>{dateLabel(item.end)}</Text></View><View style={s.streakTrack}><View style={[s.streakBar,{width:`${Math.max(28,item.length/max*100)}%`,backgroundColor:color,opacity:index?Math.max(.3,.72-index*.09):1}]}><Text style={s.streakCount}>{item.length}</Text></View></View></View>):<Text style={[s.empty,{color:c.muted}]}>{t('noStreaks')}</Text>}</View></View>}
export function Frequency({habit,habits,entries,today,color,onFilter,c}:{habit:Habit;habits:Habit[];entries:Entry[];today:string;color:string;onFilter:(anchor?:PopoverAnchor)=>void;c:Palette}){
  const scroll=useRef<ScrollView>(null);
  const showLatest=()=>scroll.current?.scrollToEnd({animated:false});
  useEffect(()=>{scroll.current?.scrollToEnd({animated:false})},[habit.id]);
  const buckets=useMemo(()=>{
    const ids=new Set([habit.id,...descendants(habits,habit.id).map(item=>item.id)]);
    const records=entries.filter(entry=>ids.has(entry.habitId)&&entry.localDate<=today);
    return buildFrequencyBuckets(records,today);
  },[habit,habits,entries,today]);
  const weekdays=Array.from({length:7},(_,i)=>new Intl.DateTimeFormat(undefined,{weekday:'short'}).format(new Date(2024,0,1+i)));
  const {rows}=buildFrequency(habit,habits,entries,buckets);
  return <View style={[s.card,{backgroundColor:c.card}]}><Header chart="frequency" habit={habit} onFilter={onFilter} c={c}/><View style={{flexDirection:'row',marginTop:16}}><ScrollView ref={scroll} horizontal bounces={false} overScrollMode="never" showsHorizontalScrollIndicator={false} style={{flex:1}} contentContainerStyle={{flexGrow:1,justifyContent:'flex-end'}} onLayout={showLatest} onContentSizeChange={showLatest}><View>
    {weekdays.map((day,index)=><View key={day} style={{flexDirection:'row',alignItems:'center',minHeight:33}}>{buckets.map((bucket,column)=>{
      const {count,possible,intensity,size}=rows[index][column];
      return <View key={bucket.key} accessible accessibilityLabel={bucket.label+', '+day+': '+count+' / '+possible+' '+t('activeDays')} style={{width:40,height:33,alignItems:'center',justifyContent:'center'}}><View style={{width:size,height:size,borderRadius:size/2,backgroundColor:color,opacity:.15+intensity*.85}}/></View>;
    })}</View>)}
    <View style={{flexDirection:'row'}}>{buckets.map(bucket=><Text key={bucket.key} style={{width:40,textAlign:'center',color:c.muted,fontSize:10,marginTop:8}}>{bucket.label}</Text>)}</View>
  </View></ScrollView><View style={{width:48,paddingLeft:8}}>{weekdays.map(day=><Text key={day} style={{height:33,lineHeight:33,color:c.muted,fontSize:11}}>{day}</Text>)}</View></View></View>;
}
