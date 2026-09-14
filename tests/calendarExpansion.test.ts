import { describe,expect,it } from 'vitest';
import { calendarExpandedGroups } from '../src/domain/calendarExpansion';
import { Entry,Habit } from '../src/domain/types';

const timestamp='2026-01-01T00:00:00Z',date='2026-09-03';
const habit=(id:string,parentId:string|null=null):Habit=>({id,parentId,name:id,emoji:'x',type:'number',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:timestamp,updatedAt:timestamp});
const entry=(habitId:string,localDate=date,value=1):Entry=>({id:`${habitId}-${localDate}`,habitId,localDate,value,occurredAt:timestamp,timezone:'UTC',createdAt:timestamp,updatedAt:timestamp});
const habits=[habit('root'),habit('branch','root'),habit('leaf','branch'),habit('empty','root'),habit('empty-leaf','empty'),habit('other'),habit('other-leaf','other')];

describe('Calendar day expansion',()=>{
  it('opens only the ancestor path of a recorded nested habit',()=>{
    expect(calendarExpandedGroups(habits,[entry('leaf')],date)).toEqual(new Set(['root','branch']));
  });
  it('keeps groups collapsed when records are only on another day',()=>{
    expect(calendarExpandedGroups(habits,[entry('leaf','2026-09-02')],date)).toEqual(new Set());
  });
  it('treats a saved zero as a record worth revealing',()=>{
    expect(calendarExpandedGroups(habits,[entry('leaf',date,0)],date)).toEqual(new Set(['root','branch']));
  });
  it('opens a parent with its own General record without expanding empty subgroups',()=>{
    const general={...habit('general','root'),isGeneral:true};
    expect(calendarExpandedGroups([...habits,general],[entry('general')],date)).toEqual(new Set(['root']));
  });
  it('visits all recorded branches and ignores missing and archived leaves',()=>{
    const archived={...habit('archived','empty'),archivedAt:timestamp};
    expect(calendarExpandedGroups([...habits,archived],[entry('leaf'),entry('other-leaf'),entry('archived'),entry('missing')],date)).toEqual(new Set(['root','branch','other']));
  });
  it('does not expand leaf habits or an empty tree',()=>{
    expect(calendarExpandedGroups([habit('leaf')],[entry('leaf')],date)).toEqual(new Set());
    expect(calendarExpandedGroups([],[],date)).toEqual(new Set());
  });
});
