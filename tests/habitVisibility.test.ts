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

it('reveals only the explicitly opened active hidden root without changing its saved visibility',()=>{
 const habits=[{...habit('first'),isHidden:true},habit('child','first'),{...habit('general','first'),isGeneral:true},{...habit('other'),isHidden:true},habit('other-child','other'),habit('visible')];
 const entries=habits.map(h=>entry(h.id)),before=JSON.stringify({habits,entries});
 const revealed=visibleHabitSnapshot(habits,entries,'first');
 expect(revealed.habits.map(h=>h.id)).toEqual(['first','child','general','visible']);expect(revealed.entries.map(e=>e.habitId)).toEqual(['first','child','general','visible']);
 expect(revealed.habits[0].isHidden).toBe(true);expect(JSON.stringify({habits,entries})).toBe(before);
 expect(visibleHabitSnapshot(habits,entries).habits.map(h=>h.id)).toEqual(['visible']);
 for(const id of ['child','missing','other-child'])expect(visibleHabitSnapshot(habits,entries,id).habits.map(h=>h.id)).toEqual(['visible']);
 expect(visibleHabitSnapshot(habits.map(h=>h.id==='first'?{...h,archivedAt:'now'}:h),entries,'first').habits.map(h=>h.id)).toEqual(['visible']);
});
