import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it } from 'vitest';
import {
  TIMELINE_TILE_WIDTH,
  tileIndexRange,
  timelineTiles,
  useTimelineTiles,
  type TimelineTile,
} from '../src/features/insights/timelineTiles';

// Android refuses to draw a bitmap above 100 MB; a 202-point-high plot at 3.5x density.
const maxBitmapBytes = 100 * 1024 * 1024;
const tileBytes = (tile: TimelineTile) => tile.width * 3.5 * 202 * 3.5 * 4;

describe('Timeline tiles', () => {
  it('keeps a short plot as one tile so it draws exactly as before', () => {
    expect(timelineTiles(320)).toEqual([{ fromEnd: 0, x: 0, width: 320 }]);
    expect(timelineTiles(TIMELINE_TILE_WIDTH)).toHaveLength(1);
    expect(timelineTiles(0)).toHaveLength(1);
  });

  it('covers a century of daily history without gaps, overlaps or oversized bitmaps', () => {
    const plotWidth = 36500 * 32 + 56;
    const tiles = timelineTiles(plotWidth);
    expect(tiles[0].x).toBe(0);
    expect(tiles.at(-1)!.x + tiles.at(-1)!.width).toBe(plotWidth);
    for (let index = 1; index < tiles.length; index++) {
      expect(tiles[index].x).toBe(tiles[index - 1].x + tiles[index - 1].width);
    }
    expect(tiles.every(tile => tile.width > 0 && tileBytes(tile) < maxBitmapBytes / 4)).toBe(true);
  });

  it('keeps existing tiles stable when older history is prepended', () => {
    const before = timelineTiles(60 * 32 + 56);
    const after = timelineTiles(120 * 32 + 56);
    const added = 60 * 32;
    for (const tile of before.slice(1)) {
      const match = after.find(item => item.fromEnd === tile.fromEnd)!;
      expect(match.width).toBe(tile.width);
      expect(match.x).toBe(tile.x + added);
    }
  });

  it('selects the buckets a tile draws, including neighbours within the margin', () => {
    const tile = { fromEnd: 1, x: 1200, width: 1200 };
    expect(tileIndexRange(tile, 0, 100, 1000, 0)).toEqual({ first: 12, last: 24 });
    expect(tileIndexRange(tile, 0, 100, 1000, 150)).toEqual({ first: 11, last: 25 });
    expect(tileIndexRange({ fromEnd: 0, x: 0, width: 320 }, 42, 32, 5, 80)).toEqual({ first: 0, last: 4 });
    expect(tileIndexRange(tile, 0, 100, 0, 0)).toEqual({ first: 0, last: -1 });
  });
});

describe('Mounted timeline tiles', () => {
  let renderer: ReactTestRenderer;
  let tiles: ReturnType<typeof useTimelineTiles>;
  function Harness() {
    tiles = useTimelineTiles();
    return null;
  }
  const scrollTo = (x: number, contentWidth: number, viewport = 340) =>
    act(async () =>
      tiles.onScroll({
        nativeEvent: { contentOffset: { x }, contentSize: { width: contentWidth }, layoutMeasurement: { width: viewport } },
      } as Parameters<typeof tiles.onScroll>[0]),
    );
  const mounted = (plotWidth: number) =>
    timelineTiles(plotWidth)
      .filter(tile => tiles.isMounted(tile))
      .map(tile => tile.fromEnd);

  afterEach(async () => {
    if (renderer) await act(async () => renderer.unmount());
  });

  it('opens with only the latest tiles mounted', async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    await act(async () => {
      renderer = create(<Harness />);
    });
    expect(mounted(10 * TIMELINE_TILE_WIDTH)).toEqual([1, 0]);
  });

  it('mounts a bounded set of tiles around the viewport far into the past', async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    await act(async () => {
      renderer = create(<Harness />);
    });
    const contentWidth = 1000 * TIMELINE_TILE_WIDTH;
    for (const fromEnd of [0, 3, 250, 999]) {
      const x = contentWidth - 340 - fromEnd * TIMELINE_TILE_WIDTH - 10;
      await scrollTo(Math.max(0, x), contentWidth);
      const ids = mounted(contentWidth);
      expect(ids).toContain(Math.min(999, fromEnd));
      expect(ids.length).toBeLessThanOrEqual(4);
    }
  });

  it('keeps the same tiles mounted when history is prepended at the same distance from the end', async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    await act(async () => {
      renderer = create(<Harness />);
    });
    await scrollTo(0, 3 * TIMELINE_TILE_WIDTH);
    const before = mounted(3 * TIMELINE_TILE_WIDTH);
    await scrollTo(2 * TIMELINE_TILE_WIDTH, 5 * TIMELINE_TILE_WIDTH);
    expect(mounted(5 * TIMELINE_TILE_WIDTH)).toEqual(expect.arrayContaining(before));
  });

  it('ignores scroll events without layout measurements', async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    await act(async () => {
      renderer = create(<Harness />);
    });
    await act(async () =>
      tiles.onScroll({ nativeEvent: { contentOffset: { x: 0 } } } as Parameters<typeof tiles.onScroll>[0]),
    );
    expect(mounted(10 * TIMELINE_TILE_WIDTH)).toEqual([1, 0]);
  });
});
