import { calendarScrollOffset } from './calendarScroll';
import { CalendarEntryModal } from './CalendarEntryModal';
import { buildFrequency } from '@/domain/frequency';
import { buildHistorySeries,buildHistoryWindow,historyAxis,shiftHistoryAnchor } from '@/domain/history';
import { CalendarDraft,calendarDraft,calendarEntry,calendarInputValue,toggledCalendarValue } from './calendarEntry';
import { SheetHandle } from '@/features/SheetHandle';
import { Ionicons } from '@expo/vector-icons';
import { router,useLocalSearchParams } from 'expo-router';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import { ActivityIndicator,Alert,InteractionManager,Modal,PanResponder,Pressable,ScrollView,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import Svg,{Circle,Line,Polyline,Rect,Text as SvgText} from 'react-native-svg';
import { aggregate,formatValue } from '@/domain/aggregation';
import { bestActivityStreaks,buildScoreWindow,buildInsightWindow,InsightPeriod,shiftInsightAnchor,TimeBucket } from '@/domain/analytics';
import { todayLocal } from '@/domain/entries';
import { orderedCandidates } from './orderedCandidates';
import { Entry,Habit } from '@/domain/types';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';
import { dark,depthBackground,light } from '@/theme';
import { addDays,addMonths } from '@/utils/dates';
import { usePrefetchRoutes,useResponsiveNavigation } from '@/features/useResponsiveNavigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const colors=['#4E7C67','#E38B65','#6F86C7','#D0A13B','#9B72B0','#4BA3A6','#C7657A'];
const NativeRect=Rect as unknown as React.ElementType,NativeSvg=Svg as unknown as React.ElementType,NativeLine=Line as unknown as React.ElementType,NativePolyline=Polyline as unknown as React.ElementType,NativeCircle=Circle as unknown as React.ElementType,NativeSvgText=SvgText as unknown as React.ElementType;
type Palette=typeof light|typeof dark;
type FilterTarget='score'|'history'|'calendar'|'streaks'|'frequency';
type Series={label?:string;records?:Entry[][];habit:Habit;color:string;values:number[];previousValues?:number[]};
type CalendarEditor=CalendarDraft;
const periods:InsightPeriod[]=['week','month','quarter','year'];
type ScorePeriod=Exclude<InsightPeriod,'quarter'>;
const scorePeriods:ScorePeriod[]=['week','month','year'];
const scoreFor=(habit:Habit,habits:Habit[],entries:Entry[],dates:Set<string>)=>dates.size?[...dates].filter(date=>aggregate(habits,entries,habit.id,new Set([date]))>0).length/dates.size*100:0;
const activeDates=(habit:Habit,habits:Habit[],entries:Entry[],dates:string[])=>new Set(dates.filter(date=>aggregate(habits,entries,habit.id,new Set([date]))>0));
const dateLabel=(date:string)=>new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${date}T12:00:00`));
const calendarMonthLabel=(date:string,today:string)=>{
  const month=new Intl.DateTimeFormat(undefined,{month:'short'}).format(new Date(`${date}T12:00:00`)).replace(/[.\s]/g,'').slice(0,3);
  const name=month.charAt(0).toLocaleUpperCase()+month.slice(1).toLocaleLowerCase();
  return date.slice(0,4)===today.slice(0,4)?name:`${name} ${date.slice(2,4)}`;
};

export default function InsightDetailScreen(){
  const {id}=useLocalSearchParams<{id:string}>(),{habits,entries,changeEntry,palette:c}=useApp(),root=habits.find(h=>h.id===id),today=todayLocal();
  usePrefetchRoutes([`/habit/${id}`]);
  const candidates=useMemo(()=>root?orderedCandidates(habits,root):[],[habits,root]);
  const scoreInitial=useMemo(()=>new Set([id]),[id]),historyInitial=useMemo(()=>new Set([id]),[id]);
  const [scorePeriod,setScorePeriod]=useState<ScorePeriod>('week'),[scoreAnchor,setScoreAnchor]=useState(today),[historyPeriod,setHistoryPeriod]=useState<InsightPeriod>('week'),[historyAnchor,setHistoryAnchor]=useState(today),[scoreIds,setScoreIds]=useState(scoreInitial),[historyIds,setHistoryIds]=useState(historyInitial),[calendarId,setCalendarId]=useState(id),[calendarZoom,setCalendarZoom]=useState<string|null>(null),[calendarEditor,setCalendarEditor]=useState<CalendarEditor|null>(null),[streakId,setStreakId]=useState(id),[frequencyId,setFrequencyId]=useState(id),[filter,setFilter]=useState<FilterTarget|null>(null);
  const calendarSavingRef=useRef(false),[calendarSaving,setCalendarSaving]=useState(false),[contentReady,setContentReady]=useState(false),[historyReady,setHistoryReady]=useState(false),[tailReady,setTailReady]=useState(false),[calendarZoomReady,setCalendarZoomReady]=useState(false),navigation=useResponsiveNavigation();
  useEffect(()=>{setContentReady(false);setHistoryReady(false);setTailReady(false);const task=InteractionManager.runAfterInteractions(()=>setContentReady(true));return()=>task.cancel()},[id]);
  useEffect(()=>{if(calendarZoom===null){setCalendarZoomReady(false);return}const task=InteractionManager.runAfterInteractions(()=>setCalendarZoomReady(true));return()=>task.cancel()},[calendarZoom]);
  const scoreWindow=useMemo(()=>buildScoreWindow(scorePeriod,scoreAnchor,today),[scorePeriod,scoreAnchor,today]),historyWindow=useMemo(()=>buildHistoryWindow(historyPeriod,historyAnchor,today),[historyPeriod,historyAnchor,today]);
  const previousScoreWindow=useMemo(()=>{const window=buildInsightWindow(scorePeriod,shiftInsightAnchor(scoreAnchor,scorePeriod,-1),today);return {...window,buckets:window.buckets.slice(0,scoreWindow.buckets.filter(bucket=>bucket.dates.size>0).length)}},[scorePeriod,scoreAnchor,scoreWindow.buckets,today]);
  const historyData=useMemo(()=>{
    if(!root||!historyReady)return [];
    const selected=[...(historyIds.size?historyIds:new Set([root.id]))].map(habitId=>candidates.find(habit=>habit.id===habitId)??root);
    return buildHistorySeries(selected,candidates,habits,entries,historyWindow.buckets);
  },[root,historyReady,historyIds,candidates,habits,entries,historyWindow.buckets]);
  if(!root)return <View style={[s.center,{backgroundColor:c.bg}]}><Text style={{color:c.text}}>{t('categoryNotFound')}</Text></View>;
  const candidate=(habitId:string)=>candidates.find(h=>h.id===habitId)??root,colorFor=(habitId:string)=>colors[Math.max(0,candidates.findIndex(h=>h.id===habitId))%colors.length];
  const scoreSeries:Series[]=contentReady?[...(scoreIds.size?scoreIds:new Set([root.id]))].map(candidate).map(habit=>({habit,color:colorFor(habit.id),values:scoreWindow.buckets.filter(bucket=>bucket.dates.size>0).map(bucket=>scoreFor(habit,habits,entries,bucket.dates)),previousValues:previousScoreWindow.buckets.map(bucket=>scoreFor(habit,habits,entries,bucket.dates))})):[];
  const historySeries:Series[]=historyData.map(item=>({...item,label:habits.some(h=>h.parentId===item.habit.id)?t('historyBranchTotal',{name:item.habit.name}):item.habit.name,color:colorFor(item.habit.id)}));
  const currentSingle=filter==='calendar'?calendarId:filter==='streaks'?streakId:frequencyId;
  const setSingle=(habitId:string)=>{if(filter==='calendar')setCalendarId(habitId);else if(filter==='streaks')setStreakId(habitId);else setFrequencyId(habitId);setFilter(null)};
  const toggleMulti=(habitId:string)=>{const setter=filter==='score'?setScoreIds:setHistoryIds;setter(current=>{const next=new Set(current);if(next.has(habitId)&&next.size>1)next.delete(habitId);else next.add(habitId);return next})};
  const chooseScorePeriod=(period:ScorePeriod)=>{setScorePeriod(period);setScoreAnchor(today)},chooseHistoryPeriod=(period:InsightPeriod)=>{setHistoryPeriod(period);setHistoryAnchor(today)};
  const calendarHabit=candidate(calendarId),directCalendarEntry=(date:string)=>calendarEntry(calendarHabit,habits,entries,date);
  const persistCalendarEntry=async(date:string,value:number|null)=>{
    if(calendarSavingRef.current||date>today||calendarHabit.archivedAt)return;
    calendarSavingRef.current=true;setCalendarSaving(true);
    try{await changeEntry(calendarHabit.id,date,value);setCalendarEditor(null)}
    catch(error){Alert.alert(t('couldNotSave'),error instanceof Error?error.message:String(error))}
    finally{calendarSavingRef.current=false;setCalendarSaving(false)}
  };
  const openCalendarEditor=(date:string)=>{
    if(calendarSavingRef.current||date>today||calendarHabit.archivedAt)return;
    const current=directCalendarEntry(date)?.value??null;
    if(calendarHabit.type==='boolean'){void persistCalendarEntry(date,toggledCalendarValue(calendarHabit,habits,entries,date));return}
    setCalendarEditor(calendarDraft(calendarHabit,date,current));
  };
  const updateCalendarEditor=(update:CalendarEditor|null|((current:CalendarEditor|null)=>CalendarEditor|null))=>{if(!calendarSavingRef.current)setCalendarEditor(update)};
  const saveCalendarEntry=async()=>{
    if(!calendarEditor||calendarSavingRef.current)return;
    const value=calendarInputValue(calendarHabit,calendarEditor);
    if(value===null)return Alert.alert(t('invalidNumber'));
    await persistCalendarEntry(calendarEditor.date,value);
  };
  const clearCalendarEntry=async()=>{if(calendarEditor)await persistCalendarEntry(calendarEditor.date,null)};
  const openCalendar=(date:string)=>{setCalendarZoomReady(false);setCalendarZoom(date)};
  const closeCalendar=()=>{if(calendarSavingRef.current)return;if(calendarEditor)setCalendarEditor(null);else{setCalendarZoom(null);setCalendarZoomReady(false)}};
  const editHref=`/habit/${root.id}`,editing=navigation.pending===editHref;
  return <><ScrollView style={[s.page,{backgroundColor:c.bg}]} contentContainerStyle={s.content} scrollEventThrottle={64} onScroll={event=>{const y=event.nativeEvent.contentOffset.y;if(y>220&&!historyReady)setHistoryReady(true);if(y>700&&!tailReady)setTailReady(true)}}>
    <View style={s.detailTop}><Pressable accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={{left:12,right:4}} onPress={()=>router.back()} style={({pressed})=>[s.back,{backgroundColor:pressed?c.soft:'transparent'}]}>{({pressed})=><Ionicons name="chevron-back" size={16} color={pressed?c.text:c.muted}/>}</Pressable><Text accessibilityRole="header" style={[s.title,{color:c.text}]}>{root.emoji} {root.name}</Text><Pressable disabled={navigation.pending!==null} accessibilityRole="button" accessibilityLabel={`${t('edit')} ${root.name}`} accessibilityState={{busy:editing,disabled:navigation.pending!==null}} onPress={()=>navigation.push(editHref)} style={({pressed})=>[s.editButton,{backgroundColor:pressed?c.soft:'transparent'}]}>{({pressed})=>editing?<ActivityIndicator size="small" color={c.accent}/>:<Ionicons name="pencil-outline" size={16} color={pressed?c.text:c.muted}/>}</Pressable></View><Text style={[s.subtitle,{color:c.muted}]}>{t('detailIntro')}</Text>
    {!contentReady?<InsightSkeleton c={c}/>:<>
    <ChartCard title={t('score')} label={selectionLabel(scoreIds,candidates)} onFilter={()=>setFilter('score')} c={c}><Pannable onMove={amount=>setScoreAnchor(anchor=>boundedAnchor(anchor,scorePeriod,amount,today))}><LineChart key={`${scorePeriod}-${scoreAnchor}`} series={scoreSeries} buckets={scoreWindow.buckets} c={c}/></Pannable><HistoryNavigation score period={scorePeriod} anchor={scoreAnchor} today={today} window={scoreWindow} onMove={amount=>setScoreAnchor(anchor=>boundedAnchor(anchor,scorePeriod,amount,today))} c={c}/><PeriodControls options={scorePeriods} value={scorePeriod} onChange={chooseScorePeriod} c={c}/></ChartCard>
    <ActivityCalendar habit={calendarHabit} habits={habits} entries={entries} today={today} onEdit={openCalendar} color={colorFor(calendarId)} onFilter={()=>{if(!calendarSavingRef.current)setFilter('calendar')}} c={c}/>
    {historyReady?<ChartCard title={t('history')} label={selectionLabel(historyIds,candidates)} onFilter={()=>setFilter('history')} c={c}><BarChart key={`${historyPeriod}-${historyAnchor}`} series={historySeries} habits={habits} buckets={historyWindow.buckets} period={historyPeriod} type={root.type} c={c}/><HistoryNavigation period={historyPeriod} anchor={historyAnchor} today={today} window={historyWindow} onMove={amount=>setHistoryAnchor(anchor=>shiftHistoryAnchor(anchor,historyPeriod,amount,today))} c={c}/><PeriodControls options={periods} value={historyPeriod} onChange={chooseHistoryPeriod} c={c}/></ChartCard>:<DeferredCardSkeleton c={c}/>}
    {tailReady?<><Streaks habit={candidate(streakId)} habits={habits} entries={entries} today={today} color={colorFor(streakId)} onFilter={()=>setFilter('streaks')} c={c}/><Frequency habit={candidate(frequencyId)} habits={habits} entries={entries} today={today} color={colorFor(frequencyId)} onFilter={()=>setFilter('frequency')} c={c}/></>:<><DeferredCardSkeleton c={c}/><DeferredCardSkeleton c={c}/></>}
    </>}
  </ScrollView><FilterModal filter={filter} setFilter={setFilter} candidates={candidates} scoreIds={scoreIds} historyIds={historyIds} currentSingle={currentSingle} toggleMulti={toggleMulti} setSingle={setSingle} c={c}/><Modal transparent visible={calendarZoom!==null} animationType="fade" onRequestClose={closeCalendar}>
    <View style={{flex:1}}>
      <Pressable style={[s.overlay,{justifyContent:'center',padding:12,display:calendarEditor?'none':'flex'}]} onPress={closeCalendar}>
        <ScrollView style={{maxHeight:'95%',flexGrow:0}} contentContainerStyle={{flexGrow:1}}>
          <Pressable accessibilityViewIsModal onAccessibilityEscape={closeCalendar} onPress={()=>undefined} style={{backgroundColor:c.card,borderRadius:22,padding:16}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={[s.sectionTitle,{color:c.text,flex:1}]}>{t('editCalendar')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('close')} accessibilityState={{disabled:calendarSaving}} disabled={calendarSaving} onPress={closeCalendar} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Ionicons name="close" size={22} color={c.text}/></TouchableOpacity></View>
            <Text style={{color:c.text,marginTop:8}}>{calendarHabit.emoji} {calendarHabit.name}</Text>
            <Text style={{color:c.muted,marginTop:8}}>{t('calendarEditHelp')}</Text>
            <Text style={{color:c.text,marginTop:8,fontWeight:'600'}}>{calendarZoom&&dateLabel(calendarZoom)}</Text>
            {!calendarZoomReady
              ?<CalendarSkeleton c={c}/>
              :calendarZoom!==null&&<CalendarTimeline initialDate={calendarZoom} cellSize={44} habit={calendarHabit} habits={habits} entries={entries} today={today} onSelectDate={openCalendarEditor} saving={calendarSaving} color={colorFor(calendarId)} c={c}/>
            }
          </Pressable>
        </ScrollView>
      </Pressable>
      {calendarEditor&&<CalendarEntryModal embedded editor={calendarEditor} habit={calendarHabit} hasRecord={!!directCalendarEntry(calendarEditor.date)} saving={calendarSaving} setEditor={updateCalendarEditor} onSave={saveCalendarEntry} onClear={clearCalendarEntry} c={c}/>}
    </View>
  </Modal></>;
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
  <View style={skeleton.skeletonWeekdays}>{Array.from({length:7},(_,index)=><View key={index} style={[skeleton.skeletonWeekday,{backgroundColor:c.soft}]}/>)}</View>
  <View style={skeleton.skeletonDays}>{Array.from({length:35},(_,index)=><View key={index} style={[skeleton.skeletonDay,{backgroundColor:index%6===0?c.line:c.soft}]}/>)}</View>
  <View style={[skeleton.skeletonMonth,{backgroundColor:c.soft}]}/>
</View>}

function FilterModal({filter,setFilter,candidates,scoreIds,historyIds,currentSingle,toggleMulti,setSingle,c}:{filter:FilterTarget|null;setFilter:(value:FilterTarget|null)=>void;candidates:Habit[];scoreIds:Set<string>;historyIds:Set<string>;currentSingle:string;toggleMulti:(id:string)=>void;setSingle:(id:string)=>void;c:Palette}){const insets=useSafeAreaInsets();return <Modal transparent visible={!!filter} animationType="slide" onRequestClose={()=>setFilter(null)}><Pressable style={s.overlay} onPress={()=>setFilter(null)}><Pressable style={[s.filterSheet,{backgroundColor:c.card,paddingBottom:34+insets.bottom}]} onAccessibilityEscape={()=>setFilter(null)} onPress={()=>undefined}><SheetHandle onClose={()=>setFilter(null)}/><View style={s.filterHeader}><View><Text style={[s.filterTitle,{color:c.text}]}>{filter==='score'||filter==='history'?t('selectMultiple'):t('selectCategory')}</Text><Text style={{color:c.muted}}>{filter==='score'||filter==='history'?t('multipleHint'):t('singleHint')}</Text></View></View><ScrollView>{candidates.map(habit=>{const depth=depthOf(habit,candidates),multi=filter==='score'||filter==='history',selected=multi?(filter==='score'?scoreIds:historyIds).has(habit.id):currentSingle===habit.id;return <TouchableOpacity key={habit.id} accessibilityRole={multi?'checkbox':'radio'} accessibilityState={{checked:selected}} onPress={()=>multi?toggleMulti(habit.id):setSingle(habit.id)} style={[s.filterRow,{borderColor:c.line,backgroundColor:depthBackground(c.card,c.soft,depth),paddingLeft:14+Math.min(depth,4)*12,paddingRight:14}]}><Text style={s.filterEmoji}>{habit.emoji}</Text><Text style={[s.filterName,{color:c.text}]}>{habit.name}</Text><Ionicons name={selected?(multi?'checkbox':'radio-button-on'):(multi?'square-outline':'radio-button-off')} size={23} color={selected?c.accent:c.muted}/></TouchableOpacity>})}</ScrollView></Pressable></Pressable></Modal>}
function boundedAnchor(anchor:string,period:InsightPeriod,amount:number,today:string){const next=shiftInsightAnchor(anchor,period,amount);return next>today?anchor:next}
function depthOf(habit:Habit,candidates:Habit[]){let depth=0,current=habit;while(current.parentId){const parent=candidates.find(item=>item.id===current.parentId);if(!parent)break;depth++;current=parent}return depth}
function selectionLabel(ids:Set<string>,candidates:Habit[]){if(ids.size===1){const habit=candidates.find(item=>ids.has(item.id));return habit?`${habit.emoji} ${habit.name}`:'1'}return `${ids.size} ${t('selected')}`}
function Title({title,c}:{title:string;c:Palette}){return <Text style={[s.sectionTitle,{color:c.text}]}>{title}</Text>}
function FilterButton({label,onPress,c}:{label:string;onPress:()=>void;c:Palette}){return <TouchableOpacity onPress={onPress} style={[s.filterButton,{backgroundColor:c.soft}]}><Text numberOfLines={1} style={[s.filterButtonText,{color:c.accent}]}>{label}</Text><Ionicons name="chevron-down" size={15} color={c.accent}/></TouchableOpacity>}

function PeriodControls<P extends InsightPeriod>({value,onChange,c,options}:{value:P;onChange:(period:P)=>void;c:Palette;options:readonly P[]}){return <View style={[s.periodControls,{backgroundColor:c.soft}]}>{options.map(period=><TouchableOpacity accessibilityRole="button" key={period} onPress={()=>onChange(period)} style={[s.periodButton,value===period&&{backgroundColor:c.accent}]}><Text style={{color:value===period?'white':c.text,fontSize:11,fontWeight:'800'}}>{t(period)}</Text></TouchableOpacity>)}</View>}
function Header({title,habit,onFilter,c}:{title:string;habit?:Habit;onFilter:()=>void;c:Palette}){return <View style={s.sectionHeader}><Title title={title} c={c}/><FilterButton label={habit?`${habit.emoji} ${habit.name}`:''} onPress={onFilter} c={c}/></View>}
function ChartCard({title,label,onFilter,c,children}:{title:string;label:string;onFilter:()=>void;c:Palette;children:React.ReactNode}){return <View style={[s.card,{backgroundColor:c.card}]}><View style={s.sectionHeader}><Title title={title} c={c}/><FilterButton label={label} onPress={onFilter} c={c}/></View>{children}</View>}
function Legend({series,c}:{series:Series[];c:Palette}){return <View style={s.legend}>{series.map(item=><View key={item.habit.id} style={s.legendItem}><View style={[s.legendDot,{backgroundColor:item.color}]}/><Text numberOfLines={1} style={{color:c.muted,fontSize:11,maxWidth:110}}>{item.habit.emoji} {item.label??item.habit.name}</Text></View>)}</View>}

function Pannable({onMove,children}:{onMove:(amount:number)=>void;children:React.ReactNode}){const pan=PanResponder.create({onMoveShouldSetPanResponder:(_,gesture)=>Math.abs(gesture.dx)>12&&Math.abs(gesture.dx)>Math.abs(gesture.dy),onPanResponderRelease:(_,gesture)=>{if(gesture.dx>40)onMove(-1);else if(gesture.dx< -40)onMove(1)}});return <View {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityHint={t('swipeChart')} accessibilityActions={[{name:'increment',label:t('nextPeriod')},{name:'decrement',label:t('previousPeriod')}]} onAccessibilityAction={event=>onMove(event.nativeEvent.actionName==='increment'?1:-1)}>{children}</View>}
function LineChart({series,buckets,c}:{series:Series[];buckets:TimeBucket[];c:Palette}){
  const [width,setWidth]=useState(320),[selected,setSelected]=useState<number|null>(null),left=34,right=width-14,span=right-left,count=Math.max(buckets.length,1),x=(index:number)=>left+index*span/Math.max(count-1,1),point=(value:number,index:number)=>`${x(index)},${160-value/100*140}`,stride=Math.max(1,Math.ceil(count/Math.max(2,Math.floor(span/28))));
  const inspect=(index:number)=>setSelected(Math.max(0,Math.min(count-1,index)));
  return <View onLayout={event=>setWidth(event.nativeEvent.layout.width)}><Legend series={series} c={c}/>
    <Pressable accessible accessibilityRole="adjustable" accessibilityLabel={selected===null?t('score'):`${buckets[selected]?.key}: ${series.map(item=>`${item.habit.name} ${item.values[selected]?.toFixed(1)??'–'}%`).join(', ')}`} accessibilityActions={[{name:'increment'},{name:'decrement'}]} onAccessibilityAction={event=>inspect((selected??0)+(event.nativeEvent.actionName==='increment'?1:-1))} onPress={event=>inspect(Math.round((event.nativeEvent.locationX-left)/span*(count-1)))}>
    <NativeSvg width={width} height={196} viewBox={`0 0 ${width} 196`}>
      {[100,75,50,25,0].map(value=><React.Fragment key={value}><NativeLine x1={left} y1={160-value*1.4} x2={right} y2={160-value*1.4} stroke={c.line}/><NativeSvgText x={left-6} y={164-value*1.4} fill={c.muted} fontSize={11} textAnchor="end">{value}</NativeSvgText></React.Fragment>)}
      {series.map(item=><React.Fragment key={item.habit.id}>{item.previousValues&&<NativePolyline points={item.previousValues.map(point).join(' ')} fill="none" stroke={item.color} strokeOpacity=".45" strokeWidth="2" strokeDasharray="5 5"/>}<NativePolyline points={item.values.map(point).join(' ')} fill="none" stroke={item.color} strokeWidth="3"/>{item.values.map((value,index)=><NativeCircle key={index} cx={x(index)} cy={160-value*1.4} r={index===selected?5:3} fill={item.color}/>)}</React.Fragment>)}
      {buckets.map((bucket,index)=>(index%stride===0&&count-1-index>=stride||index===count-1)&&<NativeSvgText key={bucket.key} x={x(index)} y={181} fill={c.muted} fontSize={11} textAnchor={index===count-1?'end':index===0?'start':'middle'}>{bucket.label}</NativeSvgText>)}
    </NativeSvg></Pressable>
    {selected!==null&&buckets[selected]&&<Text accessibilityLiveRegion="polite" style={{color:c.text,fontSize:12}}>{buckets[selected].key}{series.map(item=>`\n${item.habit.emoji} ${item.habit.name}: ${item.values[selected]?.toFixed(1)??'–'}%`).join('')}</Text>}
  </View>;
}
function HistoryNavigation({period,anchor,today,window,onMove,c,score=false}:{period:InsightPeriod;anchor:string;today:string;window:{start:string;end:string};onMove:(amount:number)=>void;c:Palette;score?:boolean}){
  const current=score?buildScoreWindow(period as ScorePeriod,today,today).start===window.start:period==='week'?buildHistoryWindow('week',today,today).start===window.start:period==='quarter'?buildHistoryWindow('quarter',today,today).start===window.start:anchor.slice(0,4)===today.slice(0,4);
  const label=score?`${dateLabel(window.start)} – ${dateLabel(buildInsightWindow(period,anchor,'9999-12-31').end)}`:period==='week'?`${dateLabel(window.start)} – ${dateLabel(addDays(window.start,6))}`:period==='quarter'||period==='year'?`${window.start.slice(0,4)}–${anchor.slice(0,4)}`:anchor.slice(0,4);
  return <View style={s.historyNavigation}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('previousPeriod')} onPress={()=>onMove(-1)} style={({pressed})=>[s.historyNavButton,{backgroundColor:pressed?c.soft:'transparent'}]}><Ionicons name="chevron-back" size={18} color={c.text}/></Pressable>
    <Text accessibilityLiveRegion="polite" style={[s.historyRange,{color:c.muted}]}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={t('nextPeriod')} accessibilityState={{disabled:current}} disabled={current} onPress={()=>onMove(1)} style={({pressed})=>[s.historyNavButton,{backgroundColor:pressed?c.soft:'transparent',opacity:current?.3:1}]}><Ionicons name="chevron-forward" size={18} color={c.text}/></Pressable>
  </View>;
}
function BarChart({series,habits,buckets,period,type,c}:{series:Series[];habits:Habit[];buckets:TimeBucket[];period:InsightPeriod;type:Habit['type'];c:Palette}){
  const [width,setWidth]=useState(320),[selected,setSelected]=useState<number|null>(null),left=28,chartWidth=Math.max(width,32+buckets.length*series.length*12),right=chartWidth-4;
  const axis=historyAxis(series.flatMap(item=>item.values),type),slot=(right-left)/buckets.length;
  const format=(value:number)=>new Intl.NumberFormat(undefined,{maximumFractionDigits:Math.min(12,Math.max(0,-Math.floor(Math.log10(axis.step)))),notation:axis.max>=10000?'compact':'standard'}).format(value);
  return <View onLayout={event=>setWidth(event.nativeEvent.layout.width)}><Legend series={series} c={c}/><Text style={[s.historyUnit,{color:c.muted}]}>{t(axis.unit)}</Text>{series.length>1&&<Text style={{color:c.muted,fontSize:12}}>{t('historyComparisonHelp')}</Text>}
    <ScrollView horizontal showsHorizontalScrollIndicator={chartWidth>width}><NativeSvg accessible accessibilityLabel={`${t('history')}, ${t(axis.unit)}. ${buckets.map((bucket,index)=>`${bucket.label}: ${series.map(item=>`${item.habit.name}: ${item.values[index]/axis.divisor}`).join(', ')}`).join('; ')}`} onPress={(event:{nativeEvent:{locationX:number}})=>setSelected(Math.max(0,Math.min(buckets.length-1,Math.floor((event.nativeEvent.locationX-left)/slot))))} width={chartWidth} height={196} viewBox={`0 0 ${chartWidth} 196`}>
      {axis.ticks.map(value=>{const y=160-value/axis.max*140;return <React.Fragment key={value}><NativeLine x1={left} y1={y} x2={right} y2={y} stroke={c.line}/><NativeSvgText x={left-6} y={y+3} fill={c.muted} fontSize={11} textAnchor="end">{format(value)}</NativeSvgText></React.Fragment>})}
      {buckets.map((bucket,index)=>{
        const x=left+slot*(index+.5),groupWidth=slot*.8,barWidth=Math.min(22,groupWidth/Math.max(1,series.length));
        return <React.Fragment key={bucket.key}>{series.map((item,seriesIndex)=>{const value=item.values[index]/axis.divisor,height=value/axis.max*140;return value>0?<NativeRect key={item.habit.id} x={x-barWidth*series.length/2+seriesIndex*barWidth} y={160-height} width={Math.max(.5,barWidth-1)} height={height} fill={item.color}/>:null})}
          <NativeSvgText x={x} y={period==='month'||period==='quarter'?177:(index%2&&buckets.length>7?191:177)} fill={c.muted} fontSize={11} textAnchor="middle">{period==='month'?bucket.label.replace(/[.\s]/g,'').slice(0,3):period==='quarter'?`Q${bucket.key.slice(-1)}'${bucket.key.slice(2,4)}`:bucket.label.split("\'")[0]}</NativeSvgText>
        </React.Fragment>;
      })}
    </NativeSvg></ScrollView>
    {selected!==null&&<View accessibilityLiveRegion="polite" style={{gap:8}}><Text style={{color:c.muted,fontSize:12}}>{buckets[selected].key}</Text>{series.map(item=><View key={item.habit.id} style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={{fontSize:20}}>{item.habit.emoji}</Text><Text style={{color:c.text,flex:1,fontSize:12}}>{item.label??item.habit.name}</Text><Text style={{color:item.color,fontWeight:'700'}}>{type==='duration'?formatValue(type,item.values[selected]):new Intl.NumberFormat().format(item.values[selected])}</Text></View>)}</View>}
    {selected!==null&&<ScrollView style={{maxHeight:180,marginTop:12}} nestedScrollEnabled><Text style={{color:c.muted,fontSize:12}}>{t('historyRecordDetails')}</Text>{[...new Map(series.flatMap(item=>item.records?.[selected]??[]).map(e=>[e.id,e])).values()].map(entry=>{
      const recordHabit=habits.find(h=>h.id===entry.habitId)!,visible=recordHabit.isGeneral?habits.find(h=>h.id===recordHabit.parentId)!:recordHabit;
      const path:string[]=[];let node=recordHabit;while(node){path.unshift(node.isGeneral?t('branchDirectShort'):node.name);node=habits.find(h=>h.id===node.parentId)!}
      return <View key={entry.id} style={{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6}}><Text style={{fontSize:20}}>{visible.emoji}</Text><View style={{flex:1}}><Text style={{color:c.text,fontSize:12}}>{path.join(' › ')}</Text><Text style={{color:c.muted,fontSize:11}}>{entry.localDate}</Text></View><Text style={{color:c.text,fontWeight:'600'}}>{formatValue(type,entry.value)}</Text></View>;
    })}</ScrollView>}

  </View>;
}

