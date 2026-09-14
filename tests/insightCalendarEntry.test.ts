import { describe,expect,it } from 'vitest';
import { calendarDraft,calendarEntry,calendarInputValue,changeCalendarUnit,toggledCalendarValue } from '../src/features/insights/calendarEntry';
import { Entry,Habit } from '../src/domain/types';
const now='2026-09-08T12:00:00Z',date='2026-09-08';
const habit=(id:string,type:Habit['type']='boolean',parentId:string|null=null,isGeneral=false):Habit=>({id,name:id,emoji:'📖',type,parentId,isGeneral,sortOrder:0,archivedAt:null,createdAt:now,updatedAt:now});
const entry=(habitId:string,value:number,localDate=date):Entry=>({id:habitId+localDate,habitId,value,localDate,occurredAt:now,timezone:'UTC',createdAt:now,updatedAt:now});

describe('Insights Calendar editing',()=>{
  it('toggles an absent, active, or explicit-zero Boolean record directly',()=>{
    const leaf=habit('leaf');
    expect(toggledCalendarValue(leaf,[leaf],[],date)).toBe(1);
    expect(toggledCalendarValue(leaf,[leaf],[entry('leaf',1)],date)).toBeNull();
    expect(toggledCalendarValue(leaf,[leaf],[entry('leaf',0)],date)).toBe(1);
    expect(toggledCalendarValue(leaf,[leaf],[entry('leaf',1,'2026-09-07')],date)).toBe(1);
  });
  it('targets only the parent General record, independently of active descendants',()=>{
    const parent=habit('parent'),general=habit('general','boolean','parent',true),child=habit('child','boolean','parent'),habits=[parent,general,child],records=[entry('child',1)];
    expect(calendarEntry(parent,habits,records,date)).toBeUndefined();
    expect(toggledCalendarValue(parent,habits,records,date)).toBe(1);
    records.push(entry('general',1));
    expect(calendarEntry(parent,habits,records,date)?.habitId).toBe('general');
    expect(toggledCalendarValue(parent,habits,records,date)).toBeNull();
    expect(records[0].value).toBe(1);
  });
  it('keeps a saved zero distinguishable from a missing record',()=>{
    const number=habit('number','number'),record=calendarEntry(number,[number],[entry('number',0)],date);
    expect(record).toBeDefined();
    expect(calendarDraft(number,date,record!.value).value).toBe('0');
    expect(calendarDraft(number,date,null).value).toBe('');
  });
  it('opens whole hours in hours and other durations in minutes',()=>{
    const duration=habit('duration','duration');
    expect(calendarDraft(duration,date,7200)).toMatchObject({unit:'hours',value:'2'});
    expect(calendarDraft(duration,date,90)).toMatchObject({unit:'minutes',value:'1.5'});
  });
  it.each([1,59,60,90,3599,3600,5400,86399])('preserves %s seconds across unit changes',seconds=>{
    const duration=habit('duration','duration'),draft=calendarDraft(duration,date,seconds),hours=changeCalendarUnit(draft,'hours'),minutes=changeCalendarUnit(hours,'minutes');
    expect(calendarInputValue(duration,hours)).toBe(seconds);
    expect(calendarInputValue(duration,minutes)).toBe(seconds);
  });
  it('preserves incomplete drafts when changing units and rejects invalid saves',()=>{
    const duration=habit('duration','duration');
    for(const value of ['','.']){
      const draft={date,unit:'minutes' as const,value};
      expect(changeCalendarUnit(draft,'hours').value).toBe(value);
      expect(calendarInputValue(duration,draft)).toBeNull();
    }
    expect(calendarInputValue(duration,{date,unit:'minutes',value:'0.001'})).toBeNull();
    expect(calendarInputValue(habit('number','number'),{date,unit:'minutes',value:'2.5'})).toBe(2.5);
    expect(calendarInputValue(duration,{date,unit:'minutes',value:'0'})).toBe(0);
  });
});
