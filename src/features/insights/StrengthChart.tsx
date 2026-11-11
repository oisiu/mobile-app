import { BucketSize, TimeBucket } from '@/domain/analytics';
import { dayBucketContext } from '@/domain/chartTimeline';
import { habitStrength, strengthSummary } from '@/domain/habitStrength';
import { Entry, Habit } from '@/domain/types';
import { t } from '@/i18n';
import { light } from '@/theme';
import { SvgText } from '@/theme/SvgTypography';
import { Text } from '@/theme/Typography';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useRevealAnimation } from '@/features/useRevealAnimation';
import { highlightOpacity, PLOT_HEIGHT, shortMonthLabel, startsNewYear, toggledHighlight } from './chartShared';
import { tileIndexRange, timelineTiles, useTimelineTiles, type TimelineTile } from './timelineTiles';
import { useTimelineScroll } from './useTimelineScroll';

type Props = {
  habit: Habit;
  selected: { habit: Habit; color: string }[];
  habits: Habit[];
  entries: Entry[];
  today: string;
  buckets: TimeBucket[];
  bucketSize: BucketSize;
  c: typeof light;
  showSummary?: boolean;
  showPoints?: boolean;
  highlightedId?: string | null;
  onHighlight?: (id: string | null) => void;
  timeline?: boolean;
  onLoadEarlier?: () => void;
  loading?: boolean;
  animateEntrance?: boolean;
};

type Point = { x: number; y: number };

const AXIS_WIDTH = 42;
const GRID_VALUES = [100, 80, 60, 40, 20, 0];
const SUMMARY_LABELS = ['score', 'month', 'year', 'total'] as const;
// Labels are centered on their bucket, so each tile also draws labels just outside its edges.
const LABEL_MARGIN = 80;
const timelineSlot = (bucketSize: BucketSize) => (bucketSize === 'day' ? 32 : bucketSize === 'week' ? 60 : 52);
const y = (value: number) => 160 - value * 1.4;

const percent = (value: number, signed = false) =>
  new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 0,
    signDisplay: signed ? 'always' : 'auto',
  }).format(value / 100);

/** Runs the left-to-right entrance draw; returns its 0–1 progress. */
function useDrawProgress(enabled: boolean, loading: boolean) {
  const [drawProgress, setDrawProgress] = useState(enabled ? 0 : 1);
  const waiting = loading || !enabled;
  const progress = useRevealAnimation({
    waiting,
    initial: enabled ? 0 : 1,
    timing: { delay: 600, duration: 600, useNativeDriver: false },
    onShown: () => setDrawProgress(1),
  });
  useEffect(() => {
    if (waiting) return;
    const listener = progress.addListener(({ value }) => setDrawProgress(value));
    return () => progress.removeListener(listener);
  }, [waiting, progress]);
  return drawProgress;
}

