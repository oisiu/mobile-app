import { HOME_VISIBLE_DAYS } from './dateWindow';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Animated,View } from 'react-native';
import { HomeDateCells } from './HomeDayCells';
import { s,type Palette } from './homeStyles';
import type { useHomeDates } from './useHomeDates';

type Props={timeline:ReturnType<typeof useHomeDates>;today:string;c:Palette};
export function HomeDateHeader({timeline,today,c}:Props){
  const {anchor,dayWidth,historyDays,chunks,range,dateScroll,onDateScroll,finishDateScroll,moveDates}=timeline;
  const month=new Intl.DateTimeFormat(undefined,{month:'long',...(anchor.slice(0,4)!==today.slice(0,4)?{year:'numeric' as const}:{})}).format(new Date(`${anchor}T12:00:00`));
  return <View style={s.week}>
    <View style={[s.dateLabelSpacer,{backgroundColor:c.bg}]}>
      <Text style={{color:c.muted,textTransform:'capitalize'}}>{month}</Text>
    </View>
    <Animated.ScrollView ref={dateScroll} horizontal nestedScrollEnabled directionalLockEnabled bounces={false}
      overScrollMode="never" removeClippedSubviews={false} showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
      onScroll={onDateScroll} onScrollEndDrag={finishDateScroll} onMomentumScrollEnd={finishDateScroll}
      style={[s.dateHeader,{width:dayWidth*HOME_VISIBLE_DAYS}]} contentContainerStyle={{width:historyDays*dayWidth}}
      accessible accessibilityRole="adjustable" accessibilityHint={t('swipeHomeDates')}
      accessibilityActions={[{name:'increment',label:t('nextPeriod')},{name:'decrement',label:t('previousPeriod')}]}
      onAccessibilityAction={event=>{
        if(event.nativeEvent.actionName==='increment')moveDates(5);
        else if(event.nativeEvent.actionName==='decrement')moveDates(-5);
      }}>
      <View style={{width:range.start*dayWidth}}/>
      {chunks.map(dates=><HomeDateCells key={dates[0]} dates={dates} today={today} c={c} dayWidth={dayWidth}/>)}
      <View style={{width:(historyDays-range.end)*dayWidth}}/>
    </Animated.ScrollView>
  </View>;
}
