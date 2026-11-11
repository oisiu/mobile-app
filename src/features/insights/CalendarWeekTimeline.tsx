import { calendarActivity,type CalendarFill } from '@/domain/calendarActivity';
import { Entry,Habit } from '@/domain/types';
import { useApp } from '@/features/AppProvider';
import { CalendarDayBackground } from '@/features/CalendarDayBackground';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { habitAccentPalette } from '@/theme/habitColors';
import { useEffect,useMemo,useRef } from 'react';
import { AccessibilityInfo,ActivityIndicator,Animated,FlatList,StyleSheet,TouchableOpacity,View } from 'react-native';
import { calendarMonthLabel } from './calendarLabels';
import { s,type Palette } from './detailStyles';
import { useCalendarNavigation } from './useCalendarNavigation';

type CalendarTimelineProps={
  habit:Habit;
  selected?:Habit[];
  habits:Habit[];
  entries:Entry[];
  today:string;
  color:string;
  c:Palette;
  onSelectDate?:(date:string)=>void;
  onOpenDate?:(date:string)=>void;
  saving?:boolean;
  savingDate?:string|null;
  cellSize?:number;
  initialDate?:string;
  loading?:boolean;
};

export function CalendarTimeline({habit,selected,habits,entries,today,color,c,onSelectDate,onOpenDate,saving=false,savingDate=null,cellSize=18,initialDate,loading=false}:CalendarTimelineProps){
  const {habits:originalHabits,entries:originalEntries}=useApp();
  const gap=3,step=cellSize+gap;
  const navigation=useCalendarNavigation(today,cellSize,initialDate);
  const {dates,weeks,monthEnd}=navigation;
  const names=(selected??[habit]).map(item=>item.name).join(', ');
  const activity=useMemo(()=>loading?new Map<string,CalendarFill[]>():calendarActivity(selected??[habit],habits,entries,dates,originalHabits,originalEntries),[loading,selected,habit,habits,entries,dates,originalHabits,originalEntries]);
  const fillOpacity=useRef(new Animated.Value(loading?0:1)).current;
  useEffect(()=>{
    if(loading){fillOpacity.setValue(0);return}
    let active=true;
    const reveal=(reduceMotion:boolean)=>{
      if(!active)return;
      if(reduceMotion)fillOpacity.setValue(1);
      else Animated.timing(fillOpacity,{toValue:1,duration:400,useNativeDriver:true}).start();
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(reveal,()=>reveal(true));
    const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',reduceMotion=>{
      if(reduceMotion){fillOpacity.stopAnimation();reveal(true)}
    });
    return()=>{active=false;fillOpacity.stopAnimation();subscription.remove()};
  },[loading,fillOpacity]);

  return <View style={{flexDirection:'row'}}>
    {cellSize>18&&<View style={{paddingTop:34,width:22}}>
      {Array.from({length:7},(_,index)=><Text key={index} style={{height:step,lineHeight:cellSize,color:c.muted,fontSize:12}}>
        {new Intl.DateTimeFormat(undefined,{weekday:'narrow'}).format(new Date(2024,0,1+index))}
      </Text>)}
    </View>}
    <FlatList ref={navigation.scroll} horizontal data={weeks} keyExtractor={week=>week[0]}
      initialNumToRender={cellSize>18?10:24} maxToRenderPerBatch={12} windowSize={5}
      initialScrollIndex={navigation.initialWeek}
      getItemLayout={(_,index)=>({length:step,offset:index*step,index})}
      // Native clipping can leave weeks detached after history is prepended.
      directionalLockEnabled showsHorizontalScrollIndicator={false} removeClippedSubviews={false}
      style={s.chartBody} ItemSeparatorComponent={()=><View style={{width:gap}}/>}
      maintainVisibleContentPosition={{minIndexForVisible:0}}
      onLayout={event=>navigation.onLayout(event.nativeEvent.layout.width)}
      onContentSizeChange={navigation.onContentSizeChange}
      onScroll={event=>navigation.onScroll(event.nativeEvent.contentOffset.x)} scrollEventThrottle={16}
      onScrollEndDrag={navigation.loadEarlier} onMomentumScrollEnd={navigation.loadEarlier}
      accessibilityRole="adjustable" accessibilityHint={t('swipeCalendar')}
      accessibilityActions={[{name:'increment',label:t('nextMonth')},{name:'decrement',label:t('previousMonth')}]}
      onAccessibilityAction={event=>{
        if(event.nativeEvent.actionName==='increment')navigation.moveMonth(1);
        else if(event.nativeEvent.actionName==='decrement')navigation.moveMonth(-1);
      }}
      renderItem={({item:week,index})=>{
        const monthDate=week.find(date=>date.endsWith('-01')&&date<=monthEnd);
        return <View style={{width:cellSize}}>
          <View style={{height:18}}>{monthDate&&<Text numberOfLines={1} adjustsFontSizeToFit style={{position:'absolute',width:Math.min(84,(weeks.length-index)*step-gap),color:c.muted,fontSize:9,fontWeight:'700'}}>
            {calendarMonthLabel(monthDate,today)}
          </Text>}</View>
          <View style={{gap}}>{week.map(date=><CalendarDay key={date}
            date={date} fills={date>today?[]:activity.get(date)??[]} names={names}
            habit={habit} today={today} color={color} c={c} cellSize={cellSize} initialDate={initialDate}
            fillOpacity={fillOpacity} loading={loading} saving={saving} savingDate={savingDate}
            onOpenDate={onOpenDate} onSelectDate={onSelectDate}
          />)}</View>
        </View>;
      }}
    />
  </View>;
}

