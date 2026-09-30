import { Habit } from '../domain/types';
import { inheritedHabitColor } from '../domain/habitAppearance';

// Mid-tone accents remain visible on both themes and support white calendar numerals.
export const habitColorPalette={green:'#477F63',blue:'#3978AE',purple:'#8665AD',orange:'#A66632',pink:'#AD5D80',teal:'#327F83'} as const;
export function habitAccent(habit:Habit,habits:Habit[],fallback:string):string {
  const color=inheritedHabitColor(habit,habits);return color?habitColorPalette[color]:fallback;
}
