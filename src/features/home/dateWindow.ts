export const HOME_VISIBLE_DAYS = 5;
export const HABIT_COLUMN_WIDTH = 157;

/**
 * Days mount in fixed chunks. Each chunk is memoized, so shifting the window only mounts
 * the chunk entering it instead of re-rendering every mounted day in every row.
 */
export const HOME_CHUNK_DAYS = 20;
// A fast fling covers dozens of days before React commits, so keep whole chunks ready on both sides.
const CHUNKS_BEHIND = 2;
const CHUNKS_AHEAD = 3;
const WINDOW_AHEAD_DAYS = (CHUNKS_AHEAD + 1) * HOME_CHUNK_DAYS;
// Scrollable history always reaches past the mounted window so momentum is not cut short.
const HISTORY_AHEAD_DAYS = WINDOW_AHEAD_DAYS + 2 * HOME_CHUNK_DAYS;
const HISTORY_STEP_DAYS = 3 * HOME_CHUNK_DAYS;

/** Mounted day range (as offsets before today) for the chunk holding the first visible day. */
export function homeDateWindow(firstDay: number, historyDays: number) {
  const chunk = Math.floor(Math.max(0, firstDay) / HOME_CHUNK_DAYS) * HOME_CHUNK_DAYS;
  return {
    start: Math.max(0, chunk - CHUNKS_BEHIND * HOME_CHUNK_DAYS),
    end: Math.min(historyDays, chunk + WINDOW_AHEAD_DAYS),
  };
}

/** Scrollable history length; only ever grows, in whole chunks. */
export function homeHistoryDays(firstDay: number, loaded: number) {
  const required = firstDay + HISTORY_AHEAD_DAYS;
  return Math.max(loaded, Math.ceil(required / HISTORY_STEP_DAYS) * HISTORY_STEP_DAYS);
}

/** Splits mounted days into chunk-sized groups; windows start on chunk boundaries. */
export function homeDayChunks(days: string[]) {
  const chunks: string[][] = [];
  for (let index = 0; index < days.length; index += HOME_CHUNK_DAYS) {
    chunks.push(days.slice(index, index + HOME_CHUNK_DAYS));
  }
  return chunks;
}
