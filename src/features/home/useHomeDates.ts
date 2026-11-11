import { addDays } from '@/utils/dates';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, type ScrollView } from 'react-native';
import { HABIT_COLUMN_WIDTH, HOME_VISIBLE_DAYS, homeDateWindow, homeDayChunks, homeHistoryDays } from './dateWindow';

type ScrollEvent = { nativeEvent: { contentOffset: { x: number } } };

export function useHomeDates(today: string, width: number) {
  const dayWidth = Math.max(1, (width - HABIT_COLUMN_WIDTH) / HOME_VISIBLE_DAYS);
  const [firstDay, setFirstDay] = useState(0),
    [historyDays, setHistoryDays] = useState(60);
  const visibleFirstDay = useRef(0),
    dateScroll = useRef<ScrollView>(null);
  const [dateScrollX] = useState(() => new Animated.Value(0));
  const dateTrackX = useMemo(() => Animated.multiply(dateScrollX, -1), [dateScrollX]);
  const pendingScroll = useRef<{ index: number; animated: boolean } | null>(null);
  const previousWidth = useRef(dayWidth),
    wasMeasurable = useRef(width > HABIT_COLUMN_WIDTH);
  const range = homeDateWindow(firstDay, historyDays);
  const days = useMemo(
    () => Array.from({ length: range.end - range.start }, (_, i) => addDays(today, -range.start - i)),
    [today, range.start, range.end],
  );
  const chunks = useMemo(() => homeDayChunks(days), [days]);

  const reveal = useCallback((index: number) => {
    visibleFirstDay.current = index;
    setFirstDay(index);
    setHistoryDays(count => homeHistoryDays(index, count));
  }, []);
  const updateOffset = useCallback(
    (event: ScrollEvent) => {
      if (width <= HABIT_COLUMN_WIDTH) return;
      const index = Math.max(
        0,
        Math.min(historyDays - HOME_VISIBLE_DAYS, Math.floor(event.nativeEvent.contentOffset.x / dayWidth)),
      );
      reveal(index);
    },
    [width, dayWidth, historyDays, reveal],
  );
  const onDateScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: dateScrollX } } }], {
        useNativeDriver: true,
        listener: updateOffset,
      }),
    [dateScrollX, updateOffset],
  );
  const finishDateScroll = updateOffset;
  const moveTo = (index: number, animated: boolean) => {
    const target = Math.max(0, index);
    reveal(target);
    if (target === firstDay && width > HABIT_COLUMN_WIDTH) {
      // An edge action can leave state unchanged, so no commit would flush a queued jump.
      pendingScroll.current = null;
      const x = target * dayWidth;
      if (!animated) dateScrollX.setValue(x);
      dateScroll.current?.scrollTo({ x, animated });
      return;
    }
    pendingScroll.current = { index: target, animated };
  };
  // Commit destination cells before a programmatic jump or a width adjustment.
  useLayoutEffect(() => {
    if (width <= HABIT_COLUMN_WIDTH) {
      wasMeasurable.current = false;
      return;
    }
    if ((!wasMeasurable.current || previousWidth.current !== dayWidth) && !pendingScroll.current) {
      pendingScroll.current = { index: visibleFirstDay.current, animated: false };
    }
    previousWidth.current = dayWidth;
    wasMeasurable.current = true;
    const pending = pendingScroll.current;
    if (!pending) return;
    pendingScroll.current = null;
    const x = pending.index * dayWidth;
    if (!pending.animated) dateScrollX.setValue(x);
    dateScroll.current?.scrollTo({ x, animated: pending.animated });
  });
  const moveDates = (amount: number) => {
    const target = Math.max(0, visibleFirstDay.current - amount);
    moveTo(target, Math.abs(target - firstDay) <= HOME_VISIBLE_DAYS);
  };
  const goToToday = () => moveTo(0, false);
  return {
    firstDay,
    historyDays,
    dayWidth,
    days,
    chunks,
    range,
    dateScroll,
    dateTrackX,
    onDateScroll,
    finishDateScroll,
    moveDates,
    goToToday,
    anchor: addDays(today, -firstDay),
  };
}
