import { describe,expect,it } from 'vitest';
import { buildHistorySeries,buildHistoryWindow,historyAxis,historyWeekLabel,shiftHistoryAnchor } from '../src/domain/history';
import { Entry,Habit } from '../src/domain/types';
const now='2026-09-08T12:00:00Z';
const habit=(id:string,type:Habit['type']='number',parentId:string|null=null,isGeneral=false):Habit=>({id,type,parentId,isGeneral,name:id,emoji:'📖',sortOrder:0,archivedAt:null,createdAt:now,updatedAt:now});
const entry=(habitId:string,date:string,value:number):Entry=>({id:habitId+date,habitId,localDate:date,value,occurredAt:now,timezone:'UTC',createdAt:now,updatedAt:now});

describe('History ranges',()=>{
  it('shows all Monday–Sunday dates with future days empty',()=>{
    const window=buildHistoryWindow('week','2026-09-08','2026-09-08');
    expect(window.buckets.map(bucket=>bucket.key)).toEqual(['2026-09-07','2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12','2026-09-13']);
    expect(window.buckets.map(bucket=>bucket.dates.size)).toEqual([1,1,0,0,0,0,0]);
  });
  it('shows January–December and includes only elapsed days in the current year',()=>{
    const window=buildHistoryWindow('month','2026-09-08','2026-09-08');
    expect(window.buckets.map(bucket=>bucket.key)).toEqual(Array.from({length:12},(_,i)=>`2026-${String(i+1).padStart(2,'0')}`));
    expect(window.buckets[8].dates.size).toBe(8);
    expect(window.buckets[9].dates.size).toBe(0);
  });
  it('groups eight quarters with compact month initials',()=>{
    const window=buildHistoryWindow('quarter','2026-09-08','2026-09-08');
    expect(window.buckets.map(bucket=>bucket.key)).toEqual(['2025-Q1','2025-Q2','2025-Q3','2025-Q4','2026-Q1','2026-Q2','2026-Q3','2026-Q4']);
    expect(window.buckets.every(bucket=>bucket.label.length===3)).toBe(true);
  });
  it('handles historical leap quarters and six years including the current year',()=>{
    const quarterWindow=buildHistoryWindow('quarter','2024-03-10','2026-09-08');
    expect(quarterWindow.buckets).toHaveLength(8);
    expect(quarterWindow.buckets[4].dates.size).toBe(91);
    const window=buildHistoryWindow('year','2026-09-08','2026-09-08');
    expect(window.buckets.map(bucket=>bucket.key)).toEqual(['2021','2022','2023','2024','2025','2026']);
    expect(window.buckets[3].dates.size).toBe(366);
    expect([...window.buckets[5].dates].at(-1)).toBe('2026-09-08');
    expect(buildHistoryWindow('year','2016-01-01','2026-09-08').buckets[5].dates.size).toBe(366);
  });
});

describe('History navigation',()=>{
  it('labels ISO weeks using their week year across calendar boundaries',()=>{
    expect(historyWeekLabel('2026-09-14')).toBe('38 2026');
    expect(historyWeekLabel('2025-03-31')).toBe('14 2025');
    expect(historyWeekLabel('2025-12-29')).toBe('1 2026');
    expect(historyWeekLabel('2026-12-28')).toBe('53 2026');
  });
  it('moves Monday weeks across a year boundary and caps forward movement',()=>{
    expect(shiftHistoryAnchor('2026-01-01','week',-1,'2026-01-01')).toBe('2025-12-22');
    expect(shiftHistoryAnchor('2025-12-22','week',1,'2026-01-01')).toBe('2025-12-29');
    expect(shiftHistoryAnchor('2026-01-01','week',1,'2026-01-01')).toBe('2025-12-29');
  });
  it.each(['month','quarter'] as const)('moves %s by calendar years',period=>{
    expect(shiftHistoryAnchor('2026-09-08',period,-1,'2026-09-08')).toBe(period==='quarter'?'2024-01-01':'2025-01-01');
    expect(shiftHistoryAnchor('2025-01-01',period,1,'2026-09-08')).toBe('2026-01-01');
    expect(shiftHistoryAnchor('2026-09-08',period,1,'2026-09-08')).toBe('2026-01-01');
  });
  it('moves Year by non-overlapping six-year windows',()=>{
    const older=shiftHistoryAnchor('2026-09-08','year',-1,'2026-09-08');
    expect(buildHistoryWindow('year',older,'2026-09-08').buckets.map(bucket=>bucket.key)).toEqual(['2015','2016','2017','2018','2019','2020']);
    expect(shiftHistoryAnchor(older,'year',1,'2026-09-08')).toBe('2026-01-01');
  });
});

