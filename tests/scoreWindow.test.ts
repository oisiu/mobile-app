import { describe,expect,it } from 'vitest';
import { buildScoreWindow } from '../src/domain/analytics';

describe('Score calendar windows',()=>{
  it.each(['2026-09-07','2026-09-08','2026-09-13'])('keeps Monday through Sunday when today is %s',today=>{
    const window=buildScoreWindow('week',today,today);
    expect(window.buckets.map(bucket=>bucket.key)).toEqual(['2026-09-07','2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12','2026-09-13']);
    expect(window.buckets.filter(bucket=>bucket.dates.size).length).toBe(Number(today.slice(-2))-6);
  });
  it.each([['2026-01-10',31],['2026-04-10',30],['2026-02-10',28],['2024-02-10',29]] as const)('shows every day of %s without future scores', (today,count)=>{
    const window=buildScoreWindow('month',today,today);
    expect(window.buckets).toHaveLength(count);
    expect(window.buckets[0].label).toBe('1');
    expect(window.buckets.at(-1)!.label).toBe(String(count));
    expect(window.buckets.flatMap(bucket=>[...bucket.dates])).toHaveLength(10);
    expect(window.buckets.at(-1)!.dates.size).toBe(0);
  });
  it('shows January through December and caps the current month denominator at today',()=>{
    const window=buildScoreWindow('year','2026-09-08','2026-09-08');
    expect(window.buckets.map(bucket=>bucket.key)).toEqual(Array.from({length:12},(_,i)=>`2026-${String(i+1).padStart(2,'0')}`));
    expect(window.buckets[7].dates.size).toBe(31);
    expect(window.buckets[8].dates.size).toBe(8);
    expect(window.buckets.slice(9).every(bucket=>bucket.dates.size===0)).toBe(true);
  });
  it('keeps complete historical periods and Monday weeks across year boundaries',()=>{
    const week=buildScoreWindow('week','2026-01-01','2026-09-08');
    expect(week.start).toBe('2025-12-29');
    expect(week.end).toBe('2026-01-04');
    expect(week.buckets.every(bucket=>bucket.dates.size===1)).toBe(true);
    const year=buildScoreWindow('year','2024-06-15','2026-09-08');
    expect(year.buckets.flatMap(bucket=>[...bucket.dates])).toHaveLength(366);
  });
});
