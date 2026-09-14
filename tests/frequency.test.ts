import { describe,expect,it } from 'vitest';
import { buildFrequency } from '../src/domain/frequency';
import { Entry,Habit } from '../src/domain/types';
const now='2026-09-08T12:00:00Z';
const habit:Habit={id:'a',name:'Reading',emoji:'📖',type:'boolean',parentId:null,isGeneral:false,sortOrder:0,archivedAt:null,createdAt:now,updatedAt:now};
const entry=(date:string,value=1,habitId='a'):Entry=>({id:habitId+date,habitId,localDate:date,value,occurredAt:now,timezone:'UTC',createdAt:now,updatedAt:now});

describe('Frequency chart',()=>{
  it('labels every month across the year boundary',()=>{
    const {months}=buildFrequency(habit,[habit],[],'2026-09-08');
    expect(months).toHaveLength(13);
    expect(months[0].key).toBe('2025-09');
    expect(months.at(-1)!.key).toBe('2026-09');
    for(const month of months){
      expect(month.label).toHaveLength(1);
      expect(month.label[0]).toBe(month.label[0].toLocaleUpperCase());
    }
  });
  it('loads earlier months without changing counts in the existing timeline',()=>{
    const entries=[entry('2023-02-02'),entry('2026-09-01'),entry('2026-09-29')];
    const recent=buildFrequency(habit,[habit],entries,'2026-09-08');
    const expanded=buildFrequency(habit,[habit],entries,'2026-09-08','2023-02');
    expect(expanded.months[0].key).toBe('2023-02');
    expect(expanded.months.at(-1)!.key).toBe('2026-09');
    expect(expanded.rows[3][0]).toMatchObject({count:1,possible:4});
    expanded.rows.forEach((row,index)=>expect(row.slice(-13)).toEqual(recent.rows[index]));
  });
  it('keeps no activity at the smallest size',()=>{
    const {rows}=buildFrequency(habit,[habit],[],'2026-09-08');
    expect(rows.flat().every(cell=>cell.count===0&&cell.size===4&&cell.intensity===0)).toBe(true);
  });
  it('grows from one to all five Tuesdays without treating an early occurrence as complete',()=>{
    const dates=['2026-09-01','2026-09-08','2026-09-15','2026-09-22','2026-09-29'];
    const sizes=dates.map((today,index)=>{
      const cell=buildFrequency(habit,[habit],dates.slice(0,index+1).map(date=>entry(date)),today).rows[1][12];
      expect(cell.possible).toBe(5);
      expect(cell.intensity).toBe((index+1)/5);
      return cell.size;
    });
    [7.6,11.2,14.8,18.4,22].forEach((size,index)=>expect(sizes[index]).toBeCloseTo(size));
  });
  it('accounts for leap February and excludes zero and future records',()=>{
    const {rows}=buildFrequency(habit,[habit],[entry('2024-02-01'),entry('2024-02-08',0),entry('2024-02-29')],'2024-02-15');
    expect(rows[3][12]).toMatchObject({possible:5,count:1,intensity:.2});
  });
  it('counts a parent once per active date across its children',()=>{
    const children=[{...habit,id:'b',parentId:'a'},{...habit,id:'c',parentId:'a'}];
    const result=buildFrequency(habit,[habit,...children],[entry('2026-09-01',1,'b'),entry('2026-09-01',1,'c'),entry('2026-09-08',1,'b')],'2026-09-08');
    expect(result.rows[1][12].count).toBe(2);
  });
});
