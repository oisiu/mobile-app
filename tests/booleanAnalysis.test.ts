import { expect,it } from 'vitest';
import { booleanAnalysis } from '../src/domain/booleanAnalysis';
import { aggregate } from '../src/domain/aggregation';
import { buildHistorySeries,buildHistoryWindow } from '../src/domain/history';
import { strengthSummary } from '../src/domain/habitStrength';
import { buildFrequency } from '../src/domain/frequency';
import { bestActivityStreaks } from '../src/domain/analytics';
import { Entry,Habit } from '../src/domain/types';
const date='2026-09-08';
const habit=(id:string,type:Habit['type'],parentId:string|null=null):Habit=>({id,type,parentId,name:id,emoji:'',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:date,updatedAt:date});
const entry=(habitId:string,localDate:string,value:number):Entry=>({id:habitId+localDate,habitId,localDate,value,occurredAt:date,timezone:'UTC',createdAt:date,updatedAt:date});

it.each(['number','duration'] as const)('derives all Boolean charts from %s record presence without changing stored data',type=>{
  const root=habit('root',type),child=habit('child',type,'root'),general={...habit('general',type,'root'),isGeneral:true,sortOrder:-1},archived={...habit('old',type,'root'),archivedAt:date},boolean=habit('boolean','boolean');
  const habits=[root,child,general,archived,boolean],entries=[entry('child','2026-09-07',120),entry('general','2026-09-07',60),entry('old',date,0),entry('boolean',date,0),entry('child','2026-09-09',90)],before=JSON.stringify({habits,entries});
  const view=booleanAnalysis(habits,entries),projected=view.habits[0],window=buildHistoryWindow('week',date,date);
  expect(aggregate(view.habits,view.entries,'root',new Set([date]))).toBe(1);
  expect(aggregate(view.habits,view.entries,'root',new Set(['2026-09-06']))).toBe(0);
  expect(aggregate(view.habits,view.entries,'boolean',new Set([date]))).toBe(0);
  expect(buildHistorySeries([projected],view.habits,view.entries,window.buckets)[0].values).toEqual([1,1,0,0,0,0,0]);
  const summary=strengthSummary(projected,view.habits,view.entries,date);expect(summary.total).toBe(2);expect(summary.current).toBeGreaterThan(0);
  expect(buildFrequency(projected,view.habits,view.entries,date,'2026-09').rows.map(row=>row[0].count)).toEqual([1,1,0,0,0,0,0]);
  const active=new Set(['2026-09-06','2026-09-07',date].filter(day=>aggregate(view.habits,view.entries,'root',new Set([day]))>0));expect(bestActivityStreaks(active)[0]).toMatchObject({start:'2026-09-07',end:date,length:2});
  const compared=buildHistorySeries([projected,view.habits[1]],view.habits,view.entries,window.buckets);expect(compared.reduce((sum,item)=>sum+item.values[0],0)).toBe(1);
  expect(JSON.stringify({habits,entries})).toBe(before);expect(view.habits[4]).toBe(boolean);expect(view.entries[3]).toBe(entries[3]);
});

it('handles empty data',()=>{expect(booleanAnalysis([],[])).toEqual({habits:[],entries:[]})});
