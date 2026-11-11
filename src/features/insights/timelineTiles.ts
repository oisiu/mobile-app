import { useCallback, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/**
 * Android rasterizes each SVG into one bitmap and refuses to draw bitmaps above 100 MB,
 * so a timeline that grows with loaded history is drawn as fixed-width tiles instead.
 */
export const TIMELINE_TILE_WIDTH = 1200;
// Tiles kept mounted on each side of the visible ones so flings do not reveal gaps.
const OVERSCAN_TILES = 1;

export interface TimelineTile {
  /** Position counted from the latest tile; stable when older history is prepended. */
  fromEnd: number;
  /** Left edge in plot coordinates. */
  x: number;
  width: number;
}

/** Slices a plot into tiles anchored at its latest edge; the oldest tile takes the remainder. */
export function timelineTiles(plotWidth: number): TimelineTile[] {
  const count = Math.max(1, Math.ceil(plotWidth / TIMELINE_TILE_WIDTH));
  return Array.from({ length: count }, (_, index) => {
    const fromEnd = count - 1 - index;
    const end = plotWidth - fromEnd * TIMELINE_TILE_WIDTH;
    const x = Math.max(0, end - TIMELINE_TILE_WIDTH);
    return { fromEnd, x, width: end - x };
  });
}

/** Indices `0..count-1` whose position `origin + index * step` falls within `margin` of the tile. */
export function tileIndexRange(tile: TimelineTile, origin: number, step: number, count: number, margin: number) {
  if (count <= 0 || step <= 0) return { first: 0, last: count - 1 };
  const first = Math.ceil((tile.x - margin - origin) / step);
  const last = Math.floor((tile.x + tile.width + margin - origin) / step);
  return { first: Math.max(0, first), last: Math.min(count - 1, last) };
}

/** Tracks which tiles are near the viewport, measured from the latest edge where the timeline opens. */
export function useTimelineTiles() {
  const [visible, setVisible] = useState({ first: 0, last: 0 });
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    if (!contentSize || !layoutMeasurement) return;
    const fromEnd = Math.max(0, contentSize.width - layoutMeasurement.width - contentOffset.x);
    const first = Math.floor(fromEnd / TIMELINE_TILE_WIDTH);
    const last = Math.floor((fromEnd + layoutMeasurement.width) / TIMELINE_TILE_WIDTH);
    setVisible(current => (current.first === first && current.last === last ? current : { first, last }));
  }, []);
  const isMounted = (tile: TimelineTile) =>
    tile.fromEnd >= visible.first - OVERSCAN_TILES && tile.fromEnd <= visible.last + OVERSCAN_TILES;
  return { onScroll, isMounted };
}
