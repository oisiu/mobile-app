import { expect,it } from 'vitest';
import { habitStrength,strengthSummary } from '../src/domain/habitStrength';
import { Entry,Habit } from '../src/domain/types';
import { addDays } from '../src/utils/dates';
const habit:Habit={id:'root',name:'Root',emoji:'🌱',parentId:null,isGeneral:false,type:'boolean',sortOrder:0,archivedAt:null,createdAt:'2026-01-01',updatedAt:'2026-01-01'};
const entry=(date:string,value=1,habitId='root'):Entry=>({id:habitId+date,habitId,localDate:date,value,occurredAt:date,timezone:'UTC',createdAt:date,updatedAt:date});
const bucket=(...dates:string[])=>({key:dates[0]??'empty',label:'',dates:new Set(dates)});
it('starts at zero, rises to 50% after thirteen days, and halves after thirteen missed days',()=>{
  const entries=Array.from({length:13},(_,i)=>entry(addDays('2026-01-01',i)));
  const values=habitStrength(habit,[habit],entries,[bucket('2025-12-31'),bucket('2026-01-01'),bucket('2026-01-13'),bucket('2026-01-26')]);
  expect(values[0]).toBe(0);expect(values[1]).toBeCloseTo(5.1922,3);expect(values[2]).toBeCloseTo(50);expect(values[3]).toBeCloseTo(25);
});
it('carries strength into historical windows and averages daily strength for larger buckets',()=>{
  const entries=[entry('2025-12-31'),entry('2026-01-02')];
  const daily=habitStrength(habit,[habit],entries,[bucket('2026-01-01'),bucket('2026-01-02')]);
  expect(habitStrength(habit,[habit],entries,[bucket('2026-01-01','2026-01-02')])[0]).toBeCloseTo((daily[0]+daily[1])/2);
  expect(daily[0]).toBeGreaterThan(0);
});
it('counts branch activity once, includes archived and direct records, and ignores zeros and unrelated records',()=>{
  const a={...habit,id:'a',parentId:'root',archivedAt:'2026-02-01'},b={...habit,id:'b',parentId:'root',isGeneral:true};
  const buckets=[bucket('2026-01-01'),bucket('2026-01-02')];
  expect(habitStrength(habit,[habit,a,b],[entry('2026-01-01',1,'a'),entry('2026-01-01',100,'b'),entry('2026-01-02',0,'a'),entry('2026-01-02',1,'other')],buckets)).toEqual(habitStrength(habit,[habit],[entry('2026-01-01')],buckets));
});
it('ignores future activity and handles empty data and empty buckets',()=>{
  expect(habitStrength(habit,[habit],[entry('2027-01-01')],[bucket('2026-01-01'),bucket()])).toEqual([0,0]);
  expect(habitStrength(habit,[habit],[],[bucket('2026-01-01')])).toEqual([0]);
});

it('summarizes current strength, 30/365-day changes and unique past activity',()=>{
  const entries=[entry('2025-01-01'),entry('2025-12-02'),entry('2026-01-01'),entry('2026-01-02')];
  const summary=strengthSummary(habit,[habit],entries,'2026-01-01');
  const values=habitStrength(habit,[habit],entries,[bucket('2025-01-01'),bucket('2025-12-02'),bucket('2026-01-01')]);
  expect(summary.current).toBeCloseTo(values[2]);
  expect(summary.monthChange).toBeCloseTo(values[2]-values[1]);
  expect(summary.yearChange).toBeCloseTo(values[2]-values[0]);
  expect(summary.total).toBe(3);
});
it('keeps summary totals deduplicated across children and zero for empty habits',()=>{
  const a={...habit,id:'a',parentId:'root'},b={...habit,id:'b',parentId:'root'};
  expect(strengthSummary(habit,[habit,a,b],[entry('2026-01-01',1,'a'),entry('2026-01-01',1,'b'),entry('2026-01-02',0,'a')],'2026-01-02').total).toBe(1);
  expect(strengthSummary(habit,[habit],[],'2026-01-01')).toEqual({current:0,monthChange:0,yearChange:0,total:0});
});
