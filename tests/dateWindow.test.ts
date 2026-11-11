import { describe, expect, it } from 'vitest';
import { HOME_CHUNK_DAYS, homeDateWindow, homeDayChunks, homeHistoryDays } from '../src/features/home/dateWindow';

describe('Home native date timeline', () => {
  it('starts at today with no future columns', () => {
    expect(homeDateWindow(0, 60)).toEqual({ start: 0, end: 60 });
  });

  it('reuses the date matrix while scrolling within a chunk', () => {
    expect(homeDateWindow(20, 180)).toEqual(homeDateWindow(39, 180));
  });

  it('keeps whole chunks mounted on both sides of the visible days however far back it scrolls', () => {
    for (let first = 40; first < 40000; first += first < 1000 ? 1 : 997) {
      const range = homeDateWindow(first, homeHistoryDays(first, 60));
      expect(range.start).toBeLessThanOrEqual(first - 2 * HOME_CHUNK_DAYS);
      expect(range.end).toBeGreaterThanOrEqual(first + 5 + 2 * HOME_CHUNK_DAYS);
      expect(range.end - range.start).toBeLessThanOrEqual(6 * HOME_CHUNK_DAYS);
      expect(range.start % HOME_CHUNK_DAYS).toBe(0);
      expect(range.end % HOME_CHUNK_DAYS).toBe(0);
    }
  });

  it('clamps the window at the available history edges', () => {
    expect(homeDateWindow(52, 60)).toEqual({ start: 0, end: 60 });
    expect(homeDateWindow(-1, 60)).toEqual(homeDateWindow(0, 60));
  });

  it('preserves spacers and the historical window when unrelated older days are appended', () => {
    expect(homeDateWindow(25, 180)).toEqual(homeDateWindow(25, 240));
  });
});

describe('Home loaded history', () => {
  it('always reaches past the mounted window and never shrinks', () => {
    let loaded = 60;
    for (let first = 0; first < 5000; first += 7) {
      const next = homeHistoryDays(first, loaded);
      expect(next).toBeGreaterThanOrEqual(loaded);
      expect(next).toBeGreaterThan(homeDateWindow(first, next).end);
      expect(next % HOME_CHUNK_DAYS).toBe(0);
      loaded = next;
    }
    expect(homeHistoryDays(0, 600)).toBe(600);
  });
});

describe('Home day chunks', () => {
  it('splits mounted days into whole chunks in order', () => {
    const days = Array.from({ length: 3 * HOME_CHUNK_DAYS }, (_, index) => `day-${index}`);
    const chunks = homeDayChunks(days);
    expect(chunks).toHaveLength(3);
    expect(chunks.every(chunk => chunk.length === HOME_CHUNK_DAYS)).toBe(true);
    expect(chunks.flat()).toEqual(days);
  });

  it('returns no chunks for an empty window', () => {
    expect(homeDayChunks([])).toEqual([]);
  });
});
