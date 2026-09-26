import { BranchDayDialog } from '@/features/home/BranchDayDialog';
import { branchRecords } from '@/domain/branchDay';
import { CalendarEntryModal } from '@/features/insights/CalendarEntryModal';
import { calendarDraft,calendarEntry,calendarInputValue,CalendarDraft } from '@/features/insights/calendarEntry';
import { homeDateWindow } from '@/features/home/dateWindow';
import { depthBackground,mainTitle } from '@/theme';
import React,{useMemo,useRef,useState} from 'react'; import { ActivityIndicator,Alert,Animated,FlatList,Pressable,type ScrollView,StyleSheet,Text,TouchableOpacity,View } from 'react-native'; import * as Haptics from 'expo-haptics'; import { router } from 'expo-router'; import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/features/AppProvider'; import { buildTree } from '@/domain/tree'; import { aggregate,formatValue } from '@/domain/aggregation'; import { HabitNode } from '@/domain/types'; import { addDays,shortDay } from '@/utils/dates'; import { todayLocal } from '@/domain/entries'; import { t } from '@/i18n'; import { usePrefetchRoutes,useResponsiveNavigation } from '@/features/useResponsiveNavigation';
const HABIT_COLUMN_WIDTH=157;

export default function Home(){const {ready,error,habits,entries,changeEntry,palette:c}=useApp(),today=todayLocal(),[firstDay,setFirstDay]=useState(0),[historyDays,setHistoryDays]=useState(60),[width,setWidth]=useState(0),[expanded,setExpanded]=useState(new Set<string>()),[dialog,setDialog]=useState<CalendarDraft & {habit:HabitNode}|null>(null),[branchDialog,setBranchDialog]=useState<{habit:HabitNode;date:string}|null>(null),tree=useMemo(()=>buildTree(habits),[habits]),navigation=useResponsiveNavigation();
  const visibleHabits=useMemo(()=>{const result:{habit:HabitNode;depth:number;groupEnd:boolean}[]=[];const visit=(habit:HabitNode,depth:number)=>{result.push({habit,depth,groupEnd:false});if(expanded.has(habit.id))habit.children.forEach(child=>visit(child,depth+1))};for(const root of tree){visit(root,0);result[result.length-1].groupEnd=true}return result},[tree,expanded]);
  usePrefetchRoutes(visibleHabits.map(({habit})=>`/insight/${habit.id}`));
  const dayWidth=Math.max(1,(width-HABIT_COLUMN_WIDTH)/5),anchor=addDays(today,-firstDay),dateScroll=useRef<ScrollView>(null),visibleFirstDay=useRef(0),[dateScrollX]=useState(()=>new Animated.Value(0)),dateTrackX=useMemo(()=>Animated.multiply(dateScrollX,-1),[dateScrollX]);
  const window=homeDateWindow(firstDay,historyDays),days=useMemo(()=>Array.from({length:window.end-window.start},(_,i)=>addDays(today,-window.start-i)),[today,window.start,window.end]);
  const onDateScroll=useMemo(()=>Animated.event([{nativeEvent:{contentOffset:{x:dateScrollX}}}],{useNativeDriver:true,listener:(event:{nativeEvent:{contentOffset:{x:number}}})=>{visibleFirstDay.current=Math.max(0,Math.floor(event.nativeEvent.contentOffset.x/dayWidth))}}),[dateScrollX,dayWidth]);
  const finishDateScroll=()=>{const index=visibleFirstDay.current;setFirstDay(index);setHistoryDays(count=>index+15>=count?count+30:count)};
  const moveDates=(amount:number)=>dateScroll.current?.scrollTo({x:Math.max(0,firstDay-amount)*dayWidth,animated:true});
  const toggle=async(h:HabitNode,date:string)=>{if(date>today||savingRef.current)return;if(branchRecords(habits,entries,h,date).some(record=>!record.direct&&(h.type!=='boolean'||record.entry.value>0))){setBranchDialog({habit:h,date});return}const current=aggregate(habits,entries,h.id,new Set([date]));if(h.type==='boolean'){savingRef.current=true;try{await changeEntry(h.id,date,current?null:1);void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>undefined)}catch(error){Alert.alert(t('couldNotSave'),error instanceof Error?error.message:String(error))}finally{savingRef.current=false}}else{setDialog({...calendarDraft(h,date,calendarEntry(h,habits,entries,date)?.value??null),habit:h})}};
  const savingRef=useRef(false),[saving,setSaving]=useState(false);
  const persist=async(value:number|null)=>{if(!dialog||savingRef.current)return;savingRef.current=true;setSaving(true);try{await changeEntry(dialog.habit.id,dialog.date,value);setDialog(null)}catch(error){Alert.alert(t('couldNotSave'),error instanceof Error?error.message:String(error))}finally{savingRef.current=false;setSaving(false)}};
  const save=async()=>{if(!dialog)return;const value=calendarInputValue(dialog.habit,dialog);if(value===null)return Alert.alert(t('invalidNumber'));await persist(value)};
  const dayValues=useMemo(()=>{
    const dates=new Set(days),visibleEntries=entries.filter(entry=>dates.has(entry.localDate));
    const values=new Map<string,Map<string,string>>();
    const visit=(habit:HabitNode)=>{
      values.set(habit.id,new Map(days.map(date=>[date,formatValue(habit.type,aggregate(habits,visibleEntries,habit.id,new Set([date])))])));
      if(expanded.has(habit.id))habit.children.forEach(visit);
    };
    tree.forEach(visit);
    return values;
  },[days,entries,habits,tree,expanded]);
  const row=(h:HabitNode,depth=0):React.ReactNode=>{
    const backgroundColor=depthBackground(c.card,c.soft,depth);
    return <React.Fragment key={h.id}>
    <View style={[s.row,{backgroundColor,marginBottom:0}]}>
      <View style={[s.frozenLabel,{backgroundColor}]}>
        <TouchableOpacity disabled={navigation.pending!==null} accessibilityRole="button" accessibilityLabel={`${t('openInsights')} ${h.name}`} accessibilityState={{busy:navigation.pending===`/insight/${h.id}`,disabled:navigation.pending!==null}} onPress={()=>navigation.push(`/insight/${h.id}`)} style={[s.label,{paddingLeft:20+Math.min(depth,4)*6}]}><Text style={s.emoji}>{h.emoji}</Text><Text numberOfLines={1} style={[s.name,{color:c.text,fontSize:13-Math.min(depth,4)}]}>{h.name}</Text></TouchableOpacity>
        {h.children.length?<TouchableOpacity accessibilityLabel={`${h.name}, ${expanded.has(h.id)?t('collapse'):t('expand')}`} onPress={()=>setExpanded(x=>{const n=new Set(x);if(n.has(h.id))n.delete(h.id);else n.add(h.id);return n})} style={s.expand}><Ionicons name={expanded.has(h.id)?'chevron-up':'chevron-down'} size={17} color={c.muted}/></TouchableOpacity>:null}
      </View>
      <View style={[s.dateViewport,{width:dayWidth*5}]}><Animated.View style={[s.dateTrack,{width:historyDays*dayWidth,transform:[{translateX:dateTrackX}]}]}>
        <View style={{width:window.start*dayWidth}}/>
        {days.map(date=><Pressable key={date} accessibilityRole="button" accessibilityLabel={`${h.name}, ${date}, ${dayValues.get(h.id)?.get(date)}`} accessibilityHint={t('branchCellHint')} accessibilityActions={[{name:'longpress',label:t('branchManage')}]} onAccessibilityAction={()=>setBranchDialog({habit:h,date})} onLongPress={()=>setBranchDialog({habit:h,date})} onPress={()=>toggle(h,date)} style={[s.cell,{width:dayWidth}]}><Text style={[s.cellText,{color:date===today?c.accent:c.text}]}>{dayValues.get(h.id)?.get(date)}</Text></Pressable>)}
        <View style={{width:(historyDays-window.end)*dayWidth}}/>
      </Animated.View></View>
    </View>
  </React.Fragment>;
  };
  if(!ready)return <View style={[s.center,{backgroundColor:c.bg}]}><ActivityIndicator color={c.accent}/></View>; if(error)return <View style={s.center}><Text>{error}</Text></View>;
  return <View onLayout={event=>setWidth(event.nativeEvent.layout.width)} style={[s.page,{backgroundColor:c.bg}]}>
  <View style={s.header}>
    <Text accessibilityRole="header" style={[s.brand,{color:c.text,flex:1}]}>Oi Siu</Text>{firstDay>0&&<TouchableOpacity accessibilityRole="button" onPress={()=>dateScroll.current?.scrollTo({x:0,animated:true})} style={{minHeight:44,justifyContent:"center",paddingHorizontal:12}}><Text style={{color:c.accent,fontSize:13}}>{t("today")}</Text></TouchableOpacity>}
          <Pressable accessibilityRole="button" accessibilityLabel={t('add')} onPress={()=>router.push('/habit/new')} style={({pressed})=>[s.add,{backgroundColor:pressed?c.soft:'transparent'}]}>
            {({pressed})=><Ionicons name="add" size={20} color={pressed?c.text:c.muted}/>}
          </Pressable>
  </View>
  {width>HABIT_COLUMN_WIDTH&&<View style={s.timeline}>
      <View style={s.week}>
        <View style={[s.dateLabelSpacer,{backgroundColor:c.bg}]}>
          <Text style={{color:c.muted,textTransform:'capitalize'}}>{new Intl.DateTimeFormat(undefined,{month:'long',...(anchor.slice(0,4)!==today.slice(0,4)?{year:'numeric' as const}:{})}).format(new Date(`${anchor}T12:00:00`))}</Text>
        </View>
        <Animated.ScrollView ref={dateScroll} horizontal nestedScrollEnabled directionalLockEnabled bounces={false} overScrollMode="never" removeClippedSubviews={false} showsHorizontalScrollIndicator={false} scrollEventThrottle={16} onScroll={onDateScroll} onScrollEndDrag={finishDateScroll} onMomentumScrollEnd={finishDateScroll} style={[s.dateHeader,{width:dayWidth*5}]} contentContainerStyle={{width:historyDays*dayWidth}} accessible accessibilityRole="adjustable" accessibilityHint={t('swipeHomeDates')} accessibilityActions={[{name:'increment',label:t('nextPeriod')},{name:'decrement',label:t('previousPeriod')}]} onAccessibilityAction={event=>moveDates(event.nativeEvent.actionName==='increment'?5:-5)}>
          <View style={{width:window.start*dayWidth}}/>
          {days.map(d=><View key={d} style={[s.day,{width:dayWidth}]}><Text style={{color:c.muted}}>{shortDay(d)}</Text><Text style={[s.dayNum,{color:d===today?c.accent:c.text}]}>{Number(d.slice(-2))}</Text></View>)}
          <View style={{width:(historyDays-window.end)*dayWidth}}/>
        </Animated.ScrollView>
      </View>
      <FlatList nestedScrollEnabled directionalLockEnabled style={s.habitList} contentContainerStyle={{paddingBottom:30}} data={visibleHabits} keyExtractor={({habit})=>habit.id} initialNumToRender={12} maxToRenderPerBatch={10} windowSize={7} renderItem={({item})=><View style={[s.habitGroup,{backgroundColor:c.card,marginBottom:item.groupEnd?6:0}]}>{row(item.habit,item.depth)}</View>} ListEmptyComponent={<Text style={[s.empty,{color:c.muted}]}>{t('homeEmpty')}</Text>}/>
  </View>}

  {branchDialog&&<BranchDayDialog habit={branchDialog.habit} date={branchDialog.date} onClose={()=>setBranchDialog(null)}/>}
  {dialog&&<CalendarEntryModal editor={dialog} habit={dialog.habit} hasRecord={!!calendarEntry(dialog.habit,habits,entries,dialog.date)} saving={saving} setEditor={update=>{if(!savingRef.current)setDialog(current=>{const next=typeof update==='function'?update(current):update;return current&&next?{...next,habit:current.habit}:null})}} onSave={save} onClear={()=>persist(null)} c={c}/>}</View>}
