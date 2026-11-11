import { BucketSize, TimeBucket } from '@/domain/analytics';
import { dayBucketContext } from '@/domain/chartTimeline';
import { historyAxis } from '@/domain/history';
import { Habit } from '@/domain/types';
import { t } from '@/i18n';
import { light } from '@/theme';
import { SvgText } from '@/theme/SvgTypography';
import { Text } from '@/theme/Typography';
import React, { useState } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { historyLayout } from './historyLayout';
import { tileIndexRange, timelineTiles, useTimelineTiles, type TimelineTile } from './timelineTiles';
import { useTimelineScroll } from './useTimelineScroll';

type Series = { habit: Habit; color: string; values: number[] };

type Props = {
  series: Series[];
  buckets: TimeBucket[];
  bucketSize: BucketSize;
  type: Habit['type'];
  c: typeof light;
  showLegend?: boolean;
  highlightedId?: string | null;
  onHighlight?: (id: string | null) => void;
  timeline?: boolean;
  showValues?: boolean;
  onLoadEarlier?: () => void;
};

const PLOT_HEIGHT = 202;
const BASELINE = 160;
const BAR_AREA = 140;
// Bars and centered labels near a tile edge are drawn by both neighbouring tiles.
const TILE_MARGIN = 80;

export function HistoryChart({
  series,
  buckets,
  bucketSize,
  type,
  c,
  showLegend = true,
  highlightedId = null,
  onHighlight,
  timeline = false,
  showValues = false,
  onLoadEarlier,
}: Props) {
  const [width, setWidth] = useState(320);
  const count = buckets.length;
  const totals = buckets.map((_, index) => series.reduce((sum, item) => sum + item.values[index], 0));
  const axis = historyAxis(totals, type);
  const formatTick = (value: number) =>
    new Intl.NumberFormat(undefined, {
      maximumFractionDigits: Math.min(12, Math.max(0, -Math.floor(Math.log10(axis.step)))),
      notation: axis.max >= 10000 ? 'compact' : 'standard',
    }).format(value);
  const formatTotal = (value: number) =>
    new Intl.NumberFormat(undefined, {
      maximumSignificantDigits: 4,
      notation: value >= 10000 ? 'compact' : 'standard',
    }).format(value);
  const timelineScroll = useTimelineScroll(buckets, onLoadEarlier);
  const tileWindow = useTimelineTiles();
  const { left, scrollable, plotStart, plotWidth, right, slot, labelStride, barWidth } = historyLayout({
    width,
    bucketSize,
    timeline,
    showValues,
    count,
    valueLabels: totals.filter(value => value > 0).map(value => formatTotal(value / axis.divisor)),
    tickLabels: axis.ticks.map(formatTick),
  });
  const grouped = bucketSize === 'month' || bucketSize === 'quarter';
  const barHeight = (value: number) => (value / axis.divisor / axis.max) * BAR_AREA;
  const x = (index: number) => plotStart + slot * (index + 0.5);
  const dimmed = (id: string) => (highlightedId && highlightedId !== id ? 0.22 : 1);
  const toggleHighlight = (id: string) =>
    onHighlight ? () => onHighlight(highlightedId === id ? null : id) : undefined;

  const showsLabel = (index: number) =>
    grouped
      ? index % labelStride === 0
      : index === 0 || index === count - 1 || (index % labelStride === 0 && count - 1 - index >= labelStride);
  const startsYear = (index: number) =>
    index === 0 || buckets[index].key.slice(0, 4) !== buckets[index - 1].key.slice(0, 4);
  const bucketLabel = (bucket: TimeBucket) => {
    if (bucketSize === 'quarter' && !timeline) return t('quarterShort', { number: bucket.label });
    return grouped ? bucket.label.replace(/[.\s]/g, '').slice(0, 3) : bucket.label;
  };

  const renderBucket = (index: number) => {
    const bucket = buckets[index];
    const center = x(index);
    const dayContext = bucketSize === 'day' ? dayBucketContext(buckets, index) : null;
    let stacked = 0;
    return (
      <React.Fragment key={bucket.key}>
        {series.map(item => {
          const height = barHeight(item.values[index]);
          stacked += height;
          if (item.values[index] <= 0) return null;
          const highlighted = highlightedId === item.habit.id;
          return (
            <Rect
              key={item.habit.id}
              onPress={toggleHighlight(item.habit.id)}
              x={center - barWidth / 2}
              y={BASELINE - stacked}
              width={barWidth}
              height={height}
              opacity={dimmed(item.habit.id)}
              stroke={highlighted ? c.text : undefined}
              strokeWidth={highlighted ? 1.5 : 0}
              fill={item.color}
            />
          );
        })}
        {showValues && totals[index] > 0 && (
          <SvgText
            x={center}
            y={Math.max(12, 154 - barHeight(totals[index]))}
            fill={c.text}
            fontSize={10}
            fontWeight="600"
            textAnchor="middle"
          >
            {formatTotal(totals[index] / axis.divisor)}
          </SvgText>
        )}
        {showsLabel(index) && (
          <SvgText x={center} y={177} fill={c.muted} fontSize={grouped ? 9 : 11} textAnchor="middle">
            {bucketLabel(bucket)}
          </SvgText>
        )}
        {dayContext && (
          <SvgText x={center} y={193} fill={c.muted} fontSize={11} textAnchor="middle">
            {dayContext}
          </SvgText>
        )}
        {(grouped || bucketSize === 'week') && startsYear(index) && (
          <SvgText x={center} y={193} fill={c.muted} fontSize={11} textAnchor={index === 0 ? 'start' : 'middle'}>
            {bucket.key.slice(0, 4)}
          </SvgText>
        )}
      </React.Fragment>
    );
  };

  const accessibleSummary = (first: number, last: number) => {
    const parts: string[] = [];
    for (let index = first; index <= last; index++) {
      if (!buckets[index].dates.size) continue;
      const values = series.map(item => item.habit.name + ': ' + item.values[index] / axis.divisor).join(', ');
      parts.push(buckets[index].key + ': ' + values);
    }
    return t('history') + ', ' + t(axis.unit) + '. ' + parts.join('; ');
  };

  const renderPlot = (tile: TimelineTile) => {
    const origin = plotStart + slot / 2;
    const drawn = tileIndexRange(tile, origin, slot, count, TILE_MARGIN);
    const owned = tileIndexRange(tile, origin, slot, count, 0);
    const indices = Array.from(
      { length: Math.max(0, drawn.last - drawn.first + 1) },
      (_, offset) => drawn.first + offset,
    );
    return (
      <Svg
        key={tile.fromEnd}
        accessible
        accessibilityLabel={accessibleSummary(owned.first, owned.last)}
        width={tile.width}
        height={PLOT_HEIGHT}
        viewBox={`${tile.x} 0 ${tile.width} ${PLOT_HEIGHT}`}
      >
        {axis.ticks.map(value => {
          const tickY = BASELINE - (value / axis.max) * BAR_AREA;
          return (
            <React.Fragment key={value}>
              <Line x1={plotStart} y1={tickY} x2={right} y2={tickY} stroke={c.line} />
              {!scrollable && (
                <SvgText x={left - 6} y={tickY + 3} fill={c.muted} fontSize={11} textAnchor="end">
                  {formatTick(value)}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
        {indices.map(renderBucket)}
      </Svg>
    );
  };

  const wholePlot: TimelineTile = { fromEnd: 0, x: 0, width: plotWidth };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    timelineScroll.onScroll(event);
    tileWindow.onScroll(event);
  };

  return (
    <View
      onLayout={event => {
        const next = event.nativeEvent.layout.width;
        if (Number.isFinite(next) && next > 0) setWidth(next);
      }}
    >
      {type === 'duration' && <Text style={{ fontSize: 10, marginTop: 8, color: c.muted }}>{t(axis.unit)}</Text>}
      {scrollable ? (
        <View>
          <Svg width={left} height={PLOT_HEIGHT} style={{ position: 'absolute', left: 0, top: 0 }}>
            {axis.ticks.map(value => (
              <SvgText
                key={value}
                x={left - 6}
                y={163 - (value / axis.max) * BAR_AREA}
                textAnchor="end"
                fill={c.muted}
                fontSize={11}
              >
                {formatTick(value)}
              </SvgText>
            ))}
          </Svg>
          <ScrollView
            {...(timeline ? { ...timelineScroll, onScroll } : {})}
            style={{ marginLeft: left }}
            horizontal
            bounces={false}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={32}
            accessibilityLabel={t('historyTimeline')}
          >
            {timeline
              ? timelineTiles(plotWidth).map(tile =>
                  tileWindow.isMounted(tile) ? (
                    renderPlot(tile)
                  ) : (
                    <View key={tile.fromEnd} style={{ width: tile.width, height: PLOT_HEIGHT }} />
                  ),
                )
              : renderPlot(wholePlot)}
          </ScrollView>
        </View>
      ) : (
        renderPlot(wholePlot)
      )}
      {showLegend && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, marginBottom: 8 }}>
          {series.map(item => (
            <View key={item.habit.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: item.color }} />
              <Text style={{ color: c.muted, fontSize: 11 }}>
                {item.habit.emoji} {item.habit.name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