function ActivityCalendar({habit,habits,entries,today,onEdit,color,onFilter,c}:{habit:Habit;habits:Habit[];entries:Entry[];today:string;onEdit:(date:string)=>void;color:string;onFilter:()=>void;c:Palette}){
  return <View style={[s.card,{backgroundColor:c.card}]}>
    <Header title={t('calendar')} habit={habit} onFilter={onFilter} c={c}/>
    <CalendarTimeline habit={habit} habits={habits} entries={entries} today={today} color={color} c={c} onOpenDate={onEdit}/>
  </View>;
}

function CalendarTimeline({habit,habits,entries,today,color,c,onSelectDate,onOpenDate,saving=false,cellSize=18,initialDate}:{habit:Habit;habits:Habit[];entries:Entry[];today:string;color:string;c:Palette;onSelectDate?:(date:string)=>void;onOpenDate?:(date:string)=>void;saving?:boolean;cellSize?:number;initialDate?:string}){
  const gap=3,step=cellSize+gap;
  const [firstMonth,setFirstMonth]=useState(()=>addMonths((initialDate??today).slice(0,7),-5));
  const scroll=useRef<ScrollView>(null),initialized=useRef(false),offset=useRef(0),loadingEarlier=useRef(false),pendingMonth=useRef<string|null>(null);
  const viewport=useRef(0),contentWidth=useRef(0);
  const monthStart=`${firstMonth}-01`,start=addDays(monthStart,-((new Date(`${monthStart}T12:00:00`).getDay()+6)%7));
  const monthEnd=addDays(`${addMonths(today.slice(0,7),1)}-01`,-1);
  const endWeekday=(new Date(`${monthEnd}T12:00:00`).getDay()+6)%7,end=addDays(monthEnd,6-endWeekday);
  const dates=useMemo(()=>{const result:string[]=[];for(let date=start;date<=end;date=addDays(date,1))result.push(date);return result},[start,end]);
  const active=useMemo(()=>activeDates(habit,habits,entries,dates),[habit,habits,entries,dates]);
  const weeks=Array.from({length:dates.length/7},(_,week)=>dates.slice(week*7,week*7+7));
  const initialize=()=>{
    if(initialized.current||!viewport.current||!contentWidth.current)return;
    initialized.current=true;
    if(initialDate){const index=dates.indexOf(initialDate);scroll.current?.scrollTo({x:calendarScrollOffset(Math.max(0,Math.floor(index/7)),step,cellSize,viewport.current,contentWidth.current),animated:false})}
    else scroll.current?.scrollToEnd({animated:false});
  };
  const loadEarlier=()=>{if(offset.current<4*step&&!loadingEarlier.current){loadingEarlier.current=true;setFirstMonth(month=>addMonths(month,-3))}};
  const move=(direction:number)=>{
    const visibleDate=weeks[Math.max(0,Math.min(weeks.length-1,Math.round(offset.current/step)))][0];
    const requested=addMonths(visibleDate.slice(0,7),direction),targetMonth=requested>today.slice(0,7)?today.slice(0,7):requested,targetDate=`${targetMonth}-01`;
    if(targetDate<start){pendingMonth.current=targetDate;loadingEarlier.current=true;setFirstMonth(addMonths(targetMonth,-2));return}
    const targetIndex=dates.findIndex(date=>date>=targetDate);
    scroll.current?.scrollTo({x:Math.floor(targetIndex/7)*step,animated:true});
  };
  return <View style={{flexDirection:'row'}}>
    {cellSize>18&&<View style={{paddingTop:34,width:22}}>{Array.from({length:7},(_,index)=><Text key={index} style={{height:step,lineHeight:cellSize,color:c.muted,fontSize:12}}>{new Intl.DateTimeFormat(undefined,{weekday:'narrow'}).format(new Date(2024,0,1+index))}</Text>)}</View>}
    <ScrollView ref={scroll} horizontal directionalLockEnabled showsHorizontalScrollIndicator={false} removeClippedSubviews
      style={s.chartBody} contentContainerStyle={{gap:gap}} maintainVisibleContentPosition={{minIndexForVisible:0}}
      onLayout={event=>{viewport.current=event.nativeEvent.layout.width;initialize()}}
      onContentSizeChange={width=>{
        contentWidth.current=width;
        loadingEarlier.current=false;
        if(pendingMonth.current){const index=dates.findIndex(date=>date>=pendingMonth.current!);pendingMonth.current=null;scroll.current?.scrollTo({x:Math.max(0,Math.floor(index/7)*step),animated:false})}
        else initialize();
      }}
      onScroll={event=>{offset.current=event.nativeEvent.contentOffset.x}} scrollEventThrottle={16}
      onScrollEndDrag={loadEarlier} onMomentumScrollEnd={loadEarlier}
      accessibilityRole="adjustable" accessibilityHint={t('swipeCalendar')}
      accessibilityActions={[{name:'increment',label:t('nextMonth')},{name:'decrement',label:t('previousMonth')}]}
      onAccessibilityAction={event=>move(event.nativeEvent.actionName==='increment'?1:-1)}>
      {weeks.map((week,index)=>{const monthDate=week.find(date=>date.endsWith('-01')&&date<=monthEnd);return <View key={week[0]} style={{width:cellSize}}>
        <View style={{height:18}}>{monthDate&&<Text numberOfLines={1} adjustsFontSizeToFit style={{position:'absolute',width:Math.min(84,(weeks.length-index)*step-gap),color:c.muted,fontSize:9,fontWeight:'700'}}>{calendarMonthLabel(monthDate,today)}</Text>}</View>
        <View style={{gap:gap}}>{week.map(date=>{const isFuture=date>today,isActive=!isFuture&&active.has(date);const label=`${habit.name}, ${date}: ${isActive?t('active'):t('inactive')}`,style={width:cellSize,height:cellSize,borderRadius:3,alignItems:'center' as const,justifyContent:'center' as const,backgroundColor:isActive?color:c.soft,opacity:isFuture?.3:1,borderWidth:date===initialDate?2:0,borderColor:c.text},number=<Text style={{fontSize:cellSize>18?14:7.5,fontWeight:'700',color:isActive?'white':c.muted}}>{Number(date.slice(-2))}</Text>;
          return onOpenDate?<TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityHint={t('openCalendarDay')} onPress={()=>onOpenDate(date)} key={date} style={style}>{number}</TouchableOpacity>:onSelectDate?<TouchableOpacity disabled={isFuture||saving||!!habit.archivedAt} accessibilityState={{disabled:isFuture||saving||!!habit.archivedAt,busy:saving}} onPress={()=>onSelectDate(date)} accessibilityRole="button" accessibilityHint={habit.type==='boolean'?t('ownRecordHint'):t('editDay')} accessibilityLabel={label} key={date} style={style}>{number}</TouchableOpacity>:<View accessible accessibilityLabel={label} key={date} style={style}>{number}</View>})}</View>
      </View>})}
    </ScrollView>
  </View>
}

