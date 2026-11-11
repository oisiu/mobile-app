import { expect,it } from 'vitest';
import { archivedBranchIds,buildTree,descendants } from '../src/domain/tree';
import type { Habit } from '../src/domain/types';

const habit=(id:string,parentId:string|null=null,sortOrder=0):Habit=>({id,parentId,sortOrder,name:id,emoji:'',type:'number',isGeneral:false,archivedAt:null,createdAt:'',updatedAt:''});

it('keeps active descendants of archived ancestors inside the archived branch instead of promoting them',()=>{
 const root=habit('root'),archived={...habit('archived','root'),archivedAt:'2026-01-01'},leaf=habit('leaf','archived');
 const general={...habit('general','archived',-1),isGeneral:true};
 const habits=[leaf,general,archived,root,habit('active','root',1)];
 expect([...archivedBranchIds(habits)]).toEqual(['archived','leaf','general']);
 const visible=buildTree(habits);
 expect(visible.map(node=>node.id)).toEqual(['root']);expect(visible[0].children.map(node=>node.id)).toEqual(['active']);
 const complete=buildTree(habits,true);
 expect(complete[0].children.map(node=>node.id)).toEqual(['archived','active']);expect(complete[0].children[0].children.map(node=>node.id)).toEqual(['leaf']);
 expect(leaf.archivedAt).toBeNull();expect(archivedBranchIds([root,leaf]).size).toBe(0);
});

it('traverses deep trees without recursive sorting or repeatedly scanning the whole snapshot',()=>{
 const habits=Array.from({length:12000},(_,index)=>habit(String(index),index?String(index-1):null));
 const root=buildTree([...habits].reverse())[0];
 let node=root,depth=1;
 while(node.children.length){node=node.children[0];depth++}
 expect(depth).toBe(12000);expect(node.id).toBe('11999');
 const children=descendants(habits,'0');expect(children).toHaveLength(11999);expect(children[0]).toBe(habits[1]);expect(children.at(-1)).toBe(habits.at(-1));
});

it('keeps breadth-first order and terminates safely on a cyclic snapshot',()=>{
 const habits=[habit('root','deep'),habit('a','root'),habit('b','root',1),habit('deep','a')];
 expect(descendants(habits,'root').map(habit=>habit.id)).toEqual(['a','b','deep']);
 expect([...archivedBranchIds(habits.map(h=>h.id==='a'?{...h,archivedAt:'now'}:h))].sort()).toEqual(['a','b','deep','root']);
 expect(descendants(habits,'missing')).toEqual([]);
});
