import { Habit } from './types';

export const habitColors=['red','orange','yellow','lime','green','teal','cyan','blue','purple','pink','brown','gray'] as const;
export type HabitColor=typeof habitColors[number];
export function isHabitColor(value:unknown):value is HabitColor {return typeof value==='string'&&habitColors.includes(value as HabitColor)}
export function inheritedHabitColor(habit:Habit,habits:Habit[]):HabitColor|null {
  const byId=new Map(habits.map(item=>[item.id,item])),seen=new Set<string>();let current:Habit|undefined=habit;
  while(current&&!seen.has(current.id)){if(current.color)return current.color;seen.add(current.id);current=current.parentId?byId.get(current.parentId):undefined}
  return null;
}
// Match complete emoji sequences without slicing UTF-16 code units or depending on native segmentation.
const base='\\p{Extended_Pictographic}\\uFE0F?\\p{Emoji_Modifier}?';
const emojiPattern=new RegExp(`^(?:${base}(?:\\u200D${base})*|\\p{Regional_Indicator}{2}|[0-9#*]\\uFE0F?\\u20E3|\\u{1F3F4}[\\u{E0061}-\\u{E007A}]+\\u{E007F})(?![\\s\\S])`,'u');
export function isSingleEmoji(value:string):boolean {return value===''||emojiPattern.test(value)}
export function assertHabitAppearance(emoji:string,color:unknown){
  if(!isSingleEmoji(emoji))throw new Error('INVALID_EMOJI');
  if(color!==undefined&&color!==null&&!isHabitColor(color))throw new Error('INVALID_COLOR');
}
