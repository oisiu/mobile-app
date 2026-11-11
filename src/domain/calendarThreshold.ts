import { HabitType } from './types';
import { durationInputToSeconds, isCompleteDecimalInput, type DurationUnit } from './entries';

// Null clears a threshold; NaN retains an invalid draft so Save can reject it.
export function calendarThresholdInput(type: HabitType, text: string, unit: DurationUnit = 'minutes'): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!normalized) return null;
  if (type === 'boolean' || !isCompleteDecimalInput(normalized)) return NaN;
  const amount = Number(normalized);
  if (type !== 'duration') return amount;
  const value = durationInputToSeconds(amount, unit),
    seconds = Math.round(value);
  return Number.isFinite(value) && Math.abs(value - seconds) < 1e-7 ? seconds : NaN;
}

export function isValidCalendarThreshold(type: HabitType, value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (type !== 'boolean' &&
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value > 0 &&
      (type !== 'duration' || Number.isSafeInteger(value)))
  );
}
export function assertCalendarThreshold(type: HabitType, value: unknown) {
  if (!isValidCalendarThreshold(type, value)) throw new Error('Invalid calendar threshold');
}
export function calendarFillOpacity(threshold: number | null | undefined, value: number): number {
  return threshold != null && value < threshold ? 0.3 : 1;
}
