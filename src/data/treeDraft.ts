import type { Habit } from '@/domain/types';

export interface TreeDraftCreate {
  key: string;
  parentKey: string;
  name: string;
  emoji: string;
  color?: Habit['color'];
  calendarThreshold?: number | null;
  index?: number;
}
export interface TreeDraftUpdate {
  id: string;
  name: string;
  emoji: string;
  color?: Habit['color'];
  hideFromOverview?: boolean;
  isHidden?: boolean;
  calendarThreshold?: number | null;
  index?: number;
}
