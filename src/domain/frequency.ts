import { buildTimelineBuckets } from './chartTimeline';
import { aggregateByDate } from './aggregation';
import { TimeBucket } from './analytics';
import { Entry, Habit } from './types';

export function buildFrequency(habit: Habit, habits: Habit[], entries: Entry[], buckets: TimeBucket[]) {
  const dates = new Set(buckets.flatMap(bucket => [...bucket.dates]));
  const activity = aggregateByDate(habits, entries, habit.id, [...dates]);
  const rows = Array.from({ length: 7 }, () => buckets.map(() => ({ count: 0, possible: 0, intensity: 0, size: 4 })));
  buckets.forEach((bucket, column) => {
    for (const date of bucket.dates) {
      const weekday = (new Date(`${date}T12:00:00`).getDay() + 6) % 7,
        cell = rows[weekday][column];
      cell.possible++;
      if ((activity.get(date) ?? 0) > 0) cell.count++;
    }
  });
  for (const row of rows)
    for (const cell of row) {
      cell.intensity = cell.possible ? cell.count / cell.possible : 0;
      cell.size = 4 + 18 * cell.intensity;
    }
  return { rows };
}

const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));

export function buildFrequencyBuckets(entries: Entry[], today: string) {
  const current = monthIndex(today);
  const first = entries.reduce(
    (earliest, entry) => (entry.localDate <= today ? Math.min(earliest, monthIndex(entry.localDate)) : earliest),
    current - 11,
  );
  return buildTimelineBuckets('month', today, current - first + 1);
}