export function StrengthChart({
  habit,
  selected,
  habits,
  entries,
  today,
  buckets,
  bucketSize,
  c,
  showSummary = true,
  showPoints = true,
  highlightedId = null,
  onHighlight,
  timeline = false,
  onLoadEarlier,
  loading = false,
  animateEntrance = false,
}: Props) {
  const [width, setWidth] = useState(320);
  const summary = useMemo(
    () => (showSummary && !loading ? strengthSummary(habit, habits, entries, today) : null),
    [showSummary, loading, habit, habits, entries, today],
  );
  const series = useMemo(
    () =>
      loading ? [] : selected.map(item => ({ ...item, values: habitStrength(item.habit, habits, entries, buckets) })),
    [loading, selected, habits, entries, buckets],
  );
  const timelineScroll = useTimelineScroll(buckets, onLoadEarlier);
  const tileWindow = useTimelineTiles();
  const drawProgress = useDrawProgress(animateEntrance, loading);

  const count = buckets.length;
  const plotWidth = timeline ? Math.max(width, count * timelineSlot(bucketSize) + 56) : width;
  const left = timeline && bucketSize !== 'day' ? 8 : AXIS_WIDTH;
  const right = plotWidth - 14;
  const span = Math.max(1, right - left);
  const step = span / Math.max(1, count - 1);
  const x = (index: number) => left + step * index;
  const stride = timeline
    ? 1
    : bucketSize === 'month'
      ? count <= 3
        ? 1
        : 3
      : Math.max(1, Math.ceil(count / Math.max(2, Math.floor(span / 32))));
  const revealX = plotWidth - Math.max(0, width - (timeline ? AXIS_WIDTH : 0)) * (1 - drawProgress);
  const dimmed = (id: string) => highlightOpacity(highlightedId, id);
  const toggleHighlight = (id: string) =>
    onHighlight ? () => onHighlight(toggledHighlight(highlightedId, id)) : undefined;

  /** The drawn part of one line between bucket indices, cut at the entrance reveal edge. */
  const linePoints = (values: number[], first: number, last: number) => {
    const points: Point[] = [];
    for (let index = first; index <= last; index++) {
      if (buckets[index].dates.size) points.push({ x: x(index), y: y(values[index]) });
    }
    const visible = points.filter(point => point.x <= revealX);
    const next = points.find(point => point.x > revealX);
    const previous = visible.at(-1);
    if (next && previous) {
      const slope = (next.y - previous.y) / (next.x - previous.x);
      visible.push({ x: revealX, y: previous.y + slope * (revealX - previous.x) });
    }
    return visible.map(point => `${point.x},${point.y}`).join(' ');
  };

  const showsLabel = (index: number) =>
    bucketSize === 'month'
      ? index % stride === 0
      : index === 0 || index === count - 1 || (index % stride === 0 && count - 1 - index >= stride);
  const hasYearContext = bucketSize === 'month' || bucketSize === 'quarter' || bucketSize === 'week';

  const bucketLabels = (index: number) => {
    const bucket = buckets[index];
    const label = bucketSize === 'month' ? shortMonthLabel(bucket.label) : bucket.label;
    const anchor = bucketSize === 'day' ? 'middle' : index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle';
    const dayContext = bucketSize === 'day' ? dayBucketContext(buckets, index) : null;
    return (
      <React.Fragment key={bucket.key}>
        {showsLabel(index) && (
          <SvgText x={x(index)} y={178} textAnchor={anchor} fill={c.muted} fontSize={bucketSize === 'month' ? 9 : 11}>
            {label}
          </SvgText>
        )}
        {hasYearContext && startsNewYear(buckets, index) && (
          <SvgText x={x(index)} y={194} textAnchor={index === 0 ? 'start' : 'middle'} fill={c.muted} fontSize={11}>
            {bucket.key.slice(0, 4)}
          </SvgText>
        )}
        {dayContext && (
          <SvgText x={x(index)} y={194} textAnchor="middle" fill={c.muted} fontSize={11}>
            {dayContext}
          </SvgText>
        )}
      </React.Fragment>
    );
  };

  const accessibleSummary = (first: number, last: number) => {
    const parts: string[] = [];
    for (let index = first; index <= last; index++) {
      if (!buckets[index].dates.size) continue;
      const values = series.map(item => `${item.habit.name} ${percent(item.values[index])}`).join(', ');
      parts.push(`${buckets[index].key}: ${values}`);
    }
    return `${t('score')}. ${parts.join('; ')}`;
  };

  const renderPlot = (tile: TimelineTile) => {
    // Lines need the neighbouring point on each side to stay continuous across tiles.
    const drawn = tileIndexRange(tile, left, step, count, LABEL_MARGIN);
    const owned = tileIndexRange(tile, left, step, count, 0);
    const lineFirst = Math.max(0, drawn.first - 1);
    const lineLast = Math.min(count - 1, drawn.last + 1);
    const indices = Array.from(
      { length: Math.max(0, drawn.last - drawn.first + 1) },
      (_, offset) => drawn.first + offset,
    );
    return (
      <Svg
        key={tile.fromEnd}
        accessible
        accessibilityState={{ busy: loading }}
        accessibilityLabel={accessibleSummary(owned.first, owned.last)}
        width={tile.width}
        height={PLOT_HEIGHT}
        viewBox={`${tile.x} 0 ${tile.width} ${PLOT_HEIGHT}`}
      >
        {GRID_VALUES.map(value => (
          <React.Fragment key={value}>
            <Line x1={left} x2={right} y1={y(value)} y2={y(value)} stroke={c.line} />
            {!timeline && (
              <SvgText x={left - 8} y={y(value) + 4} textAnchor="end" fill={c.muted} fontSize={10}>
                {`${value}%`}
              </SvgText>
            )}
          </React.Fragment>
        ))}
        {series.map(item => (
          <React.Fragment key={item.habit.id}>
            <Polyline
              onPress={toggleHighlight(item.habit.id)}
              points={linePoints(item.values, lineFirst, lineLast)}
              fill="none"
              stroke={item.color}
              strokeWidth={highlightedId === item.habit.id ? 4 : 2}
              opacity={dimmed(item.habit.id)}
            />
            {showPoints &&
              indices.map(
                index =>
                  buckets[index].dates.size > 0 &&
                  x(index) <= revealX && (
                    <Circle
                      key={buckets[index].key}
                      cx={x(index)}
                      cy={y(item.values[index])}
                      r={highlightedId === item.habit.id ? 5 : 3.5}
                      opacity={dimmed(item.habit.id)}
                      fill={item.color}
                    />
                  ),
              )}
          </React.Fragment>
        ))}
        {indices.map(bucketLabels)}
      </Svg>
    );
  };

  const stats = summary
    ? [
        { label: t('score'), value: percent(summary.current), accessible: t('strengthCurrent') },
        { label: t('month'), value: percent(summary.monthChange, true), accessible: t('strengthMonthChange') },
        { label: t('year'), value: percent(summary.yearChange, true), accessible: t('strengthYearChange') },
        { label: t('total'), value: new Intl.NumberFormat().format(summary.total), accessible: t('strengthTotal') },
      ]
    : loading
      ? SUMMARY_LABELS.map(label => ({ label: t(label), value: '', accessible: '' }))
      : [];

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    timelineScroll.onScroll(event);
    tileWindow.onScroll(event);
  };

  return (
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {showSummary && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, marginBottom: 8 }}>
          {stats.map(stat => (
            <View
              key={stat.label}
              accessible={!loading}
              accessibilityLabel={loading ? undefined : `${stat.accessible}: ${stat.value}`}
              style={{ flexGrow: 1, minWidth: 56, alignItems: 'center' }}
            >
              {loading ? (
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel={stat.label}
                  style={{ width: 40, height: 23, borderRadius: 6, backgroundColor: c.soft }}
                />
              ) : (
                <Text style={{ color: c.accent, fontSize: 19, fontWeight: '700' }}>{stat.value}</Text>
              )}
              <Text style={{ color: c.muted, fontSize: 11 }}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}
      {timeline ? (
        <View>
          <Svg width={AXIS_WIDTH} height={PLOT_HEIGHT} style={{ position: 'absolute', left: 0, top: 0 }}>
            {GRID_VALUES.map(value => (
              <SvgText key={value} x={34} y={y(value) + 4} textAnchor="end" fill={c.muted} fontSize={10}>
                {`${value}%`}
              </SvgText>
            ))}
          </Svg>
          <ScrollView
            style={{ marginLeft: AXIS_WIDTH }}
            {...timelineScroll}
            onScroll={onScroll}
            horizontal
            bounces={false}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={32}
            accessibilityLabel={t('consistencyTimeline')}
          >
            {timelineTiles(plotWidth).map(tile =>
              tileWindow.isMounted(tile) ? (
                renderPlot(tile)
              ) : (
                <View key={tile.fromEnd} style={{ width: tile.width, height: PLOT_HEIGHT }} />
              ),
            )}
          </ScrollView>
        </View>
      ) : (
        renderPlot({ fromEnd: 0, x: 0, width: plotWidth })
      )}
    </View>
  );
}
