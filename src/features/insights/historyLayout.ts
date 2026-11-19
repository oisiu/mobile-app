import type { BucketSize, TimeBucket } from '@/domain/analytics';
import { dayBucketContext } from '@/domain/chartTimeline';
import { startsNewYear } from './chartShared';

const timelineSpacing: Record<BucketSize, number> = { day: 21, week: 38, month: 22, quarter: 22, year: 32 };
const CONTEXT_GAP = 4;

type Options = {
  width: number;
  bucketSize: BucketSize;
  timeline: boolean;
  showValues: boolean;
  valueLabels: string[];
  tickLabels: string[];
  count: number;
};
export function historyLayout({ width, bucketSize, timeline, showValues, valueLabels, tickLabels, count }: Options) {
  const left = Math.max(28, ...tickLabels.map(label => label.length * 6 + 12));
  const valueWidth = Math.max(0, ...valueLabels.map(label => label.length * 6));
  const overviewSpacing = Math.max(18, valueWidth + 8);
  const scrollable = timeline || (showValues && valueLabels.length > 0 && count * overviewSpacing > width - left - 4);
  const spacing = timeline ? Math.max(timelineSpacing[bucketSize], valueWidth + 8) : overviewSpacing;
  const plotStart = scrollable ? (timeline && bucketSize === 'day' ? 34 : 0) : left;
  const plotWidth = scrollable ? Math.max(width - left, count * spacing + plotStart) : width;
  const right = Math.max(plotStart + 1, plotWidth - 4),
    slot = (right - plotStart) / Math.max(1, count);
  const labelStride = timeline
    ? 1
    : bucketSize === 'month'
      ? count <= 3
        ? 1
        : 3
      : bucketSize === 'day' && count > 7
        ? Math.max(1, Math.ceil(24 / slot))
        : 1;
  return {
    left,
    scrollable,
    plotStart,
    plotWidth,
    right,
    slot,
    labelStride,
    barWidth: timeline ? 12 : Math.min(16, slot * 0.8),
  };
}

export function historyContextLabels(
  buckets: TimeBucket[],
  bucketSize: BucketSize,
  { plotStart, plotWidth, slot }: { plotStart: number; plotWidth: number; slot: number },
) {
  const labels = new Map<number, { label: string; x: number }>();
  if (bucketSize === 'year') return labels;
  let nextLeft = 0;
  for (let index = 0; index < buckets.length; index++) {
    const label =
      bucketSize === 'day'
        ? dayBucketContext(buckets, index)
        : startsNewYear(buckets, index)
          ? buckets[index].key.slice(0, 4)
          : null;
    if (!label) continue;
    // Estimate the width at 11 points to keep adjacent context labels apart and inside the plot.
    const halfWidth = label.length * 3.25;
    const center = plotStart + slot * (index + 0.5);
    const x = Math.max(nextLeft + halfWidth, Math.min(center, plotWidth - halfWidth));
    if (x + halfWidth > plotWidth) continue;
    labels.set(index, { label, x });
    nextLeft = x + halfWidth + CONTEXT_GAP;
  }
  return labels;
}
