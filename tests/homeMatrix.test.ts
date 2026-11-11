import { expect,it } from 'vitest';
import { buildTree } from '../src/domain/tree';
import type { Habit,Entry } from '../src/domain/types';
import { homeDayValues,visibleHomeHabits } from '../src/features/home/homeMatrix';

const habit=(id:string,parentId:string|null=null,type:Habit['type']='number',sortOrder=0):Habit=>({id,name:id,parentId,type,sortOrder,emoji:'',isGeneral:false,archivedAt:null,createdAt:'',updatedAt:''});
const entry=(habitId:string,value:number,localDate='2026-09-08'):Entry=>({id:habitId+localDate,habitId,value,localDate,occurredAt:'',timezone:'UTC',createdAt:'',updatedAt:''});

it('flattens expanded branches in saved order and marks only the end of each root group',()=>{
 const tree=buildTree([habit('b',null,'number',1),habit('a'),habit('a2','a','number',1),habit('a1','a'),habit('deep','a1')]);
 const expanded=visibleHomeHabits(tree,new Set(['a','a1']));
 expect(expanded.map(({habit,depth,rootId,groupEnd})=>[habit.id,depth,rootId,groupEnd])).toEqual([
  ['a',0,'a',false],['a1',1,'a',false],['deep',2,'a',false],['a2',1,'a',true],['b',0,'b',true],
 ]);
 expect(visibleHomeHabits(tree,new Set()).map(({habit,groupEnd})=>[habit.id,groupEnd])).toEqual([['a',true],['b',true]]);
});

it('computes only mounted rows and dates while preserving direct and archived descendant totals',()=>{
 const habits=[habit('root'),habit('child','root'),{...habit('general','root'),isGeneral:true},{...habit('archived','root'),archivedAt:'2026-09-01'}];
 const items=visibleHomeHabits(buildTree(habits),new Set());
 const values=homeDayValues(items,habits,[entry('child',3),entry('general',2),entry('archived',4),entry('child',99,'2026-09-07')],['2026-09-08','2026-09-06']);
 expect([...values.keys()]).toEqual(['root']);
 expect([...values.get('root')!]).toEqual([['2026-09-08','9'],['2026-09-06','–']]);
});

it.each(['boolean','duration'] as const)('retains %s formatting in historical windows',type=>{
 const habits=[habit('root',null,type)],items=visibleHomeHabits(buildTree(habits),new Set());
 const values=homeDayValues(items,habits,[entry('root',type==='boolean'?1:5400,'2025-01-01')],['2025-01-01']);
 expect(values.get('root')?.get('2025-01-01')).toBe(type==='boolean'?'✓':'1h 30m');
});

it('returns no display data when no habit rows are mounted',()=>{
 expect(homeDayValues([],[],[],['2026-09-08']).size).toBe(0);
 expect(visibleHomeHabits([],new Set())).toEqual([]);
});

it('reuses the immutable entry index across adjacent scrolling windows',()=>{
 const habits=[habit('root')],items=visibleHomeHabits(buildTree(habits),new Set());
 let dateReads=0;
 const stored=entry('root',7,'2026-09-08');
 Object.defineProperty(stored,'localDate',{get:()=>{dateReads++;return '2026-09-08'}});
 const entries=[stored];
 expect(homeDayValues(items,habits,entries,['2026-09-08']).get('root')?.get('2026-09-08')).toBe('7');
 dateReads=0;
 const next=homeDayValues(items,habits,entries,['2026-09-07','2026-09-08']);
 expect(next.get('root')?.get('2026-09-08')).toBe('7');expect(dateReads).toBe(0);
 const updated=[entry('root',9,'2026-09-08')];
 expect(homeDayValues(items,habits,updated,['2026-09-08']).get('root')?.get('2026-09-08')).toBe('9');
});