function Streaks({habit,habits,entries,today,color,onFilter,c}:{habit:Habit;habits:Habit[];entries:Entry[];today:string;color:string;onFilter:()=>void;c:Palette}){const first=entries.reduce((min,e)=>e.localDate<min?e.localDate:min,today),count=Math.max(1,Math.round((new Date(`${today}T12:00:00`).getTime()-new Date(`${first}T12:00:00`).getTime())/86400000)+1),dates=Array.from({length:count},(_,i)=>addDays(first,i)),streaks=bestActivityStreaks(activeDates(habit,habits,entries,dates)),max=Math.max(...streaks.map(item=>item.length),1);return <View style={[s.card,{backgroundColor:c.card}]}><Header title={t('bestStreaks')} habit={habit} onFilter={onFilter} c={c}/><View style={[s.chartBody,{gap:8}]}>{streaks.length?streaks.map((item,index)=><View key={`${item.start}-${item.end}`} style={{gap:4}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={[s.streakDate,{color:c.muted}]}>{dateLabel(item.start)}</Text><Text style={{color:c.muted,fontSize:11}}>{dateLabel(item.end)}</Text></View><View style={s.streakTrack}><View style={[s.streakBar,{width:`${Math.max(28,item.length/max*100)}%`,backgroundColor:color,opacity:index?Math.max(.3,.72-index*.09):1}]}><Text style={s.streakCount}>{item.length}</Text></View></View></View>):<Text style={[s.empty,{color:c.muted}]}>{t('noStreaks')}</Text>}</View></View>}
function Frequency({habit,habits,entries,today,color,onFilter,c}:{habit:Habit;habits:Habit[];entries:Entry[];today:string;color:string;onFilter:()=>void;c:Palette}){
  const [firstMonth,setFirstMonth]=useState(()=>addMonths(today.slice(0,7),-12));
  const scroll=useRef<ScrollView>(null),initialized=useRef(false),offset=useRef(0),loadingEarlier=useRef(false);
  const step=44;
  const {months,rows}=useMemo(()=>buildFrequency(habit,habits,entries,today,firstMonth),[habit,habits,entries,today,firstMonth]);
  const weekdays=Array.from({length:7},(_,i)=>new Intl.DateTimeFormat(undefined,{weekday:'narrow'}).format(new Date(2024,0,1+i)));
  const monthLabel=(month:string)=>new Intl.DateTimeFormat(undefined,{month:'short',year:'2-digit'}).format(new Date(`${month}-01T12:00:00`));
  const loadEarlier=()=>{if(offset.current<step*2&&!loadingEarlier.current){loadingEarlier.current=true;setFirstMonth(month=>addMonths(month,-12))}};
  const move=(direction:number)=>{const x=offset.current+direction*step*3;if(x<0){if(!loadingEarlier.current){loadingEarlier.current=true;setFirstMonth(month=>addMonths(month,-12))}return}scroll.current?.scrollTo({x,animated:true})};
  return <View style={[s.card,{backgroundColor:c.card}]}>
    <Header title={t('frequency')} habit={habit} onFilter={onFilter} c={c}/>
    <View style={{flexDirection:'row',marginTop:16}}>
      <ScrollView ref={scroll} horizontal directionalLockEnabled showsHorizontalScrollIndicator={false} removeClippedSubviews maintainVisibleContentPosition={{minIndexForVisible:0}}
        onContentSizeChange={()=>{loadingEarlier.current=false;if(!initialized.current){initialized.current=true;scroll.current?.scrollToEnd({animated:false})}}}
        onScroll={event=>{offset.current=event.nativeEvent.contentOffset.x}} scrollEventThrottle={16} onScrollEndDrag={loadEarlier} onMomentumScrollEnd={loadEarlier}
        accessibilityRole="adjustable" accessibilityHint={t('swipeCalendar')} accessibilityActions={[{name:'increment',label:t('nextPeriod')},{name:'decrement',label:t('previousPeriod')}]} onAccessibilityAction={event=>move(event.nativeEvent.actionName==='increment'?1:-1)}>
        {months.map((month,index)=><View key={month.key} style={{width:step}}>
          {rows.map((row,rowIndex)=>{const cell=row[index];return <Pressable accessibilityRole="button" accessibilityLabel={`${monthLabel(month.key)}, ${weekdays[rowIndex]}: ${cell.count} / ${cell.possible} ${t('activeDays')}`} onPress={()=>Alert.alert(`${monthLabel(month.key)}, ${weekdays[rowIndex]}`,`${cell.count} / ${cell.possible} ${t('activeDays')}`)} key={rowIndex} style={{height:33,alignItems:'center',justifyContent:'center'}}>
            <View style={{width:cell.size,height:cell.size,borderRadius:cell.size/2,backgroundColor:color,opacity:.15+cell.intensity*.85}}/>
          </Pressable>})}
          <Text style={{color:c.muted,fontSize:10,textAlign:'center',marginTop:8}}>{monthLabel(month.key)}</Text>
        </View>)}
      </ScrollView>
      <View style={{width:20}}>{weekdays.map((day,index)=><Text key={index} style={{height:33,lineHeight:33,color:c.muted,fontSize:10,textAlign:'right'}}>{day}</Text>)}</View>
    </View>
  </View>;
}

const skeleton=StyleSheet.create({skeletonStack:{gap:16},skeletonCard:{height:360,borderRadius:23,padding:16,overflow:'hidden'},skeletonHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},skeletonTitle:{width:94,height:24,borderRadius:8},skeletonPill:{width:116,height:36,borderRadius:18},skeletonChart:{height:190,marginTop:28,position:'relative'},skeletonLine:{position:'absolute',left:0,right:0,height:2,borderRadius:1},skeletonControls:{height:44,borderRadius:18,marginTop:24},calendarSkeleton:{minHeight:360,paddingTop:28},skeletonWeekdays:{flexDirection:'row',justifyContent:'space-between',marginBottom:13},skeletonWeekday:{width:22,height:8,borderRadius:4},skeletonDays:{flexDirection:'row',flexWrap:'wrap',gap:6},skeletonDay:{width:'12.9%',aspectRatio:1,borderRadius:8},skeletonMonth:{width:86,height:12,borderRadius:6,alignSelf:'center',marginTop:24}});
const s=StyleSheet.create({page:{flex:1},content:{padding:20,paddingTop:12,paddingBottom:50},center:{flex:1,alignItems:'center',justifyContent:'center'},detailTop:{flexDirection:'row',alignItems:'center',gap:4},back:{width:28,height:44,marginLeft:-6,borderRadius:12,alignItems:'center',justifyContent:'center'},editButton:{width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center'},title:{fontSize:22,fontWeight:'700',flex:1},subtitle:{lineHeight:20,marginTop:5,marginBottom:18},card:{borderRadius:23,padding:16,marginBottom:16},chartBody:{marginTop:16},sectionHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},sectionTitle:{flexShrink:1,fontSize:20,fontWeight:'800'},filterButton:{maxWidth:'55%',minHeight:36,borderRadius:15,paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:5},filterButtonText:{fontSize:12,fontWeight:'700',flexShrink:1},periodControls:{flexDirection:'row',borderRadius:18,padding:3,marginTop:16},periodButton:{flex:1,minHeight:34,borderRadius:15,alignItems:'center',justifyContent:'center'},legend:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:16,marginBottom:4},legendItem:{flexDirection:'row',alignItems:'center',gap:5},legendDot:{width:9,height:9,borderRadius:5},difference:{minHeight:44,justifyContent:'center'},differences:{flexDirection:'row',flexWrap:'wrap',gap:14,marginTop:4},historyNavigation:{flexDirection:'row',alignItems:'center',gap:4},historyNavButton:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:14},historyRange:{flex:1,textAlign:'center',fontSize:11},historyUnit:{fontSize:10,marginTop:8},streakRow:{flexDirection:'row',alignItems:'center',gap:8},streakDate:{fontSize:11},streakTrack:{flex:1},streakBar:{minHeight:20,paddingVertical:2,borderRadius:6,alignItems:'center',justifyContent:'center'},streakCount:{color:'white',fontSize:11,fontWeight:'800'},empty:{paddingVertical:24,textAlign:'center'},overlay:{flex:1,backgroundColor:'#0008',justifyContent:'flex-end'},filterSheet:{maxHeight:'80%',borderTopLeftRadius:28,borderTopRightRadius:28,paddingHorizontal:20,paddingBottom:34},filterHeader:{flexDirection:'row',justifyContent:'space-between',marginBottom:14},filterTitle:{fontSize:19,fontWeight:'900'},filterRow:{minHeight:54,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,gap:10},filterEmoji:{fontSize:20},filterName:{fontSize:15,fontWeight:'700',flex:1}})
