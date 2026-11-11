import { addMonths } from '@/utils/dates';
import { useMemo, useRef, useState } from 'react';
import type { FlatList } from 'react-native';
import { calendarScrollOffset } from './calendarScroll';
import { buildCalendarTimeline, initialCalendarWeek } from './calendarTimeline';

export function useCalendarNavigation(today: string, cellSize: number, initialDate?: string) {
  const step = cellSize + 3;
  const [firstMonth, setFirstMonth] = useState(() => addMonths((initialDate ?? today).slice(0, 7), -5));
  const timeline = useMemo(() => buildCalendarTimeline(firstMonth, today), [firstMonth, today]);
  const { start, dates, weeks } = timeline;
  const [initialWeek] = useState(() => initialCalendarWeek(dates, initialDate ?? today));
  const scroll = useRef<FlatList<string[]>>(null);
  const initialized = useRef(false),
    offset = useRef(0),
    viewport = useRef(0),
    contentWidth = useRef(0);
  const loadingEarlier = useRef(false),
    pendingMonth = useRef<string | null>(null);

  const scrollTo = (nextOffset: number, animated: boolean) => {
    offset.current = Math.max(0, Math.min(nextOffset, Math.max(0, contentWidth.current - viewport.current)));
    scroll.current?.scrollToOffset({ offset: offset.current, animated });
  };
  const initialize = () => {
    if (initialized.current || !viewport.current || !contentWidth.current) return;
    initialized.current = true;
    if (initialDate) {
      const week = Math.max(0, Math.floor(dates.indexOf(initialDate) / 7));
      scrollTo(calendarScrollOffset(week, step, cellSize, viewport.current, contentWidth.current), false);
    } else scrollTo(contentWidth.current - viewport.current, false);
  };
  const onLayout = (width: number) => {
    viewport.current = width;
    initialize();
  };
  const onContentSizeChange = (width: number) => {
    // Duplicate native size events must not unlock another prepend.
    const changed = width !== contentWidth.current;
    if (changed) loadingEarlier.current = false;
    contentWidth.current = width;
    if (pendingMonth.current && changed) {
      const index = dates.findIndex(date => date >= pendingMonth.current!);
      pendingMonth.current = null;
      scrollTo(Math.floor(index / 7) * step, false);
    } else initialize();
  };
  const onScroll = (nextOffset: number) => {
    offset.current = Math.max(0, nextOffset);
  };
  const loadEarlier = () => {
    if (!initialized.current || offset.current >= 4 * step || loadingEarlier.current) return;
    loadingEarlier.current = true;
    setFirstMonth(month => addMonths(month, -3));
  };
  const moveMonth = (direction: 1 | -1) => {
    if (!initialized.current || loadingEarlier.current) return;
    const weekIndex = Math.max(0, Math.min(weeks.length - 1, Math.round(offset.current / step)));
    const week = weeks[weekIndex];
    // A month starts inside a week unless its first day is Monday.
    const visibleDate = week.find(date => date.endsWith('-01')) ?? week[0];
    const requested = addMonths(visibleDate.slice(0, 7), direction);
    const targetMonth = requested > today.slice(0, 7) ? today.slice(0, 7) : requested;
    const targetDate = `${targetMonth}-01`;
    if (targetDate < start) {
      pendingMonth.current = targetDate;
      loadingEarlier.current = true;
      setFirstMonth(addMonths(targetMonth, -2));
      return;
    }
    const index = dates.findIndex(date => date >= targetDate);
    scrollTo(Math.floor(index / 7) * step, true);
  };
  return { ...timeline, scroll, initialWeek, onLayout, onContentSizeChange, onScroll, loadEarlier, moveMonth };
}
