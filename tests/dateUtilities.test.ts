import { expect, it } from 'vitest';
import { addDays, addMonths, monthCalendarDays, monthKey, monthYearHeading, shortDay } from '../src/utils/dates';

it.each([
  ['2026-03-28', 1, '2026-03-29'],
  ['2026-03-28', 2, '2026-03-30'],
  ['2026-10-24', 2, '2026-10-26'],
  ['2024-02-28', 1, '2024-02-29'],
  ['2024-03-01', -1, '2024-02-29'],
  ['2026-01-01', -1, '2025-12-31'],
] as const)('adds %s by %i calendar days across clock and month boundaries', (date, amount, expected) => {
  expect(addDays(date, amount)).toBe(expected);
  expect(addDays(expected, -amount)).toBe(date);
});

it.each([
  ['2026-12', 1, '2027-01'],
  ['2026-01', -13, '2024-12'],
  ['2024-02', 24, '2026-02'],
  ['2026-11', 0, '2026-11'],
] as const)('moves month %s by %i without depending on month length', (month, amount, expected) => {
  expect(addMonths(month, amount)).toBe(expected);
});

it.each(['2024-02', '2026-02', '2026-06', '2026-11'])('builds a Monday-first %s grid with only edge padding', month => {
  const cells = monthCalendarDays(month),
    dates = cells.filter((date): date is string => date !== null);
  const start = cells.indexOf(`${month}-01`),
    lastDate = dates.at(-1)!;
  expect(cells.length % 7).toBe(0);
  expect(new Set(dates).size).toBe(dates.length);
  expect(start).toBe((new Date(`${month}-01T12:00:00`).getDay() + 6) % 7);
  expect(cells.slice(0, start).every(date => date === null)).toBe(true);
  expect(cells.slice(start, start + dates.length)).toEqual(dates);
  expect(cells.slice(start + dates.length).every(date => date === null)).toBe(true);
  expect(lastDate.slice(0, 7)).toBe(month);
  expect(addDays(lastDate, 1).endsWith('-01')).toBe(true);
});

it('formats English and Spanish month headings with the supplied locale and historical year', () => {
  expect(monthYearHeading('2026-09-08', 'en')).toBe('September 2026');
  expect(monthYearHeading('2026-09-08', 'es')).toBe('Septiembre 2026');
  expect(monthYearHeading('0099-01-31', 'en')).toBe('January 0099');
  expect(monthKey('2026-09-08')).toBe('2026-09');
  expect(shortDay('2026-09-07')).toBe(
    new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(new Date('2026-09-07T12:00:00')),
  );
});
