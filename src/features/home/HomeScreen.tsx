import { todayLocal } from '@/domain/entries';
import { buildTree } from '@/domain/tree';
import { useApp } from '@/features/AppProvider';
import { HiddenCategories } from '@/features/settings/HiddenCategories';
import { usePrefetchRoutes,useResponsiveNavigation } from '@/features/useResponsiveNavigation';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { useMemo,useState } from 'react';
import { ActivityIndicator,FlatList,View } from 'react-native';
import { HomeDateHeader } from './HomeDateHeader';
import { HomeHabitRow } from './HomeHabitRow';
import { HomeHeader } from './HomeHeader';
import { HomeEntryDialogs } from './HomeEntryDialogs';
import { homeDayValues,visibleHomeHabits } from './homeMatrix';
import { s } from './homeStyles';
import { HABIT_COLUMN_WIDTH } from './dateWindow';
import { useHomeDates } from './useHomeDates';
import { useHomeEntries } from './useHomeEntries';
import { useHomeOrdering } from './useHomeOrdering';
import { useHiddenCategoriesReveal } from './useHiddenCategoriesReveal';

export default function HomeScreen(){
  const {ready,error,habits,entries,showSuccess,palette:c}=useApp(),today=todayLocal();
  const [width,setWidth]=useState(0),[expanded,setExpanded]=useState(new Set<string>());
  const allTree=useMemo(()=>buildTree(habits),[habits]);
  const tree=useMemo(()=>allTree.filter(habit=>!habit.isHidden),[allTree]);
  const visibleHabits=useMemo(()=>visibleHomeHabits(tree,expanded),[tree,expanded]);
  const navigation=useResponsiveNavigation(),timeline=useHomeDates(today,width);
  const ordering=useHomeOrdering(tree,visibleHabits),editing=useHomeEntries(today);
  const dayValues=useMemo(()=>homeDayValues(visibleHabits,habits,entries,timeline.days),[visibleHabits,habits,entries,timeline.days]);
  usePrefetchRoutes(visibleHabits.map(({habit})=>`/insight/${habit.id}`));

  const hiddenReveal=useHiddenCategoriesReveal(showSuccess);

  if(!ready)return <View style={[s.center,{backgroundColor:c.bg}]}><ActivityIndicator color={c.accent}/></View>;
  if(error)return <View style={s.center}><Text>{error}</Text></View>;
  return <View onLayout={event=>setWidth(event.nativeEvent.layout.width)} style={[s.page,{backgroundColor:c.bg}]}>
    <HomeHeader c={c} firstDay={timeline.firstDay} goToToday={timeline.goToToday}
      showHiddenCategories={hiddenReveal.visible} toggleHiddenCategories={hiddenReveal.toggle} tapTitle={hiddenReveal.tapTitle}
      pending={navigation.pending} push={navigation.push}/>
    {width>HABIT_COLUMN_WIDTH&&<View style={s.timeline}>
      <HomeDateHeader timeline={timeline} today={today} c={c}/>
      <FlatList scrollEnabled={!ordering.drag&&!ordering.ordering} nestedScrollEnabled directionalLockEnabled
        removeClippedSubviews={false} style={s.habitList} contentContainerStyle={{paddingBottom:30}}
        data={visibleHabits} keyExtractor={({habit})=>habit.id} initialNumToRender={12} maxToRenderPerBatch={10} windowSize={7}
        renderItem={({item})=><HomeHabitRow item={item} tree={tree} habits={habits} expanded={expanded} setExpanded={setExpanded}
          ordering={ordering} pending={navigation.pending} push={navigation.push} today={today} c={c}
          chunks={timeline.chunks} dayWidth={timeline.dayWidth} historyDays={timeline.historyDays}
          start={timeline.range.start} end={timeline.range.end} dateTrackX={timeline.dateTrackX} values={dayValues.get(item.habit.id)}
          onToggle={editing.toggle} onBranch={editing.openBranch}/>
        }
        ListFooterComponent={hiddenReveal.visible?<HiddenCategories variant="list" onOpenDetail={hiddenReveal.openDetail}/>:null}
        ListEmptyComponent={!allTree.length?<Text style={[s.empty,{color:c.muted}]}>{t('homeEmpty')}</Text>:null}/>
    </View>}
    <HomeEntryDialogs editing={editing}/>
  </View>;
}
