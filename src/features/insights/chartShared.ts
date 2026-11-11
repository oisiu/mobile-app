import type { TimeBucket } from '@/domain/analytics';

export const PLOT_HEIGHT = 202;
const DIMMED_OPACITY = 0.22;

/** Highlighting one category dims every other one in the same chart. */
export const highlightOpacity = (highlightedId: string | null | undefined, id: string) =>
  highlightedId && highlightedId !== id ? DIMMED_OPACITY : 1;

/** Tapping the highlighted category clears the highlight; tapping another moves it. */
export const toggledHighlight = (highlightedId: string | null | undefined, id: string) =>
  highlightedId === id ? null : id;

/** True for the first bucket and whenever a bucket starts a different calendar year. */
export const startsNewYear = (buckets: TimeBucket[], index: number) =>
  index === 0 || buckets[index].key.slice(0, 4) !== buckets[index - 1].key.slice(0, 4);

/** Month labels without locale punctuation, cut to three characters. */
export const shortMonthLabel = (label: string) => label.replace(/[.\s]/g, '').slice(0, 3);
