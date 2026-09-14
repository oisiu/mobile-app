import { describe,expect,it } from 'vitest';
import { orderedCandidates } from '../src/features/insights/orderedCandidates';
import { Habit } from '../src/domain/types';

const habit=(id:string,parentId:string|null=null,sortOrder=0):Habit=>({id,name:id,emoji:'x',type:'boolean',parentId,sortOrder,isGeneral:false,archivedAt:null,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'});

describe('Insights selector order',()=>{
  it('keeps nested subtrees together and sorts siblings from shuffled storage rows',()=>{
    const root=habit('root');
    const habits=[habit('b2','b',1),habit('a2','a',1),habit('b','root',1),habit('a11','a1'),root,habit('a1','a'),habit('b1','b'),habit('a','root')];
    expect(orderedCandidates(habits,root).map(h=>h.id)).toEqual(['root','a','a1','a11','a2','b','b1','b2']);
    expect(habits[0].id).toBe('b2');
    expect(orderedCandidates(habits,habits[5]).map(h=>h.id)).toEqual(['a1','a11']);
  });
  it('excludes hidden and archived branches and unrelated roots',()=>{
    const root=habit('root');
    expect(orderedCandidates([root,{...habit('hidden','root'),isGeneral:true},{...habit('archived','root'),archivedAt:'2026-01-01'},habit('child','archived'),habit('other'),habit('visible','root')],root).map(h=>h.id)).toEqual(['root','visible']);
  });
  it('handles deep trees without recursive traversal',()=>{
    const habits=Array.from({length:1000},(_,i)=>habit(String(i),i?String(i-1):null));
    expect(orderedCandidates([...habits].reverse(),habits[0])).toEqual(habits);
  });
});
