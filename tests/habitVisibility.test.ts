import { expect,it } from 'vitest';
import { visibleHabitSnapshot } from '../src/domain/habitVisibility';
import { Habit,Entry } from '../src/domain/types';
const habit=(id:string,parentId:string|null=null):Habit=>({id,parentId,name:id,emoji:'',type:'number',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'',updatedAt:''});
const entry=(habitId:string):Entry=>({id:habitId,habitId,value:2,localDate:'2026-10-07',occurredAt:'',timezone:'UTC',createdAt:'',updatedAt:''});
it('excludes complete hidden branches including General records without mutating stored data',()=>{
 const habits=[{...habit('hidden'),isHidden:true},habit('child','hidden'),habit('grandchild','child'),{...habit('general','hidden'),isGeneral:true},habit('visible'),habit('other-child','visible')];
 const entries=habits.map(item=>entry(item.id)),before=JSON.stringify({habits,entries});
 const visible=visibleHabitSnapshot(habits,entries);expect(visible.habits.map(item=>item.id)).toEqual(['visible','other-child']);expect(visible.entries.map(item=>item.habitId)).toEqual(['visible','other-child']);expect(JSON.stringify({habits,entries})).toBe(before);
 expect(visibleHabitSnapshot(visible.habits,visible.entries).habits).toBe(visible.habits);
});
it('preserves overview-only exclusions and safely skips previously visited hidden descendants',()=>{
 const habits=[{...habit('root'),hideFromOverview:true},habit('child','root')],entries=[entry('child')];expect(visibleHabitSnapshot(habits,entries)).toEqual({habits,entries});
 expect(visibleHabitSnapshot([{...habit('hidden'),isHidden:true},{...habit('child','hidden'),isHidden:true}],[]).habits).toEqual([]);
});
