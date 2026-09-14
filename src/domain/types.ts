export type HabitType = 'boolean' | 'number' | 'duration';
export interface Habit { id:string; parentId:string|null; name:string; emoji:string; type:HabitType; sortOrder:number; isGeneral:boolean; archivedAt:string|null; createdAt:string; updatedAt:string }
export interface Entry { id:string; habitId:string; value:number; occurredAt:string; localDate:string; timezone:string; createdAt:string; updatedAt:string }
export interface HabitNode extends Habit { children:HabitNode[] }
export interface CreateHabitInput { name:string; emoji:string; type:HabitType; parentId:string|null }
export interface EntryInput { habitId:string; value:number; localDate:string; occurredAt?:string; timezone?:string }
export interface ExportData { version:1; exportedAt:string; habits:Habit[]; entries:Entry[] }
