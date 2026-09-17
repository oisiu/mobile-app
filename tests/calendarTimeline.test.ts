import { expect,it } from 'vitest';
import { buildCalendarTimeline,initialCalendarWeek } from '../src/features/insights/calendarTimeline';
import { calendarScrollOffset } from '../src/features/insights/calendarScroll';

it.each([
  ['2024-02','2024-02-15','2024-01-29','2024-02-29','2024-03-03'],
  ['2023-02','2023-02-28','2023-01-30','2023-02-28','2023-03-05'],
  ['2026-11','2026-11-01','2026-10-26','2026-11-30','2026-12-06'],
  ['2026-12','2027-01-05','2026-11-30','2027-01-31','2027-01-31'],
])('builds full Monday–Sunday weeks from %s through %s',(month,today,start,monthEnd,end)=>{
  const result=buildCalendarTimeline(month,today);
  expect(result.start).toBe(start);expect(result.monthEnd).toBe(monthEnd);
  expect(result.dates.at(-1)).toBe(end);expect(result.weeks.flat()).toEqual(result.dates);
  expect(new Set(result.dates).size).toBe(result.dates.length);
  for(const week of result.weeks){expect(week).toHaveLength(7);expect(new Date(`${week[0]}T12:00:00`).getDay()).toBe(1);expect(new Date(`${week[6]}T12:00:00`).getDay()).toBe(0)}
});
it('keeps future dates in the final week for the UI to disable',()=>{
  const {dates}=buildCalendarTimeline('2026-09','2026-09-16');
  expect(dates).toContain('2026-09-30');expect(dates.at(-1)).toBe('2026-10-04');
});
it('preserves week keys and the centered date when earlier history is prepended',()=>{
  const before=buildCalendarTimeline('2026-04','2026-09-16'),after=buildCalendarTimeline('2026-01','2026-09-16');
  const target='2026-08-19',oldIndex=Math.floor(before.dates.indexOf(target)/7),newIndex=Math.floor(after.dates.indexOf(target)/7);
  expect(after.weeks.slice(newIndex)).toEqual(before.weeks.slice(oldIndex));
  const oldOffset=calendarScrollOffset(oldIndex,47,44,350,before.weeks.length*47-3);
  const newOffset=calendarScrollOffset(newIndex,47,44,350,after.weeks.length*47-3);
  expect(newOffset-oldOffset).toBe((newIndex-oldIndex)*47);
});
it('starts near a selected historical week with a small preceding buffer',()=>{
  const {dates,weeks}=buildCalendarTimeline('2010-01','2026-09-16');
  const selected='2011-06-15',initial=initialCalendarWeek(dates,selected);
  expect(weeks[initial+3]).toContain(selected);expect(initial).toBeLessThan(100);
});
it('clamps initial positioning for the first week and a missing selection',()=>{
  const {dates}=buildCalendarTimeline('2026-09','2026-09-16');
  expect(initialCalendarWeek(dates,dates[0])).toBe(0);
  expect(initialCalendarWeek(dates,'1900-01-01')).toBe(0);
});
