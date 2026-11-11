import { BucketSize } from '@/domain/analytics';
import { booleanAnalysis } from '@/domain/booleanAnalysis';
import { buildTimelineBuckets } from '@/domain/chartTimeline';
import { todayLocal } from '@/domain/entries';
import { visibleHabitSnapshot } from '@/domain/habitVisibility';
import { buildHistorySeries } from '@/domain/history';
import { Habit } from '@/domain/types';
import { PopoverAnchor } from '@/features/AnchoredPopover';
import { useApp } from '@/features/AppProvider';
import { MoveHabitButton } from '@/features/MoveHabitButton';
import { usePrefetchRoutes, useResponsiveNavigation } from '@/features/useResponsiveNavigation';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { habitAccent } from '@/theme/habitColors';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TouchableOpacity, View } from 'react-native';
import { ActivityCalendar } from './ActivityCalendar';
import { CalendarDialog } from './CalendarDialog';
import {
  ChartCard,
  extendTimelineCount,
  FilterModal,
  initialTimelineCount,
  selectionLabel,
  TimeGroupingMenu,
} from './DetailControls';
import { DeferredCardSkeleton } from './DetailSkeletons';
import { Frequency, Streaks } from './DetailStatistics';
import { HistoryChart } from './HistoryChart';
import { StrengthChart } from './StrengthChart';
import { s } from './detailStyles';
import { orderedCandidates } from './orderedCandidates';
import { useChartEntrance } from './useChartEntrance';