type CalendarDayProps=Pick<CalendarTimelineProps,'habit'|'today'|'color'|'c'|'initialDate'|'onOpenDate'|'onSelectDate'>&{
  date:string;
  fills:CalendarFill[];
  names:string;
  fillOpacity:Animated.Value;
  cellSize:number;
  loading:boolean;
  saving:boolean;
  savingDate:string|null;
};

function CalendarDay({date,fills,names,habit,today,color,c,initialDate,onOpenDate,onSelectDate,fillOpacity,cellSize,loading,saving,savingDate}:CalendarDayProps){
  const isFuture=date>today,isActive=fills.length>0,below=fills.some(fill=>fill.opacity<1);
  const colors=fills.map(fill=>(fill.color?habitAccentPalette[fill.color]:color)+(fill.opacity<1?'4D':''));
  const label=`${names}, ${date}${loading?'':`: ${isActive?t('active'):t('inactive')}`}${below?', '+t('calendarBelowThreshold'):''}`;
  const style={
    width:cellSize,height:cellSize,borderRadius:3,overflow:'hidden' as const,
    alignItems:'center' as const,justifyContent:'center' as const,backgroundColor:c.soft,
    opacity:isFuture?.3:1,borderWidth:date===initialDate?2:0,borderColor:c.text,
  };
  const textStyle={fontSize:cellSize>18?14:7.5,fontWeight:'700' as const};
  const number=<>
    <Text style={[textStyle,{color:c.muted}]}>{Number(date.slice(-2))}</Text>
    {isActive&&<Animated.View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{opacity:fillOpacity,alignItems:'center',justifyContent:'center'}]}>
      <CalendarDayBackground colors={colors} opacity={1}/>
      <Text style={[textStyle,{color:below?c.text:c.onAccent}]}>{Number(date.slice(-2))}</Text>
    </Animated.View>}
  </>;
  if(onOpenDate)return <TouchableOpacity disabled={loading} accessibilityState={{disabled:loading,busy:loading}}
    accessibilityRole="button" accessibilityLabel={label} accessibilityHint={t('openCalendarDay')}
    onPress={()=>{if(!loading)onOpenDate(date)}} style={style}>
    {number}
  </TouchableOpacity>;
  if(onSelectDate){
    const disabled=isFuture||saving||!!habit.archivedAt;
    return <TouchableOpacity disabled={disabled} accessibilityState={{disabled,busy:saving}}
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityHint={habit.type==='boolean'?t('ownRecordHint'):t('editDay')}
      onPress={()=>{if(!disabled)onSelectDate(date)}} style={style}>
      {savingDate===date?<ActivityIndicator size="small" color={isActive?c.onAccent:c.accent}/>:number}
    </TouchableOpacity>;
  }
  return <View accessible accessibilityLabel={label} style={style}>{number}</View>;
}
