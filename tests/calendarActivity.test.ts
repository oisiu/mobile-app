import { describe,expect,it } from 'vitest';
import { calendarActivity } from '../src/domain/calendarActivity';
import { booleanAnalysis } from '../src/domain/booleanAnalysis';
import { Entry,Habit } from '../src/domain/types';
const date='2026-10-25';
const habit=(id:string,parentId:string|null=null,color:Habit['color']=null):Habit=>({id,parentId,color,name:id,emoji:'',type:'number',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'',updatedAt:''});
const entry=(habitId:string,value=1):Entry=>({id:habitId,habitId,value,localDate:date,timezone:'UTC',occurredAt:'',createdAt:'',updatedAt:''});
const root=habit('root',null,'green'),child=habit('child','root','blue'),grandchild=habit('grandchild','child','pink'),general={...habit('general','root'),isGeneral:true};
describe('Insights calendar activity',()=>{
 it('prefers active descendants over direct parent color and uses the deepest explicit color',()=>{
  const habits=[root,child,grandchild,general];
  expect(calendarActivity([root],habits,[entry('grandchild'),entry('general')],[date]).get(date)).toEqual([{color:'pink',opacity:1}]);
  expect(calendarActivity([root],habits,[entry('general')],[date]).get(date)).toEqual([{color:'green',opacity:1}]);
 });
 it('keeps all active sibling colors and deduplicates overlapping selections',()=>{
  const other=habit('other','root','purple'),habits=[root,child,other];
  expect(calendarActivity([root,child],habits,[entry('child'),entry('other')],[date]).get(date)).toEqual([{color:'blue',opacity:1},{color:'purple',opacity:1}]);
 });
 it('inherits ancestor colors, falls back to Automatic, and includes archived descendant records',()=>{
  const archived={...habit('old','root'),archivedAt:date},plain=habit('plain');
  expect(calendarActivity([root,plain],[root,archived,plain],[entry('old'),entry('plain')],[date]).get(date)).toEqual([{color:'green',opacity:1},{color:null,opacity:1}]);
  expect(calendarActivity([archived],[root,archived],[entry('old')],[date]).get(date)).toEqual([{color:'green',opacity:1}]);
 });
 it('does not color inactive, unselected, missing, or zero-valued records',()=>{
  expect(calendarActivity([root,habit('missing')],[root,child],[entry('child',0),entry('outside')],[date]).size).toBe(0);
 });
 it('keeps thresholds based on original values in Activity mode and favors full intensity for duplicate colors',()=>{
  const thresholdRoot={...root,calendarThreshold:10},habits=[thresholdRoot,child],entries=[entry('child',0)],analysis=booleanAnalysis(habits,entries);
  expect(calendarActivity([analysis.habits[0]],analysis.habits,analysis.entries,[date],habits,entries).get(date)).toEqual([{color:'blue',opacity:.3}]);
  expect(calendarActivity(analysis.habits,analysis.habits,analysis.entries,[date],habits,entries).get(date)).toEqual([{color:'blue',opacity:1}]);
 });
});