describe('History aggregation',()=>{
  it('compares full branch totals without silently replacing selected habits',()=>{
    const root=habit('root'),general=habit('general','number','root',true),child=habit('child','number','root');
    const buckets=buildHistoryWindow('month','2026-09-08','2026-09-08').buckets;
    const series=buildHistorySeries([root,child],[root,child],[root,general,child],[entry('general','2026-01-01',2),entry('child','2026-01-01',3),entry('child','2025-01-01',99),entry('child','2026-10-01',99)],buckets);
    expect(series.map(item=>item.habit.id).sort()).toEqual(['child','root']);
    expect(series.find(item=>item.habit.id==='root')!.values[0]).toBe(5);
    expect(series.find(item=>item.habit.id==='child')!.values[0]).toBe(3);
    expect(series.every(item=>item.values[9]===0)).toBe(true);
  });
  it('counts Boolean branch activity once per day, including hidden descendants',()=>{
    const root=habit('root','boolean'),a=habit('a','boolean','root'),b=habit('b','boolean','root');
    const buckets=buildHistoryWindow('year','2026-09-08','2026-09-08').buckets;
    const [series]=buildHistorySeries([root],[root],[root,a,b],[entry('a','2026-01-01',1),entry('b','2026-01-01',1),entry('a','2026-01-02',1),entry('b','2026-01-03',0)],buckets);
    expect(series.values[5]).toBe(2);
  });
  it('sums duration seconds across quarters and leaves empty buckets at zero',()=>{
    const leaf=habit('leaf','duration'),buckets=buildHistoryWindow('quarter','2026-09-08','2026-09-08').buckets;
    expect(buildHistorySeries([leaf],[leaf],[leaf],[entry('leaf','2026-01-01',3600),entry('leaf','2026-03-31',1800),entry('leaf','2026-04-01',60)],buckets)[0].values).toEqual([0,0,0,0,5400,60,0,0]);
    expect(buildHistorySeries([leaf],[leaf],[leaf],[],buckets)[0].values).toEqual([0,0,0,0,0,0,0,0]);
  });
});

describe('History Y-axis',()=>{
  it.each([0,1,3,8,17,100,1200,25000,.002,.35,2.75])('uses rounded steps covering a numeric peak of %s',value=>{
    const axis=historyAxis([value],'number');
    expect(axis.max).toBeGreaterThanOrEqual(value);
    expect(axis.ticks[0]).toBe(0);
    expect(axis.ticks.at(-1)).toBe(axis.max);
    expect(axis.ticks.length).toBeGreaterThanOrEqual(2);
    expect(axis.ticks.length).toBeLessThanOrEqual(6);
    expect(new Set(axis.ticks).size).toBe(axis.ticks.length);
    expect(axis.ticks.every(tick=>Number.isFinite(tick))).toBe(true);
  });
  it('keeps Boolean active-day ticks whole and handles empty inputs',()=>{
    expect(historyAxis([1],'boolean').ticks).toEqual([0,1]);
    expect(historyAxis([7],'boolean').ticks).toEqual([0,2,4,6,8]);
    expect(historyAxis([],'number').ticks).toEqual([0,1,2,3,4]);
  });
  it.each([[45,1,'seconds'],[90,60,'minutes'],[5400,3600,'hours']] as const)('scales %s duration seconds with a visible unit', (value,divisor,unit)=>{
    const axis=historyAxis([value],'duration');
    expect(axis.divisor).toBe(divisor);
    expect(axis.unit).toBe(unit);
    expect(axis.max*axis.divisor).toBeGreaterThanOrEqual(value);
  });
});


describe('History overlapping selections',()=>{
  it.each(['boolean','number','duration'] as const)('retains exact selected %s branches and intermediate General contributions',type=>{
    const root=habit('sport',type),gym=habit('gym',type,'sport'),arms=habit('arms',type,'gym'),legs=habit('legs',type,'gym'),general=habit('general',type,'gym',true);
    const habits=[root,gym,arms,legs,general],value=type==='boolean'?1:8;
    const entries=[entry('arms','2026-01-01',value),entry('legs','2026-01-01',value),entry('general','2026-01-01',value)];
    const buckets=buildHistoryWindow('month','2026-09-08','2026-09-08').buckets;
    const series=buildHistorySeries([root,gym,arms,root],habits,habits,entries,buckets);
    expect(series.map(s=>s.habit.id)).toEqual(['sport','gym','arms']);
    expect(series.map(s=>s.values[0])).toEqual(type==='boolean'?[1,1,1]:[24,24,8]);
    expect(series[0].records[0]).toHaveLength(3);
    expect(buildHistorySeries([root],[root],habits,entries,buckets)[0].values[0]).toBe(type==='boolean'?1:24);
  });
  it('includes archived branches and zeros while leaving an empty selection empty',()=>{
    const root=habit('root'),child={...habit('child','number','root'),archivedAt:now},buckets=buildHistoryWindow('week','2026-09-08','2026-09-08').buckets;
    const entries=[entry('child','2026-09-07',0),entry('child','2026-09-08',8)];
    const [series]=buildHistorySeries([root],[root],[root,child],entries,buckets);
    expect(series.values.slice(0,2)).toEqual([0,8]);expect(series.records[0]).toHaveLength(1);
    expect(buildHistorySeries([],[root],[root,child],entries,buckets)).toEqual([]);
  });
});
