import { expect, it } from 'vitest';
import {
  highlightOpacity,
  PLOT_HEIGHT,
  shortMonthLabel,
  startsNewYear,
  toggledHighlight,
} from '../src/features/insights/chartShared';

const bucket = (key: string) => ({ key, label: key, dates: new Set<string>() });

it('dims every category except the highlighted one', () => {
  expect(highlightOpacity(null, 'a')).toBe(1);
  expect(highlightOpacity(undefined, 'a')).toBe(1);
  expect(highlightOpacity('a', 'a')).toBe(1);
  expect(highlightOpacity('a', 'b')).toBeLessThan(0.5);
});

it('clears the highlight on a second tap and moves it otherwise', () => {
  expect(toggledHighlight(null, 'a')).toBe('a');
  expect(toggledHighlight('a', 'a')).toBeNull();
  expect(toggledHighlight('a', 'b')).toBe('b');
});

it('marks the first bucket and each change of calendar year', () => {
  const buckets = ['2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01'].map(bucket);
  expect(buckets.map((_, index) => startsNewYear(buckets, index))).toEqual([true, false, true, false]);
});

it('shortens localized month labels to three characters without punctuation', () => {
  expect(shortMonthLabel('sept.')).toBe('sep');
  expect(shortMonthLabel('Jan')).toBe('Jan');
  expect(shortMonthLabel('de nov.')).toBe('den');
});

it('shares one plot height between the charts', () => {
  expect(PLOT_HEIGHT).toBe(202);
});
