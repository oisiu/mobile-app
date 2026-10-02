import { Habit } from '../domain/types';
import { HabitColor,inheritedHabitColor } from '../domain/habitAppearance';

// Muted, earthy swatches complement the cream theme; accents keep charts readable.
export const habitColorPalette={red:'#D3AAA4',orange:'#D7BA98',yellow:'#D5C69B',lime:'#C0C49E',green:'#AEC1AE',teal:'#A8C2BA',cyan:'#ADC0C8',blue:'#AEBBCC',purple:'#C2B2CA',pink:'#D0B0BD',brown:'#C8B5A4',gray:'#BDC0BF'} as const satisfies Record<HabitColor,string>;
export const habitAccentPalette={red:'#9B6661',orange:'#8F7042',yellow:'#827544',lime:'#737B4A',green:'#607863',teal:'#577B76',cyan:'#5D7A88',blue:'#60758B',purple:'#7F6C89',pink:'#936B7B',brown:'#857060',gray:'#73767A'} as const satisfies Record<HabitColor,string>;
export function habitAccent(habit:Habit,habits:Habit[],fallback:string):string {
  const color=inheritedHabitColor(habit,habits);return color?habitAccentPalette[color]:fallback;
}

const chartFallbacks=[habitAccentPalette.green,habitAccentPalette.blue,habitAccentPalette.red,habitAccentPalette.purple,habitAccentPalette.orange,habitAccentPalette.teal,habitAccentPalette.pink,habitAccentPalette.gray];
export function habitChartColor(habit:Habit,habits:Habit[]):string{
  // Ranking and period changes must not swap automatic series colors.
  const roots=habits.filter(item=>item.parentId===null&&!item.isGeneral&&!item.archivedAt).sort((a,b)=>a.sortOrder-b.sortOrder||a.id.localeCompare(b.id));
  return habitAccent(habit,habits,chartFallbacks[Math.max(0,roots.findIndex(item=>item.id===habit.id))%chartFallbacks.length]);
}