type FilterTarget = 'score' | 'history' | 'calendar' | 'streaks' | 'frequency';
type Series = { habit: Habit; color: string; values: number[] };
export default function InsightDetailScreen() {
  const [filterAnchor, setFilterAnchor] = useState<PopoverAnchor | null>(null);
  const { id, revealHidden } = useLocalSearchParams<{ id: string; revealHidden?: string }>(),
    { habits: allHabits, entries: allEntries, palette: c } = useApp(),
    { habits: storedHabits, entries: storedEntries } = useMemo(
      () => visibleHabitSnapshot(allHabits, allEntries, revealHidden === '1' ? id : undefined),
      [allHabits, allEntries, id, revealHidden],
    ),
    storedRoot = storedHabits.find(h => h.id === id),
    today = todayLocal();
  const [analysisMode, setAnalysisMode] = useState<{ id: string; boolean: boolean }>({ id, boolean: false }),
    booleanView = analysisMode.id === id && analysisMode.boolean && storedRoot?.type !== 'boolean';
  useEffect(() => setAnalysisMode({ id, boolean: false }), [id]);
  const { habits, entries } = useMemo(
      () =>
        booleanView ? booleanAnalysis(storedHabits, storedEntries) : { habits: storedHabits, entries: storedEntries },
      [booleanView, storedHabits, storedEntries],
    ),
    root = habits.find(h => h.id === id);
  const contentReady = useChartEntrance(id);
  usePrefetchRoutes(contentReady ? [`/habit/${id}`] : []);
  const candidates = useMemo(
    () => (root && contentReady ? orderedCandidates(habits, root) : []),
    [habits, root, contentReady],
  );
  const scoreInitial = useMemo(() => new Set([id]), [id]),
    historyInitial = useMemo(() => new Set([id]), [id]);
  const [historyScale, setHistoryScale] = useState<BucketSize>('day'),
    [historyCount, setHistoryCount] = useState(60);
  const historyBuckets = useMemo(
    () => buildTimelineBuckets(historyScale, today, historyCount),
    [historyScale, today, historyCount],
  );
  useEffect(() => {
    setHistoryScale('day');
    setHistoryCount(60);
  }, [id]);
  const [scoreScale, setScoreScale] = useState<BucketSize>('day'),
    [scoreCount, setScoreCount] = useState(60);
  const scoreBuckets = useMemo(
    () => buildTimelineBuckets(scoreScale, today, scoreCount),
    [scoreScale, today, scoreCount],
  );
  useEffect(() => {
    setScoreScale('day');
    setScoreCount(60);
  }, [id]);
  const [scoreIds, setScoreIds] = useState(scoreInitial),
    [historyIds, setHistoryIds] = useState(historyInitial),
    [calendarIds, setCalendarIds] = useState(() => new Set([id])),
    [calendarZoom, setCalendarZoom] = useState<string | null>(null),
    [streakId, setStreakId] = useState(id),
    [frequencyId, setFrequencyId] = useState(id),
    [filter, setFilter] = useState<FilterTarget | null>(null);
  const [calendarReady, setCalendarReady] = useState(false),
    [historyReady, setHistoryReady] = useState(false),
    [tailReady, setTailReady] = useState(false),
    navigation = useResponsiveNavigation();
  useEffect(() => {
    setCalendarReady(false);
    setHistoryReady(false);
    setTailReady(false);
  }, [id]);
  useEffect(() => {
    if (!contentReady) return;
    const task = requestIdleCallback(() => setCalendarReady(true), { timeout: 1000 });
    return () => cancelIdleCallback(task);
  }, [contentReady]);
  useEffect(() => {
    setScoreIds(new Set([id]));
    setHistoryIds(new Set([id]));
    setCalendarIds(new Set([id]));
    setStreakId(id);
    setFrequencyId(id);
  }, [id, today]);
  useEffect(() => {
    if (!contentReady || !root) return;
    const ids = new Set(candidates.map(habit => habit.id));
    const retain = (current: Set<string>) => {
      const next = [...current].filter(value => ids.has(value));
      if (!next.length) next.push(root.id);
      return next.length === current.size && next.every(value => current.has(value)) ? current : new Set(next);
    };
    setScoreIds(retain);
    setHistoryIds(retain);
    setCalendarIds(retain);
    setStreakId(value => (ids.has(value) ? value : root.id));
    setFrequencyId(value => (ids.has(value) ? value : root.id));
  }, [contentReady, root, candidates]);
  const viewport = useRef({ offset: 0, height: 0 });
  const revealSections = () => {
    if (!contentReady) return;
    const bottom = viewport.current.offset + viewport.current.height;
    if (bottom > 220) setHistoryReady(true);
    if (bottom > 700) setTailReady(true);
  };
  useEffect(() => {
    if (contentReady) {
      const bottom = viewport.current.offset + viewport.current.height;
      if (bottom > 220) setHistoryReady(true);
      if (bottom > 700) setTailReady(true);
    }
  }, [contentReady, id]);

  const historyData = useMemo(() => {
    if (!root || !historyReady) return [];
    const selected = [...(historyIds.size ? historyIds : new Set([root.id]))].map(
      habitId => candidates.find(habit => habit.id === habitId) ?? root,
    );
    return buildHistorySeries(selected, habits, entries, historyBuckets);
  }, [root, historyReady, historyIds, candidates, habits, entries, historyBuckets]);
  const scoreSelection = useMemo(() => {
    if (!root) return [];
    const selected = [...scoreIds].flatMap(habitId => {
      const habit = candidates.find(item => item.id === habitId);
      return habit ? [habit] : [];
    });
    return (selected.length ? selected : [root]).map(habit => ({ habit, color: habitAccent(habit, habits, c.accent) }));
  }, [scoreIds, candidates, root, habits, c.accent]);
  const calendarSelection = useMemo(() => {
    const selected = [...calendarIds].flatMap(habitId => {
      const item = candidates.find(habit => habit.id === habitId);
      return item ? [item] : [];
    });
    return selected.length ? selected : root ? [root] : [];
  }, [calendarIds, candidates, root]);
  const storedCalendarSelection = useMemo(
    () => calendarSelection.map(item => storedHabits.find(habit => habit.id === item.id) ?? item),
    [calendarSelection, storedHabits],
  );
  if (!root)
    return (
      <View style={[s.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>{t('categoryNotFound')}</Text>
      </View>
    );
  const candidate = (habitId: string) => candidates.find(h => h.id === habitId) ?? root,
    colorFor = (habitId: string) => habitAccent(candidate(habitId), habits, c.accent);
  const historySeries: Series[] = historyData.map(item => ({ ...item, color: colorFor(item.habit.id) }));
  const currentSingle = filter === 'streaks' ? streakId : frequencyId;
  const setSingle = (habitId: string) => {
    if (filter === 'streaks') setStreakId(habitId);
    else setFrequencyId(habitId);
    setFilter(null);
  };
  const toggleMulti = (habitId: string) => {
    const setter = filter === 'score' ? setScoreIds : filter === 'calendar' ? setCalendarIds : setHistoryIds;
    setter(current => {
      const next = new Set(current);
      if (next.has(habitId) && next.size > 1) next.delete(habitId);
      else next.add(habitId);
      return next;
    });
  };
  const calendarHabits = calendarSelection,
    calendarHabit = calendarHabits[0] ?? root;
  const editHref = `/habit/${root.id}`,
    editing = navigation.pending === editHref;
  return (
    <>
      <ScrollView
        style={[s.page, { backgroundColor: c.bg }]}
        contentContainerStyle={s.content}
        scrollEventThrottle={64}
        onLayout={event => {
          viewport.current.height = event.nativeEvent.layout.height;
          revealSections();
        }}
        onScroll={event => {
          viewport.current.offset = event.nativeEvent.contentOffset.y;
          revealSections();
        }}
      >
        <View style={s.detailTop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back')}
            hitSlop={{ left: 12, right: 4 }}
            onPress={() => router.back()}
            style={({ pressed }) => [s.back, { backgroundColor: pressed ? c.soft : 'transparent' }]}
          >
            {({ pressed }) => <Ionicons name="chevron-back" size={16} color={pressed ? c.text : c.muted} />}
          </Pressable>
          <Text accessibilityRole="header" style={[s.title, { color: c.text }]}>
            {root.emoji} {root.name}
          </Text>
          <MoveHabitButton habit={root} />
          <Pressable
            disabled={navigation.pending !== null}
            accessibilityRole="button"
            accessibilityLabel={`${t('edit')} ${root.name}`}
            accessibilityState={{ busy: editing, disabled: navigation.pending !== null }}
            onPress={() => navigation.push(editHref)}
            style={({ pressed }) => [s.editButton, { backgroundColor: pressed ? c.soft : 'transparent' }]}
          >
            {({ pressed }) =>
              editing ? (
                <ActivityIndicator size="small" color={c.accent} />
              ) : (
                <Ionicons name="pencil-outline" size={16} color={pressed ? c.text : c.muted} />
              )
            }
          </Pressable>
        </View>
        <Text style={[s.subtitle, { color: c.muted }]}>{t('detailIntro')}</Text>
        {storedRoot && storedRoot.type !== 'boolean' && (
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('analysisView')}
            style={[s.periodControls, { backgroundColor: c.soft, marginTop: 0, marginBottom: 16 }]}
          >
            {[false, true].map(boolean => {
              const selected = boolean === booleanView,
                label = boolean ? t('activity') : t(storedRoot.type);
              return (
                <TouchableOpacity
                  key={String(boolean)}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ selected }}
                  onPress={() => setAnalysisMode({ id, boolean })}
                  style={[s.periodButton, selected && { backgroundColor: c.accent }]}
                >
                  <Text style={{ color: selected ? c.onAccent : c.text, fontWeight: '700' }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ minHeight: 376 }}>
          <ChartCard
            chart="score"
            label={selectionLabel(scoreIds, candidates)}
            onFilter={anchor => {
              setFilterAnchor(anchor ?? null);
              setFilter('score');
            }}
            c={c}
            loading={!contentReady}
            headerControl={
              <TimeGroupingMenu
                key={id}
                pill
                scale={scoreScale}
                label={t('consistencyGrouping')}
                onChoose={scale => {
                  setScoreScale(scale);
                  setScoreCount(initialTimelineCount(scale));
                }}
                c={c}
              />
            }
          >
            <StrengthChart
              key={`${id}-${scoreScale}`}
              loading={!contentReady}
              animateEntrance
              habit={storedRoot!}
              buckets={scoreBuckets}
              bucketSize={scoreScale}
              selected={scoreSelection}
              habits={storedHabits}
              entries={storedEntries}
              today={today}
              c={c}
              timeline
              onLoadEarlier={() => setScoreCount(count => extendTimelineCount(scoreScale, count))}
            />
          </ChartCard>
        </View>
        <View style={{ minHeight: 266 }}>
          <ActivityCalendar
            key={id}
            loading={!contentReady || !calendarReady}
            selected={calendarHabits}
            label={selectionLabel(calendarIds, candidates)}
            habit={calendarHabit}
            habits={habits}
            entries={entries}
            today={today}
            onEdit={setCalendarZoom}
            color={c.accent}
            onFilter={anchor => {
              setFilterAnchor(anchor ?? null);
              setFilter('calendar');
            }}
            c={c}
          />
        </View>
        {contentReady && historyReady ? (
          <ChartCard
            chart="history"
            label={selectionLabel(historyIds, candidates)}
            onFilter={anchor => {
              setFilterAnchor(anchor ?? null);
              setFilter('history');
            }}
            c={c}
            headerControl={
              <TimeGroupingMenu
                key={id}
                pill
                scale={historyScale}
                label={t('historyGrouping')}
                onChoose={scale => {
                  setHistoryScale(scale);
                  setHistoryCount(initialTimelineCount(scale));
                }}
                c={c}
              />
            }
          >
            <HistoryChart
              key={historyScale}
              series={historySeries}
              buckets={historyBuckets}
              bucketSize={historyScale}
              type={root.type}
              c={c}
              timeline
              showValues
              onLoadEarlier={() => setHistoryCount(count => extendTimelineCount(historyScale, count))}
            />
          </ChartCard>
        ) : (
          <DeferredCardSkeleton c={c} chart="history" />
        )}

        {contentReady && tailReady ? (
          <>
            <Streaks
              habit={candidate(streakId)}
              habits={habits}
              entries={entries}
              today={today}
              color={colorFor(streakId)}
              onFilter={anchor => {
                setFilterAnchor(anchor ?? null);
                setFilter('streaks');
              }}
              c={c}
            />
            <Frequency
              habit={candidate(frequencyId)}
              habits={habits}
              entries={entries}
              today={today}
              color={colorFor(frequencyId)}
              onFilter={anchor => {
                setFilterAnchor(anchor ?? null);
                setFilter('frequency');
              }}
              c={c}
            />
          </>
        ) : (
          <>
            <DeferredCardSkeleton c={c} chart="bestStreaks" />
            <DeferredCardSkeleton c={c} chart="frequency" />
          </>
        )}
      </ScrollView>
      <FilterModal
        anchor={filterAnchor}
        filter={filter}
        setFilter={setFilter}
        candidates={candidates}
        scoreIds={scoreIds}
        historyIds={historyIds}
        calendarIds={calendarIds}
        currentSingle={currentSingle}
        toggleMulti={toggleMulti}
        setSingle={setSingle}
        c={c}
      />
      {calendarZoom !== null && (
        <CalendarDialog
          initialDate={calendarZoom}
          calendarHabits={storedCalendarSelection}
          booleanView={booleanView}
          color={c.accent}
          onClose={() => setCalendarZoom(null)}
        />
      )}
    </>
  );
}
