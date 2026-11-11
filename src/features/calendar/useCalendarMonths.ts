import { addMonths, monthCalendarDays, monthKey } from '@/utils/dates';
import { useMemo, useRef, useState } from 'react';
import type { FlatList } from 'react-native';

export function useCalendarMonths(today: string, width: number) {
  const [monthCount, setMonthCount] = useState(12);
  const currentMonth = monthKey(today);
  const list = useRef<FlatList<string>>(null),
    visibleIndex = useRef(0);
  const dayHeight = Math.max(64, Math.min(82, ((width - 32) / 7) * 1.2));
  const months = useMemo(
    () => Array.from({ length: monthCount }, (_, index) => addMonths(currentMonth, -index)),
    [currentMonth, monthCount],
  );
  const layouts = useMemo(() => {
    let offset = 0;
    return months.map((month, index) => {
      const length = 76 + (monthCalendarDays(month).length / 7) * dayHeight;
      const layout = { index, length, offset };
      offset += length;
      return layout;
    });
  }, [months, dayHeight]);
  const moveMonth = (amount: number) => {
    const index = Math.max(0, Math.min(months.length - 1, visibleIndex.current - amount));
    list.current?.scrollToIndex({ index, animated: true });
  };
  const onScroll = (offset: number) => {
    visibleIndex.current = Math.max(
      0,
      layouts.findIndex(item => item.offset + item.length > offset),
    );
  };
  const loadEarlier = () => setMonthCount(count => count + 12);
  const goToToday = () => list.current?.scrollToOffset({ offset: 0, animated: true });
  return { list, months, layouts, dayHeight, moveMonth, onScroll, loadEarlier, goToToday };
}