const s=StyleSheet.create({page:{flex:1,paddingTop:12},center:{flex:1,alignItems:'center',justifyContent:'center'},brand:mainTitle,header:{minHeight:48,paddingLeft:20,paddingRight:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},add:{width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center'},week:{width:'100%',flexDirection:'row',minHeight:64,paddingVertical:14},dateHeader:{flexGrow:0,flexShrink:0},timeline:{flex:1},habitList:{flex:1},habitGroup:{marginBottom:6},frozenLabel:{width:HABIT_COLUMN_WIDTH,flexDirection:'row',zIndex:2},dateLabelSpacer:{width:HABIT_COLUMN_WIDTH,paddingHorizontal:20,justifyContent:'center'},dateViewport:{height:52,flexGrow:0,flexShrink:0,overflow:'hidden'},dateTrack:{height:52,flexDirection:'row',alignItems:'center'},day:{alignItems:'center',justifyContent:'center',gap:4},dayNum:{fontWeight:'700'},row:{width:'100%',height:52,marginBottom:6,flexDirection:'row',alignItems:'center'},label:{flex:1,minWidth:0,minHeight:48,flexDirection:'row',alignItems:'center',gap:4,paddingRight:4},expand:{width:28,minHeight:48,alignItems:'center',justifyContent:'center'},emoji:{fontSize:18},name:{fontSize:13,fontWeight:'600',flex:1,minWidth:0},cell:{minHeight:48,alignItems:'center',justifyContent:'center'},cellText:{fontSize:12,fontWeight:'600'},empty:{alignSelf:'stretch',textAlign:'center',paddingVertical:24}})
