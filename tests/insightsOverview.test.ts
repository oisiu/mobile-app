import { describe,expect,it } from 'vitest';
import { buildInsightsOverview } from '../src/domain/insightsOverview';
import { Entry,Habit } from '../src/domain/types';

const timestamp='2026-01-01T00:00:00Z';
const habit=(id:string,type:Habit['type']='number',parentId:string|null=null,sortOrder=0):Habit=>({id,name:id,emoji:'x',type,parentId,sortOrder,isGeneral:false,archivedAt:null,createdAt:timestamp,updatedAt:timestamp});
const entry=(habitId:string,localDate:string,value:number):Entry=>({id:`${habitId}-${localDate}`,habitId,localDate,value,occurredAt:timestamp,timezone:'UTC',createdAt:timestamp,updatedAt:timestamp});

describe('monthly Insights overview',()=>{
  it('ranks the elapsed Monday–today week across month and year boundaries',()=>{
    const habits=[habit('week'),habit('outside')];
    const entries=[entry('week','2025-12-29',2),entry('week','2026-01-01',3),entry('week','2026-01-02',99),entry('outside','2025-12-28',100)];
    const result=buildInsightsOverview(habits,entries,'2026-01-01','week');
    expect(result.elapsedDays).toBe(4);
    expect(result.ranked.map(({habit,active,total})=>({id:habit.id,active,total}))).toEqual([{id:'week',active:2,total:5},{id:'outside',active:0,total:0}]);
    expect(buildInsightsOverview(habits,entries,'2026-01-01','month').elapsedDays).toBe(1);
  });
  it.each(['2026-09-01','2026-09-03','2026-04-30','2026-01-31','2024-02-29','2026-02-28'])('uses elapsed calendar days on %s',today=>{
    const result=buildInsightsOverview([habit('a')],[entry('a',`${today.slice(0,7)}-01`,2)],today);
    expect(result.elapsedDays).toBe(Number(today.slice(-2)));
    expect(result.ranked[0]).toMatchObject({active:1,total:2});
  });

  it('includes early-month records and excludes previous-month and future records',()=>{
    const result=buildInsightsOverview([habit('a')],[entry('a','2026-08-31',100),entry('a','2026-09-01',2),entry('a','2026-09-15',3),entry('a','2026-09-16',100)],'2026-09-15');
    expect(result.ranked[0]).toMatchObject({active:2,total:5});
    expect(result.elapsedDays).toBe(15);
  });

  it('ranks by active days, then total, then manual sibling order',()=>{
    const habits=[habit('frequent'),habit('large'),habit('tie-last','number',null,3),habit('tie-first','number',null,2)];
    const entries=[entry('frequent','2026-09-01',1),entry('frequent','2026-09-02',1),entry('large','2026-09-01',100),entry('tie-last','2026-09-01',5),entry('tie-first','2026-09-01',5)];
    expect(buildInsightsOverview(habits,entries,'2026-09-03').ranked.map(row=>row.habit.id)).toEqual(['frequent','large','tie-first','tie-last']);
  });

  it('counts a Boolean branch once per active day across descendants',()=>{
    const habits=[habit('root','boolean'),habit('child','boolean','root'),{...habit('general','boolean','root'),isGeneral:true}];
    const entries=[entry('child','2026-09-01',1),entry('general','2026-09-01',1),entry('general','2026-09-02',1)];
    const result=buildInsightsOverview(habits,entries,'2026-09-03');
    expect(result.ranked).toHaveLength(1);
    expect(result.ranked[0]).toMatchObject({active:2,total:1});
  });

  it('retains duration seconds, counts zero as inactive, and excludes archived roots',()=>{
    const habits=[habit('duration','duration'),habit('zero'),{...habit('archived'),archivedAt:timestamp}];
    const entries=[entry('duration','2026-09-01',3600),entry('duration','2026-09-02',1800),entry('zero','2026-09-01',0),entry('archived','2026-09-01',99)];
    const result=buildInsightsOverview(habits,entries,'2026-09-03');
    expect(result.ranked.map(({habit,active,total})=>({id:habit.id,active,total}))).toEqual([{id:'duration',active:2,total:5400},{id:'zero',active:0,total:0}]);
  });

  it('returns an empty ranking with a valid denominator when no habits exist',()=>{
    expect(buildInsightsOverview([],[],'2026-01-01')).toEqual({elapsedDays:1,ranked:[]});
  });
});
