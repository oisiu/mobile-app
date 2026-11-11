import { expect, it } from 'vitest';
import {
  assertCalendarThreshold,
  calendarFillOpacity,
  calendarThresholdInput,
  isValidCalendarThreshold,
} from '../src/domain/calendarThreshold';
it('uses a fixed soft fill strictly below the threshold, including zero', () => {
  expect(calendarFillOpacity(10, 9)).toBe(0.3);
  expect(calendarFillOpacity(10, 0)).toBe(0.3);
  expect(calendarFillOpacity(10, 10)).toBe(1);
  expect(calendarFillOpacity(10, 11)).toBe(1);
  expect(calendarFillOpacity(undefined, 2)).toBe(1);
  expect(calendarFillOpacity(null, 2)).toBe(1);
});

it('parses decimal thresholds while distinguishing cleared and invalid drafts', () => {
  expect(calendarThresholdInput('number', ' ')).toBeNull();
  expect(calendarThresholdInput('number', ' 2,5 ')).toBe(2.5);
  expect(calendarThresholdInput('number', '.5')).toBe(0.5);
  expect(calendarThresholdInput('number', '2.')).toBe(2);
  for (const text of ['.', '1e2', '0x10', '2,5,2', 'NaN', 'Infinity', '-1'])
    expect(calendarThresholdInput('number', text)).toBeNaN();
  expect(calendarThresholdInput('boolean', '1')).toBeNaN();
});

it('rejects fractional seconds rather than silently rounding duration thresholds', () => {
  expect(calendarThresholdInput('duration', '0.01')).toBeNaN();
  expect(calendarThresholdInput('duration', '0.0001', 'hours')).toBeNaN();
  expect(calendarThresholdInput('duration', '2,5')).toBe(150);
  expect(calendarThresholdInput('duration', '0.5', 'hours')).toBe(1800);
  expect(calendarThresholdInput('duration', String(1 / 60))).toBe(1);
  expect(calendarThresholdInput('duration', String(1 / 3600), 'hours')).toBe(1);
  expect(calendarThresholdInput('duration', '9'.repeat(400))).toBeNaN();
  expect(
    isValidCalendarThreshold('duration', calendarThresholdInput('duration', String(Number.MAX_SAFE_INTEGER), 'hours')),
  ).toBe(false);
});
it('allows optional positive quantities and integer duration seconds only', () => {
  expect(isValidCalendarThreshold('boolean', null)).toBe(true);
  expect(isValidCalendarThreshold('boolean', undefined)).toBe(true);
  expect(isValidCalendarThreshold('number', 0.5)).toBe(true);
  expect(isValidCalendarThreshold('duration', 60)).toBe(true);
  for (const value of [0, -1, NaN, Infinity, '1'])
    expect(() => assertCalendarThreshold('number', value)).toThrow('Invalid calendar threshold');
  expect(() => assertCalendarThreshold('boolean', 1)).toThrow();
  expect(() => assertCalendarThreshold('duration', 0.5)).toThrow();
  expect(() => assertCalendarThreshold('duration', Number.MAX_SAFE_INTEGER + 1)).toThrow();
  expect(() => assertCalendarThreshold('duration', 120)).not.toThrow();
});
