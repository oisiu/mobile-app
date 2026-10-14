import { expect,it } from 'vitest';
import { planHabitTypeChange,validHistoryValue,typeChangeTargets,HabitTypeChange } from '../src/domain/habitTypeChange';
import { Entry,Habit,HabitType } from '../src/domain/types';
const h=(id:string,type:HabitType,parentId:string|null=null):Habit=>({id,type,parentId,name:id,emoji:'✨',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'created',updatedAt:'updated'});
const e=(id:string,value:number,habitId='root'):Entry=>({id,value,habitId,localDate:'2025-01-01',occurredAt:'occurred',timezone:'UTC',createdAt:'created',updatedAt:'updated'});
const request=(from:HabitType,to:HabitType,entries:Entry[],patch:Partial<HabitTypeChange>={}):HabitTypeChange=>({from,to,expectedHabitIds:['root'],expectedEntries:entries,...patch});
it.each(['number','duration'] as const)('maps saved Boolean Yes to a selected %s value and preserves stored No',to=>{
 const entries=[e('yes',1),e('no',0)],plan=planHabitTypeChange([h('root','boolean')],entries,'root',request('boolean',to,entries,{trueValue:to==='number'?2.5:90}));
 expect(plan.entries.map(row=>row.value)).toEqual([to==='number'?2.5:90,0]);expect(entries.map(row=>row.value)).toEqual([1,0]);expect(plan.entries[0].entry).toBe(entries[0]);
});
it.each(['number','duration'] as const)('converts all saved %s records, including zero, to Boolean activity',from=>{
 const entries=[e('positive',2),e('zero',0)];expect(planHabitTypeChange([h('root',from)],entries,'root',request(from,'boolean',entries)).entries.map(row=>row.value)).toEqual([1,1]);
});
it('uses a proportional duration equivalence in both directions and rounds to whole seconds',()=>{
 let entries=[e('two',2),e('fraction',0.025),e('zero',0)];expect(planHabitTypeChange([h('root','number')],entries,'root',request('number','duration',entries,{unitDurationSeconds:30})).entries.map(row=>row.value)).toEqual([60,1,0]);
 entries=[e('hour',3600),e('quarter',450)];expect(planHabitTypeChange([h('root','duration')],entries,'root',request('duration','number',entries,{unitDurationSeconds:1800})).entries.map(row=>row.value)).toEqual([2,0.25]);
});
it('includes General and archived descendants while leaving unrelated records untouched',()=>{
 const habits=[h('root','boolean'),{...h('general','boolean','root'),isGeneral:true}, {...h('child','boolean','root'),archivedAt:'archived'},h('other','number')],entries=[e('direct',1,'general'),e('child',1,'child'),e('other',10,'other')];
 const plan=planHabitTypeChange(habits,entries,'root',request('boolean','number',entries.slice(0,2),{trueValue:2,expectedHabitIds:['root','general','child']}));expect(plan.habitIds).toEqual(['root','general','child']);expect(plan.entries.map(row=>row.value)).toEqual([2,2]);
});
it('rejects invalid quantities, fractional seconds, overflows and malformed source values',()=>{
 for(const value of [undefined,0,-1,NaN,Infinity])expect(validHistoryValue('number',value)).toBe(false);
 expect(validHistoryValue('duration',0.5)).toBe(false);expect(validHistoryValue('boolean',1)).toBe(false);expect(validHistoryValue('duration',60)).toBe(true);
 const entries=[e('yes',1)];expect(()=>planHabitTypeChange([h('root','boolean')],entries,'root',request('boolean','duration',entries,{trueValue:0.5}))).toThrow('TYPE_CHANGE_VALUE_INVALID');
 expect(()=>planHabitTypeChange([h('root','number')],[e('huge',1e308)],'root',request('number','duration',[e('huge',1e308)],{unitDurationSeconds:60}))).toThrow('TYPE_CHANGE_VALUE_INVALID');
 expect(()=>planHabitTypeChange([h('root','boolean')],[e('invalid',2)],'root',request('boolean','number',[e('invalid',2)],{trueValue:2}))).toThrow('TYPE_CHANGE_INVALID');
});
it('rejects stale records, changed branches and invalid root conversions',()=>{
 const habits=[h('root','number')],entries=[e('one',1)];
 for(const patch of [{expectedEntries:[]},{expectedEntries:[e('one',2)]},{expectedEntries:[entries[0],entries[0]]},{expectedHabitIds:[]},{expectedHabitIds:['root','root']}])expect(()=>planHabitTypeChange(habits,entries,'root',request('number','boolean',entries,patch))).toThrow('TYPE_CHANGE_STALE');
 for(const id of ['missing','child'])expect(()=>planHabitTypeChange([...habits,h('child','number','root')],entries,id,request('number','boolean',entries))).toThrow('TYPE_CHANGE_INVALID');
 expect(()=>planHabitTypeChange(habits,entries,'root',request('duration','boolean',entries))).toThrow('TYPE_CHANGE_INVALID');
 expect(()=>planHabitTypeChange(habits,entries,'root',request('number','number',entries))).toThrow('TYPE_CHANGE_INVALID');
 expect(typeChangeTargets('duration')).toEqual(['duration','boolean','number']);
});

it('allows zero for a historical Boolean Yes while requiring a positive proportional equivalence',()=>{
 const records=[e('yes',1)];expect(planHabitTypeChange([h('root','boolean')],records,'root',request('boolean','number',records,{trueValue:0})).entries[0].value).toBe(0);
 expect(()=>planHabitTypeChange([h('root','number')],records,'root',request('number','duration',records,{unitDurationSeconds:0}))).toThrow('TYPE_CHANGE_VALUE_INVALID');
});

it('changes an empty branch without requiring an unused historical value',()=>{
 for(const [from,to] of [['boolean','number'],['number','duration'],['duration','number']] as const)expect(planHabitTypeChange([h('root',from)],[],'root',request(from,to,[])).entries).toEqual([]);
});
