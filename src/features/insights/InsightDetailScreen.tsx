import { PopoverAnchor } from '@/features/AnchoredPopover';
import { SelectionPopover } from '@/features/SelectionPopover';
import { buildTimelineBuckets } from '@/domain/chartTimeline';
import { EntryRefreshError,entryErrorTitle } from '@/features/entryWriteError';
import { buildFrequency,buildFrequencyBuckets } from '@/domain/frequency';
import { calendarActivity } from '@/domain/calendarActivity';
import { CalendarDayBackground } from '@/features/CalendarDayBackground';
import { descendants } from '@/domain/tree';
import { visibleHabitSnapshot } from '@/domain/habitVisibility';
import { booleanAnalysis } from '@/domain/booleanAnalysis';
import { HistoryChart } from './HistoryChart';
import { habitAccent,habitAccentPalette } from '@/theme/habitColors';
import { StrengthChart } from './StrengthChart';
import { buildCalendarTimeline,initialCalendarWeek } from './calendarTimeline';
import { useChartEntrance } from './useChartEntrance';
import { calendarScrollOffset } from './calendarScroll';
import { CalendarEntryModal } from './CalendarEntryModal';
import { buildHistorySeries } from '@/domain/history';
import { CalendarDraft,calendarDraft,calendarEntry,calendarInputValue,toggledCalendarValue } from './calendarEntry';
import { Ionicons } from '@expo/vector-icons';
import { router,useLocalSearchParams } from 'expo-router';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import { AccessibilityInfo,ActivityIndicator,Alert,Animated,FlatList,Modal,Pressable,ScrollView,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import { aggregate } from '@/domain/aggregation';
import { bestActivityStreaks,BucketSize } from '@/domain/analytics';
import { todayLocal } from '@/domain/entries';
import { orderedCandidates } from './orderedCandidates';
import { Entry,Habit } from '@/domain/types';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';
import { dark,depthBackground,light } from '@/theme';
import { addMonths } from '@/utils/dates';
import { usePrefetchRoutes,useResponsiveNavigation } from '@/features/useResponsiveNavigation';

type Palette=typeof light|typeof dark;
type FilterTarget='score'|'history'|'calendar'|'streaks'|'frequency';
type Series={habit:Habit;color:string;values:number[]};
type CalendarEditor=CalendarDraft;
const activeDates=(habit:Habit,habits:Habit[],entries:Entry[],dates:string[])=>new Set(dates.filter(date=>aggregate(habits,entries,habit.id,new Set([date]))>0));
const dateLabel=(date:string)=>new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${date}T12:00:00`));
const calendarMonthLabel=(date:string,today:string)=>{
  const month=new Intl.DateTimeFormat(undefined,{month:'short'}).format(new Date(`${date}T12:00:00`)).replace(/[.\s]/g,'').slice(0,3);
  const name=month.charAt(0).toLocaleUpperCase()+month.slice(1).toLocaleLowerCase();
  return date.slice(0,4)===today.slice(0,4)?name:`${name} ${date.slice(2,4)}`;
};

export default function InsightDetailScreen(){
  const [filterAnchor,setFilterAnchor]=useState<PopoverAnchor|null>(null);
  const {id}=useLocalSearchParams<{id:string}>(),{habits:allHabits,entries:allEntries,palette:c}=useApp(),{habits:storedHabits,entries:storedEntries}=useMemo(()=>visibleHabitSnapshot(allHabits,allEntries),[allHabits,allEntries]),storedRoot=storedHabits.find(h=>h.id===id),today=todayLocal();
  const [analysisMode,setAnalysisMode]=useState<{id:string;boolean:boolean}>({id,boolean:false}),booleanView=analysisMode.id===id&&analysisMode.boolean&&storedRoot?.type!=='boolean';
  useEffect(()=>setAnalysisMode({id,boolean:false}),[id]);
  const {habits,entries}=useMemo(()=>booleanView?booleanAnalysis(storedHabits,storedEntries):{habits:storedHabits,entries:storedEntries},[booleanView,storedHabits,storedEntries]),root=habits.find(h=>h.id===id);
  const contentReady=useChartEntrance(id);
  usePrefetchRoutes(contentReady?[`/habit/${id}`]:[]);
  const candidates=useMemo(()=>root&&contentReady?orderedCandidates(habits,root):[],[habits,root,contentReady]);
  const scoreInitial=useMemo(()=>new Set([id]),[id]),historyInitial=useMemo(()=>new Set([id]),[id]);
  const [historyScale,setHistoryScale]=useState<BucketSize>('day'),[historyCount,setHistoryCount]=useState(60);
  const historyBuckets=useMemo(()=>buildTimelineBuckets(historyScale,today,historyCount),[historyScale,today,historyCount]);
  useEffect(()=>{setHistoryScale('day');setHistoryCount(60)},[id]);
  const [scoreScale,setScoreScale]=useState<BucketSize>('day'),[scoreCount,setScoreCount]=useState(60);
  const scoreBuckets=useMemo(()=>buildTimelineBuckets(scoreScale,today,scoreCount),[scoreScale,today,scoreCount]);
  useEffect(()=>{setScoreScale('day');setScoreCount(60)},[id]);
  const [scoreIds,setScoreIds]=useState(scoreInitial),[historyIds,setHistoryIds]=useState(historyInitial),[calendarIds,setCalendarIds]=useState(()=>new Set([id])),[calendarZoom,setCalendarZoom]=useState<string|null>(null),[streakId,setStreakId]=useState(id),[frequencyId,setFrequencyId]=useState(id),[filter,setFilter]=useState<FilterTarget|null>(null);
  const [calendarReady,setCalendarReady]=useState(false),[historyReady,setHistoryReady]=useState(false),[tailReady,setTailReady]=useState(false),navigation=useResponsiveNavigation();
  useEffect(()=>{setCalendarReady(false);setHistoryReady(false);setTailReady(false)},[id]);
  useEffect(()=>{if(!contentReady)return;const task=requestIdleCallback(()=>setCalendarReady(true),{timeout:1000});return()=>cancelIdleCallback(task)},[contentReady]);
  useEffect(()=>{setScoreIds(new Set([id]));setHistoryIds(new Set([id]));setCalendarIds(new Set([id]));setStreakId(id);setFrequencyId(id)},[id,today]);
  useEffect(()=>{
    if(!contentReady||!root)return;
    const ids=new Set(candidates.map(habit=>habit.id));
    const retain=(current:Set<string>)=>{const next=[...current].filter(value=>ids.has(value));if(!next.length)next.push(root.id);return next.length===current.size&&next.every(value=>current.has(value))?current:new Set(next)};
    setScoreIds(retain);setHistoryIds(retain);setCalendarIds(retain);
    setStreakId(value=>ids.has(value)?value:root.id);setFrequencyId(value=>ids.has(value)?value:root.id);
  },[contentReady,root,candidates]);
  const viewport=useRef({offset:0,height:0});
  const revealSections=()=>{if(!contentReady)return;const bottom=viewport.current.offset+viewport.current.height;if(bottom>220)setHistoryReady(true);if(bottom>700)setTailReady(true)};
  useEffect(()=>{if(contentReady){const bottom=viewport.current.offset+viewport.current.height;if(bottom>220)setHistoryReady(true);if(bottom>700)setTailReady(true)}},[contentReady,id]);

  const historyData=useMemo(()=>{
    if(!root||!historyReady)return [];
    const selected=[...(historyIds.size?historyIds:new Set([root.id]))].map(habitId=>candidates.find(habit=>habit.id===habitId)??root);
    return buildHistorySeries(selected,habits,entries,historyBuckets);
  },[root,historyReady,historyIds,candidates,habits,entries,historyBuckets]);
  const scoreSelection=useMemo(()=>{
    if(!root)return [];
    const selected=[...scoreIds].flatMap(habitId=>{const habit=candidates.find(item=>item.id===habitId);return habit?[habit]:[]});
    return (selected.length?selected:[root]).map(habit=>({habit,color:habitAccent(habit,habits,c.accent)}));
  },[scoreIds,candidates,root,habits,c.accent]);
  const calendarSelection=useMemo(()=>{const selected=[...calendarIds].flatMap(habitId=>{const item=candidates.find(habit=>habit.id===habitId);return item?[item]:[]});return selected.length?selected:root?[root]:[]},[calendarIds,candidates,root]);
  const storedCalendarSelection=useMemo(()=>calendarSelection.map(item=>storedHabits.find(habit=>habit.id===item.id)??item),[calendarSelection,storedHabits]);
  if(!root)return <View style={[s.center,{backgroundColor:c.bg}]}><Text style={{color:c.text}}>{t('categoryNotFound')}</Text></View>;
  const candidate=(habitId:string)=>candidates.find(h=>h.id===habitId)??root,colorFor=(habitId:string)=>habitAccent(candidate(habitId),habits,c.accent);
  const historySeries:Series[]=historyData.map(item=>({...item,color:colorFor(item.habit.id)}));
  const currentSingle=filter==='streaks'?streakId:frequencyId;
  const setSingle=(habitId:string)=>{if(filter==='streaks')setStreakId(habitId);else setFrequencyId(habitId);setFilter(null)};
  const toggleMulti=(habitId:string)=>{const setter=filter==='score'?setScoreIds:filter==='calendar'?setCalendarIds:setHistoryIds;setter(current=>{const next=new Set(current);if(next.has(habitId)&&next.size>1)next.delete(habitId);else next.add(habitId);return next})};
  const calendarHabits=calendarSelection,calendarHabit=calendarHabits[0]??root;
  const editHref=`/habit/${root.id}`,editing=navigation.pending===editHref;
  return <><ScrollView style={[s.page,{backgroundColor:c.bg}]} contentContainerStyle={s.content} scrollEventThrottle={64} onLayout={event=>{viewport.current.height=event.nativeEvent.layout.height;revealSections()}} onScroll={event=>{viewport.current.offset=event.nativeEvent.contentOffset.y;revealSections()}}>
    <View style={s.detailTop}><Pressable accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={{left:12,right:4}} onPress={()=>router.back()} style={({pressed})=>[s.back,{backgroundColor:pressed?c.soft:'transparent'}]}>{({pressed})=><Ionicons name="chevron-back" size={16} color={pressed?c.text:c.muted}/>}</Pressable><Text accessibilityRole="header" style={[s.title,{color:c.text}]}>{root.emoji} {root.name}</Text><Pressable disabled={navigation.pending!==null} accessibilityRole="button" accessibilityLabel={`${t('edit')} ${root.name}`} accessibilityState={{busy:editing,disabled:navigation.pending!==null}} onPress={()=>navigation.push(editHref)} style={({pressed})=>[s.editButton,{backgroundColor:pressed?c.soft:'transparent'}]}>{({pressed})=>editing?<ActivityIndicator size="small" color={c.accent}/>:<Ionicons name="pencil-outline" size={16} color={pressed?c.text:c.muted}/>}</Pressable></View><Text style={[s.subtitle,{color:c.muted}]}>{t('detailIntro')}</Text>
    {storedRoot&&storedRoot.type!=='boolean'&&<View accessibilityRole="radiogroup" accessibilityLabel={t('analysisView')} style={[s.periodControls,{backgroundColor:c.soft,marginTop:0,marginBottom:16}]}>{[false,true].map(boolean=>{const selected=boolean===booleanView,label=boolean?t('activity'):t(storedRoot.type);return <TouchableOpacity key={String(boolean)} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{selected}} onPress={()=>setAnalysisMode({id,boolean})} style={[s.periodButton,selected&&{backgroundColor:c.accent}]}><Text style={{color:selected?c.onAccent:c.text,fontWeight:'700'}}>{label}</Text></TouchableOpacity>})}</View>}

    {!contentReady?<InsightSkeleton c={c}/>:<>
    <FadeIn><ChartCard chart="score" label={selectionLabel(scoreIds,candidates)} onFilter={anchor=>{setFilterAnchor(anchor??null);setFilter('score')}} c={c} headerControl={<TimeGroupingMenu key={id} pill scale={scoreScale} label={t('consistencyGrouping')} onChoose={scale=>{setScoreScale(scale);setScoreCount(initialTimelineCount(scale))}} c={c}/>}>
      <StrengthChart key={scoreScale} habit={storedRoot!} buckets={scoreBuckets} bucketSize={scoreScale} selected={scoreSelection} habits={storedHabits} entries={storedEntries} today={today} c={c} timeline onLoadEarlier={()=>setScoreCount(count=>extendTimelineCount(scoreScale,count))}/>
    </ChartCard></FadeIn>
    {calendarReady?<FadeIn><ActivityCalendar selected={calendarHabits} label={selectionLabel(calendarIds,candidates)} habit={calendarHabit} habits={habits} entries={entries} today={today} onEdit={setCalendarZoom} color={c.accent} onFilter={anchor=>{setFilterAnchor(anchor??null);setFilter('calendar')}} c={c}/></FadeIn>:<DeferredCardSkeleton c={c}/>}
    {historyReady?<ChartCard chart="history" label={selectionLabel(historyIds,candidates)} onFilter={anchor=>{setFilterAnchor(anchor??null);setFilter('history')}} c={c} headerControl={<TimeGroupingMenu key={id} pill scale={historyScale} label={t('historyGrouping')} onChoose={scale=>{setHistoryScale(scale);setHistoryCount(initialTimelineCount(scale))}} c={c}/>}>
      <HistoryChart key={historyScale} series={historySeries} buckets={historyBuckets} bucketSize={historyScale} type={root.type} c={c} timeline showValues onLoadEarlier={()=>setHistoryCount(count=>extendTimelineCount(historyScale,count))}/>
    </ChartCard>:<DeferredCardSkeleton c={c}/>}

    {tailReady?<><Streaks habit={candidate(streakId)} habits={habits} entries={entries} today={today} color={colorFor(streakId)} onFilter={anchor=>{setFilterAnchor(anchor??null);setFilter('streaks')}} c={c}/><Frequency habit={candidate(frequencyId)} habits={habits} entries={entries} today={today} color={colorFor(frequencyId)} onFilter={anchor=>{setFilterAnchor(anchor??null);setFilter('frequency')}} c={c}/></>:<><DeferredCardSkeleton c={c}/><DeferredCardSkeleton c={c}/></>}
    </>}
  </ScrollView><FilterModal anchor={filterAnchor} filter={filter} setFilter={setFilter} candidates={candidates} scoreIds={scoreIds} historyIds={historyIds} calendarIds={calendarIds} currentSingle={currentSingle} toggleMulti={toggleMulti} setSingle={setSingle} c={c}/>{calendarZoom!==null&&<CalendarDialog initialDate={calendarZoom} calendarHabits={storedCalendarSelection} booleanView={booleanView} color={c.accent} onClose={()=>setCalendarZoom(null)}/>}</>;
}

// Keep draft and pending-write renders inside the dialog, away from the charts.
function CalendarDialog({initialDate,calendarHabits,color,onClose,booleanView=false}:{initialDate:string;calendarHabits:Habit[];color:string;onClose:()=>void;booleanView?:boolean}){
  const {habits,entries,changeEntry,palette:c}=useApp(),today=todayLocal();
  const [editingId,setEditingId]=useState(calendarHabits[0].id);
  const calendarHabit=calendarHabits.find(habit=>habit.id===editingId)??calendarHabits[0];
  const analysis=useMemo(()=>booleanView?booleanAnalysis(habits,entries):{habits,entries},[booleanView,habits,entries]);
  const displayHabits=useMemo(()=>calendarHabits.map(item=>analysis.habits.find(habit=>habit.id===item.id)??item),[calendarHabits,analysis.habits]),displayHabit=analysis.habits.find(habit=>habit.id===calendarHabit.id)??calendarHabit;
  const [calendarEditor,setCalendarEditor]=useState<CalendarEditor|null>(null);
  const [entryNeedsRefresh,setEntryNeedsRefresh]=useState(false);
  const committedCalendarEntry=useRef<{date:string;value:number|null}|null>(null);
  const calendarSavingRef=useRef(false),[savingDate,setSavingDate]=useState<string|null>(null),[calendarZoomReady,setCalendarZoomReady]=useState(false);
  const calendarSaving=savingDate!==null;
  const directCalendarEntry=(date:string)=>calendarEntry(calendarHabit,habits,entries,date);
  const persistCalendarEntry=async(date:string,value:number|null)=>{
    if(calendarSavingRef.current||date>today||calendarHabit.archivedAt)return;
    calendarSavingRef.current=true;setSavingDate(date);
    try{await changeEntry(calendarHabit.id,committedCalendarEntry.current?.date??date,committedCalendarEntry.current?committedCalendarEntry.current.value:value);committedCalendarEntry.current=null;setEntryNeedsRefresh(false);setCalendarEditor(null)}
    catch(error){if(error instanceof EntryRefreshError&&calendarEditor){committedCalendarEntry.current??={date,value};setEntryNeedsRefresh(true)}Alert.alert(entryErrorTitle(error),error instanceof Error?error.message:String(error))}
    finally{calendarSavingRef.current=false;setSavingDate(null)}
  };
  const openCalendarEditor=(date:string)=>{
    if(calendarSavingRef.current||date>today||calendarHabit.archivedAt)return;
    const current=directCalendarEntry(date)?.value??null;
    if(calendarHabit.type==='boolean'){void persistCalendarEntry(date,toggledCalendarValue(calendarHabit,habits,entries,date));return}
    setCalendarEditor(calendarDraft(calendarHabit,date,current));
  };
  const updateCalendarEditor=(update:CalendarEditor|null|((current:CalendarEditor|null)=>CalendarEditor|null))=>{if(!calendarSavingRef.current&&(update===null||!committedCalendarEntry.current)){if(update===null){committedCalendarEntry.current=null;setEntryNeedsRefresh(false)}setCalendarEditor(update)}};
  const saveCalendarEntry=async()=>{
    if(!calendarEditor||calendarSavingRef.current)return;
    if(committedCalendarEntry.current){await persistCalendarEntry(committedCalendarEntry.current.date,committedCalendarEntry.current.value);return}
    const value=calendarInputValue(calendarHabit,calendarEditor);
    if(value===null)return Alert.alert(t('invalidNumber'));
    await persistCalendarEntry(calendarEditor.date,value);
  };
  const clearCalendarEntry=async()=>{if(calendarEditor)await persistCalendarEntry(calendarEditor.date,null)};
  const closeCalendar=()=>{if(calendarSavingRef.current)return;if(calendarEditor){committedCalendarEntry.current=null;setEntryNeedsRefresh(false);setCalendarEditor(null)}else onClose()};
  return <Modal transparent visible animationType="fade" onShow={()=>setCalendarZoomReady(true)} onRequestClose={closeCalendar}>
    <View style={{flex:1}}>
      <Pressable style={[s.overlay,{justifyContent:'center',padding:12,display:calendarEditor?'none':'flex'}]} onPress={closeCalendar}>
        <ScrollView style={{maxHeight:'95%',flexGrow:0}} contentContainerStyle={{flexGrow:1}}>
          <Pressable accessibilityViewIsModal onAccessibilityEscape={closeCalendar} onPress={()=>undefined} style={{backgroundColor:c.card,borderRadius:22,padding:16}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={[s.sectionTitle,{color:c.text,flex:1}]}>{t('editCalendar')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('close')} accessibilityState={{disabled:calendarSaving}} disabled={calendarSaving} onPress={closeCalendar} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Ionicons name="close" size={22} color={c.text}/></TouchableOpacity></View>
            <Text style={{color:c.text,marginTop:8}}>{calendarHabit.emoji} {calendarHabit.name}</Text>
            <Text style={{color:c.muted,marginTop:8}}>{t(calendarHabits.length>1?'calendarEditingHabitHelp':'calendarEditHelp')}</Text>
            {calendarHabits.length>1&&<View accessibilityRole="radiogroup" accessibilityLabel={t('selectCategory')} style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}>{calendarHabits.map(item=><TouchableOpacity key={item.id} accessibilityRole="radio" accessibilityLabel={item.name} accessibilityState={{selected:item.id===calendarHabit.id,disabled:calendarSaving}} disabled={calendarSaving} onPress={()=>setEditingId(item.id)} style={{minHeight:44,paddingHorizontal:12,borderRadius:12,justifyContent:'center',backgroundColor:item.id===calendarHabit.id?c.accent:c.soft}}><Text style={{color:item.id===calendarHabit.id?c.onAccent:c.text}}>{item.emoji} {item.name}</Text></TouchableOpacity>)}</View>}
            <Text style={{color:c.text,marginTop:8,fontWeight:'600'}}>{dateLabel(initialDate)}</Text>
            {!calendarZoomReady
              ?<CalendarSkeleton c={c}/>
              :<CalendarTimeline selected={displayHabits} initialDate={initialDate} cellSize={44} habit={displayHabit} habits={analysis.habits} entries={analysis.entries} today={today} onSelectDate={openCalendarEditor} saving={calendarSaving} savingDate={savingDate} color={color} c={c}/>
            }
          </Pressable>
        </ScrollView>
      </Pressable>
      {calendarEditor&&<CalendarEntryModal embedded locked={entryNeedsRefresh} editor={calendarEditor} habit={calendarHabit} hasRecord={!!directCalendarEntry(calendarEditor.date)} saving={calendarSaving} setEditor={updateCalendarEditor} onSave={saveCalendarEntry} onClear={clearCalendarEntry} c={c}/>}
    </View>
  </Modal>;
}

function FadeIn({children}:{children:React.ReactNode}){
  const opacity=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    let active=true;
    const reveal=(reduceMotion:boolean)=>{if(!active)return;if(reduceMotion)opacity.setValue(1);else Animated.timing(opacity,{toValue:1,duration:180,useNativeDriver:true}).start()};
    void AccessibilityInfo.isReduceMotionEnabled().then(reveal,()=>reveal(true));
    return()=>{active=false;opacity.stopAnimation()};
  },[opacity]);
  return <Animated.View style={{opacity}}>{children}</Animated.View>;
}

function InsightSkeleton({c}:{c:Palette}){return <View accessibilityRole="progressbar" importantForAccessibility="no-hide-descendants" style={skeleton.skeletonStack}>
  {[0,1].map(card=><View key={card} style={[skeleton.skeletonCard,{backgroundColor:c.card}]}>
    <View style={skeleton.skeletonHeader}><View style={[skeleton.skeletonTitle,{backgroundColor:c.soft}]}/><View style={[skeleton.skeletonPill,{backgroundColor:c.soft}]}/></View>
    <View style={skeleton.skeletonChart}>{[0,1,2,3].map(line=><View key={line} style={[skeleton.skeletonLine,{backgroundColor:c.line,top:line*47}]}/>)}</View>
    <View style={[skeleton.skeletonControls,{backgroundColor:c.soft}]}/>
  </View>)}
</View>}

function DeferredCardSkeleton({c}:{c:Palette}){return <View accessibilityRole="progressbar" importantForAccessibility="no-hide-descendants" style={[skeleton.skeletonCard,{height:250,backgroundColor:c.card,marginBottom:16}]}>
  <View style={skeleton.skeletonHeader}><View style={[skeleton.skeletonTitle,{backgroundColor:c.soft}]}/><View style={[skeleton.skeletonPill,{backgroundColor:c.soft}]}/></View>
  <View style={[skeleton.skeletonChart,{height:130}]}>{[0,1,2].map(line=><View key={line} style={[skeleton.skeletonLine,{backgroundColor:c.line,top:line*48}]}/>)}</View>
</View>}

function CalendarSkeleton({c}:{c:Palette}){return <View accessibilityRole="progressbar" importantForAccessibility="no-hide-descendants" style={skeleton.calendarSkeleton}>
  <View style={skeleton.calendarSkeletonWeekdays}>{Array.from({length:7},(_,index)=><View key={index} style={[skeleton.calendarSkeletonWeekday,{backgroundColor:c.soft}]}/>)}</View>
  <View style={skeleton.calendarSkeletonViewport}>
    <View style={skeleton.calendarSkeletonWeeks}>{Array.from({length:12},(_,week)=><View key={week} style={skeleton.calendarSkeletonWeek}>
      <View style={skeleton.calendarSkeletonMonthSpace}>{week%4===0&&<View style={[skeleton.calendarSkeletonMonth,{backgroundColor:c.soft}]}/>}</View>
      <View style={skeleton.calendarSkeletonDays}>{Array.from({length:7},(_,day)=><View key={day} style={[skeleton.calendarSkeletonDay,{backgroundColor:(week+day)%6===0?c.line:c.soft}]}/>)}</View>
    </View>)}</View>
  </View>
</View>}

function FilterModal({anchor,filter,setFilter,candidates,scoreIds,historyIds,calendarIds,currentSingle,toggleMulti,setSingle,c}:{anchor:PopoverAnchor|null;filter:FilterTarget|null;setFilter:(value:FilterTarget|null)=>void;candidates:Habit[];scoreIds:Set<string>;historyIds:Set<string>;calendarIds:Set<string>;currentSingle:string;toggleMulti:(id:string)=>void;setSingle:(id:string)=>void;c:Palette}){const multi=filter==='score'||filter==='history'||filter==='calendar';return <SelectionPopover anchor={anchor} visible={!!filter} onClose={()=>setFilter(null)} title={t(multi?'selectMultiple':'selectCategory')} hint={t(multi?'multipleHint':'singleHint')} c={c}><ScrollView>{candidates.map(habit=>{const depth=depthOf(habit,candidates),multi=filter==='score'||filter==='history'||filter==='calendar',selected=multi?(filter==='score'?scoreIds:filter==='calendar'?calendarIds:historyIds).has(habit.id):currentSingle===habit.id;return <TouchableOpacity key={habit.id} accessibilityRole={multi?'checkbox':'radio'} accessibilityState={{checked:selected}} onPress={()=>multi?toggleMulti(habit.id):setSingle(habit.id)} style={[s.filterRow,{borderColor:c.line,backgroundColor:depthBackground(c.card,c.soft,depth),paddingLeft:14+Math.min(depth,4)*12,paddingRight:14}]}><Text style={s.filterEmoji}>{habit.emoji}</Text><Text style={[s.filterName,{color:c.text}]}>{habit.name}</Text><Ionicons name={selected?(multi?'checkbox':'radio-button-on'):(multi?'square-outline':'radio-button-off')} size={23} color={selected?c.accent:c.muted}/></TouchableOpacity>})}</ScrollView></SelectionPopover>}


function depthOf(habit:Habit,candidates:Habit[]){let depth=0,current=habit;while(current.parentId){const parent=candidates.find(item=>item.id===current.parentId);if(!parent)break;depth++;current=parent}return depth}
function selectionLabel(ids:Set<string>,candidates:Habit[]){if(ids.size===1){const habit=candidates.find(item=>ids.has(item.id));return habit?`${habit.emoji} ${habit.name}`:'1'}return `${ids.size} ${t('selected')}`}
type ChartTitle='score'|'calendar'|'history'|'bestStreaks'|'frequency';
const chartHelp={score:'consistencyInfo',history:'historyInfo',bestStreaks:'streaksInfo',frequency:'frequencyInfo'} as const;
function ChartHeader({chart,label,onFilter,c,headerControl}:{chart:ChartTitle;label:string;onFilter:(anchor?:PopoverAnchor)=>void;c:Palette;headerControl?:React.ReactNode}){
  const [open,setOpen]=useState(false),title=t(chart);
  return <View><View style={[s.sectionHeader,headerControl?{flexWrap:'wrap'}:undefined]}><View style={{flexDirection:'row',alignItems:'center',flexShrink:1,gap:2}}><Text accessibilityRole="header" style={[s.sectionTitle,{color:c.text}]}>{title}</Text>{chart!=='calendar'&&<TouchableOpacity accessibilityRole="button" accessibilityLabel={t('chartInfo',{name:title})} accessibilityState={{expanded:open}} onPress={()=>setOpen(value=>!value)} style={{width:44,minHeight:44,alignItems:'flex-start',paddingLeft:4,justifyContent:'center'}}><Ionicons style={{height:20,lineHeight:20}} name={open?'chevron-up':'information-circle-outline'} size={17} color={open?c.accent:c.muted}/></TouchableOpacity>}</View>{headerControl?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:10,flexShrink:1,marginLeft:'auto'}}><FilterButton label={label} onPress={onFilter} c={c} expandedWidth/>{headerControl}</View>:<FilterButton label={label} onPress={onFilter} c={c}/>}</View>{chart!=='calendar'&&open&&<Text style={{color:c.muted,fontSize:14,lineHeight:21,marginTop:8}}>{t(chartHelp[chart])}</Text>}</View>;
}
function FilterButton({label,onPress,c,expandedWidth=false}:{label:string;onPress:(anchor?:PopoverAnchor)=>void;c:Palette;expandedWidth?:boolean}){const trigger=useRef<React.ElementRef<typeof TouchableOpacity>>(null);return <TouchableOpacity ref={trigger} accessibilityRole="button" onPress={()=>{if(trigger.current)trigger.current.measureInWindow((x,y,width,height)=>onPress({x,y,width,height}));else onPress()}} style={[s.filterButton,{backgroundColor:c.soft},expandedWidth&&{maxWidth:undefined,flexShrink:1}]}><Text numberOfLines={1} style={[s.filterButtonText,{color:c.accent}]}>{label}</Text></TouchableOpacity>}

function Header({chart,habit,onFilter,c}:{chart:ChartTitle;habit?:Habit;onFilter:(anchor?:PopoverAnchor)=>void;c:Palette}){return <ChartHeader chart={chart} label={habit?`${habit.emoji} ${habit.name}`:''} onFilter={onFilter} c={c}/>}
function ChartCard({chart,label,onFilter,c,children,headerControl}:{chart:ChartTitle;label:string;onFilter:(anchor?:PopoverAnchor)=>void;c:Palette;children:React.ReactNode;headerControl?:React.ReactNode}){return <View style={[s.card,{backgroundColor:c.card}]}><ChartHeader chart={chart} label={label} onFilter={onFilter} c={c} headerControl={headerControl}/>{children}</View>}
function ActivityCalendar({habit,selected,label,habits,entries,today,onEdit,color,onFilter,c}:{habit:Habit;selected:Habit[];label:string;habits:Habit[];entries:Entry[];today:string;onEdit:(date:string)=>void;color:string;onFilter:(anchor?:PopoverAnchor)=>void;c:Palette}){
  return <View style={[s.card,{backgroundColor:c.card}]}>
    <ChartHeader chart="calendar" label={label} onFilter={onFilter} c={c}/>
    <CalendarTimeline selected={selected} habit={habit} habits={habits} entries={entries} today={today} color={color} c={c} onOpenDate={onEdit}/>
  </View>;
}

function CalendarTimeline({habit,selected,habits,entries,today,color,c,onSelectDate,onOpenDate,saving=false,savingDate=null,cellSize=18,initialDate}:{habit:Habit;selected?:Habit[];habits:Habit[];entries:Entry[];today:string;color:string;c:Palette;onSelectDate?:(date:string)=>void;onOpenDate?:(date:string)=>void;saving?:boolean;savingDate?:string|null;cellSize?:number;initialDate?:string}){
  const {habits:originalHabits,entries:originalEntries}=useApp();
  const gap=3,step=cellSize+gap;
  const [firstMonth,setFirstMonth]=useState(()=>addMonths((initialDate??today).slice(0,7),-5));
  const scroll=useRef<FlatList<string[]>>(null),initialized=useRef(false),offset=useRef(0),loadingEarlier=useRef(false),pendingMonth=useRef<string|null>(null);
  const viewport=useRef(0),contentWidth=useRef(0);
  const {start,monthEnd,dates,weeks}=useMemo(()=>buildCalendarTimeline(firstMonth,today),[firstMonth,today]);
  const activity=useMemo(()=>calendarActivity(selected??[habit],habits,entries,dates,originalHabits,originalEntries),[selected,habit,habits,entries,dates,originalHabits,originalEntries]);
  const initialize=()=>{
    if(initialized.current||!viewport.current||!contentWidth.current)return;
    initialized.current=true;
    if(initialDate){const index=dates.indexOf(initialDate);scroll.current?.scrollToOffset({offset:calendarScrollOffset(Math.max(0,Math.floor(index/7)),step,cellSize,viewport.current,contentWidth.current),animated:false})}
    else scroll.current?.scrollToOffset({offset:Math.max(0,contentWidth.current-viewport.current),animated:false});
  };
  const loadEarlier=()=>{if(offset.current<4*step&&!loadingEarlier.current){loadingEarlier.current=true;setFirstMonth(month=>addMonths(month,-3))}};
  const move=(direction:number)=>{
    const visibleDate=weeks[Math.max(0,Math.min(weeks.length-1,Math.round(offset.current/step)))][0];
    const requested=addMonths(visibleDate.slice(0,7),direction),targetMonth=requested>today.slice(0,7)?today.slice(0,7):requested,targetDate=`${targetMonth}-01`;
    if(targetDate<start){pendingMonth.current=targetDate;loadingEarlier.current=true;setFirstMonth(addMonths(targetMonth,-2));return}
    const targetIndex=dates.findIndex(date=>date>=targetDate);
    scroll.current?.scrollToOffset({offset:Math.floor(targetIndex/7)*step,animated:true});
  };
  return <View style={{flexDirection:'row'}}>
    {cellSize>18&&<View style={{paddingTop:34,width:22}}>{Array.from({length:7},(_,index)=><Text key={index} style={{height:step,lineHeight:cellSize,color:c.muted,fontSize:12}}>{new Intl.DateTimeFormat(undefined,{weekday:'narrow'}).format(new Date(2024,0,1+index))}</Text>)}</View>}
    <FlatList ref={scroll} horizontal data={weeks} keyExtractor={week=>week[0]}
      initialNumToRender={cellSize>18?10:24} maxToRenderPerBatch={12} windowSize={5}
      initialScrollIndex={initialCalendarWeek(dates,initialDate??today)}
      getItemLayout={(_,index)=>({length:step,offset:index*step,index})}
      directionalLockEnabled showsHorizontalScrollIndicator={false} removeClippedSubviews
      style={s.chartBody} ItemSeparatorComponent={()=><View style={{width:gap}}/>} maintainVisibleContentPosition={{minIndexForVisible:0}}
      onLayout={event=>{viewport.current=event.nativeEvent.layout.width;initialize()}}
      onContentSizeChange={width=>{
        contentWidth.current=width;
        loadingEarlier.current=false;
        if(pendingMonth.current){const index=dates.findIndex(date=>date>=pendingMonth.current!);pendingMonth.current=null;scroll.current?.scrollToOffset({offset:Math.max(0,Math.floor(index/7)*step),animated:false})}
        else initialize();
      }}
      onScroll={event=>{offset.current=event.nativeEvent.contentOffset.x}} scrollEventThrottle={16}
      onScrollEndDrag={loadEarlier} onMomentumScrollEnd={loadEarlier}
      accessibilityRole="adjustable" accessibilityHint={t('swipeCalendar')}
      accessibilityActions={[{name:'increment',label:t('nextMonth')},{name:'decrement',label:t('previousMonth')}]}
      onAccessibilityAction={event=>move(event.nativeEvent.actionName==='increment'?1:-1)}
      renderItem={({item:week,index})=>{
      const monthDate=week.find(date=>date.endsWith('-01')&&date<=monthEnd);return <View key={week[0]} style={{width:cellSize}}>
        <View style={{height:18}}>{monthDate&&<Text numberOfLines={1} adjustsFontSizeToFit style={{position:'absolute',width:Math.min(84,(weeks.length-index)*step-gap),color:c.muted,fontSize:9,fontWeight:'700'}}>{calendarMonthLabel(monthDate,today)}</Text>}</View>
        <View style={{gap:gap}}>{week.map(date=>{const isFuture=date>today,fills=isFuture?[]:activity.get(date)??[],isActive=fills.length>0,below=fills.some(fill=>fill.opacity<1),colors=fills.map(fill=>(fill.color?habitAccentPalette[fill.color]:color)+(fill.opacity<1?'4D':''));const label=`${(selected??[habit]).map(item=>item.name).join(', ')}, ${date}: ${isActive?t('active'):t('inactive')}${below?', '+t('calendarBelowThreshold'):''}`,style={width:cellSize,height:cellSize,borderRadius:3,overflow:'hidden' as const,alignItems:'center' as const,justifyContent:'center' as const,backgroundColor:colors.length===1?colors[0]:c.soft,opacity:isFuture?.3:1,borderWidth:date===initialDate?2:0,borderColor:c.text},number=<>{colors.length>1&&<CalendarDayBackground colors={colors} opacity={1}/>}<Text style={{fontSize:cellSize>18?14:7.5,fontWeight:'700',color:isActive?(below?c.text:c.onAccent):c.muted}}>{Number(date.slice(-2))}</Text></>;
          return onOpenDate?<TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityHint={t('openCalendarDay')} onPress={()=>onOpenDate(date)} key={date} style={style}>{number}</TouchableOpacity>:onSelectDate?<TouchableOpacity disabled={isFuture||saving||!!habit.archivedAt} accessibilityState={{disabled:isFuture||saving||!!habit.archivedAt,busy:saving}} onPress={()=>onSelectDate(date)} accessibilityRole="button" accessibilityHint={habit.type==='boolean'?t('ownRecordHint'):t('editDay')} accessibilityLabel={label} key={date} style={style}>{savingDate===date?<ActivityIndicator size="small" color={isActive?c.onAccent:c.accent}/>:number}</TouchableOpacity>:<View accessible accessibilityLabel={label} key={date} style={style}>{number}</View>})}</View>
      </View>}}
    />
  </View>
}

function Streaks({habit,habits,entries,today,color,onFilter,c}:{habit:Habit;habits:Habit[];entries:Entry[];today:string;color:string;onFilter:(anchor?:PopoverAnchor)=>void;c:Palette}){const dates=[...new Set(entries.filter(entry=>entry.localDate<=today).map(entry=>entry.localDate))],streaks=bestActivityStreaks(activeDates(habit,habits,entries,dates)),max=Math.max(...streaks.map(item=>item.length),1);return <View style={[s.card,{backgroundColor:c.card}]}><Header chart="bestStreaks" habit={habit} onFilter={onFilter} c={c}/><View style={[s.chartBody,{gap:8}]}>{streaks.length?streaks.map((item,index)=><View key={`${item.start}-${item.end}`} style={{gap:4}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={[s.streakDate,{color:c.muted}]}>{dateLabel(item.start)}</Text><Text style={{color:c.muted,fontSize:11}}>{dateLabel(item.end)}</Text></View><View style={s.streakTrack}><View style={[s.streakBar,{width:`${Math.max(28,item.length/max*100)}%`,backgroundColor:color,opacity:index?Math.max(.3,.72-index*.09):1}]}><Text style={s.streakCount}>{item.length}</Text></View></View></View>):<Text style={[s.empty,{color:c.muted}]}>{t('noStreaks')}</Text>}</View></View>}
function Frequency({habit,habits,entries,today,color,onFilter,c}:{habit:Habit;habits:Habit[];entries:Entry[];today:string;color:string;onFilter:(anchor?:PopoverAnchor)=>void;c:Palette}){
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
const initialTimelineCount=(scale:BucketSize)=>scale==='day'?60:scale==='week'?26:scale==='month'?36:scale==='quarter'?24:12;
const extendTimelineCount=(scale:BucketSize,count:number)=>Math.min(count+(scale==='day'?60:12),scale==='year'?100:scale==='quarter'?400:scale==='month'?1200:scale==='week'?5200:36500);
function TimeGroupingMenu({scale,label,onChoose,c,pill=false}:{scale:BucketSize;label:string;onChoose:(scale:BucketSize)=>void;c:Palette;pill?:boolean}){
  const [open,setOpen]=useState(false),[anchor,setAnchor]=useState<PopoverAnchor|null>(null),trigger=useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  return <View><TouchableOpacity ref={trigger} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{expanded:open}} onPress={()=>{if(trigger.current)trigger.current.measureInWindow((x,y,width,height)=>{setAnchor({x,y,width,height});setOpen(true)});else setOpen(true)}} style={pill?[s.filterButton,{backgroundColor:c.soft,maxWidth:undefined,alignSelf:'flex-start'}]:{alignSelf:'flex-start',minHeight:44,flexDirection:'row',alignItems:'center',gap:8}}><Text style={pill?[s.filterButtonText,{color:c.accent}]:{color:c.accent,fontWeight:'700'}}>{t(scale)}</Text>{!pill&&<Ionicons name={open?'chevron-up':'chevron-down'} size={16} color={c.accent}/>}</TouchableOpacity>
    {open&&<SelectionPopover anchor={anchor} visible onClose={()=>setOpen(false)} title={label} c={c}><ScrollView><View accessibilityRole="radiogroup" accessibilityLabel={label}>{(['day','week','month','quarter','year'] as const).map(value=><TouchableOpacity key={value} accessibilityRole="radio" accessibilityLabel={t(value)} accessibilityState={{selected:scale===value}} onPress={()=>{onChoose(value);setOpen(false)}} style={[s.filterRow,{borderColor:c.line,paddingHorizontal:14}]}><Text style={[s.filterName,{color:c.text}]}>{t(value)}</Text><Ionicons name={scale===value?'radio-button-on':'radio-button-off'} size={23} color={scale===value?c.accent:c.muted}/></TouchableOpacity>)}</View></ScrollView></SelectionPopover>}

  </View>;
}

const skeleton=StyleSheet.create({skeletonStack:{gap:16},skeletonCard:{height:360,borderRadius:23,padding:16,overflow:'hidden'},skeletonHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},skeletonTitle:{width:94,height:24,borderRadius:8},skeletonPill:{width:116,height:36,borderRadius:18},skeletonChart:{height:190,marginTop:28,position:'relative'},skeletonLine:{position:'absolute',left:0,right:0,height:2,borderRadius:1},skeletonControls:{height:44,borderRadius:18,marginTop:24},calendarSkeleton:{flexDirection:'row'},calendarSkeletonWeekdays:{width:22,paddingTop:34,gap:3},calendarSkeletonWeekday:{width:12,height:44,borderRadius:3},calendarSkeletonViewport:{flex:1,overflow:'hidden'},calendarSkeletonWeeks:{flexDirection:'row',gap:3},calendarSkeletonWeek:{width:44},calendarSkeletonMonthSpace:{height:18},calendarSkeletonMonth:{width:44,height:8,borderRadius:3},calendarSkeletonDays:{gap:3},calendarSkeletonDay:{width:44,height:44,borderRadius:3}});
const s=StyleSheet.create({page:{flex:1},content:{padding:20,paddingTop:12,paddingBottom:50},center:{flex:1,alignItems:'center',justifyContent:'center'},detailTop:{flexDirection:'row',alignItems:'center',gap:4},back:{width:28,height:44,marginLeft:-6,borderRadius:12,alignItems:'center',justifyContent:'center'},editButton:{width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center'},title:{fontSize:22,fontWeight:'700',flex:1},subtitle:{lineHeight:20,marginTop:5,marginBottom:18},card:{borderRadius:23,padding:16,marginBottom:16},chartBody:{marginTop:16},sectionHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},sectionTitle:{flexShrink:1,fontSize:20,lineHeight:24,includeFontPadding:false,fontWeight:'800'},filterButton:{maxWidth:'55%',minHeight:36,borderRadius:15,paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:5},filterButtonText:{fontSize:12,fontWeight:'700',flexShrink:1},periodControls:{flexDirection:'row',borderRadius:18,padding:3,marginTop:16},periodButton:{flex:1,minHeight:34,borderRadius:15,alignItems:'center',justifyContent:'center'},streakDate:{fontSize:11},streakTrack:{flex:1},streakBar:{minHeight:20,paddingVertical:2,borderRadius:6,alignItems:'center',justifyContent:'center'},streakCount:{color:'white',fontSize:11,fontWeight:'800'},empty:{paddingVertical:24,textAlign:'center'},overlay:{flex:1,backgroundColor:'#0008',justifyContent:'flex-end'},filterRow:{minHeight:54,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,gap:10},filterEmoji:{fontSize:20},filterName:{fontSize:15,fontWeight:'700',flex:1}})
