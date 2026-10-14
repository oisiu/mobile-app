import { expect,it } from 'vitest';
import { attachmentCandidates,validateAttachments } from '../src/domain/treeAttachments';
import { Habit } from '../src/domain/types';
const h=(id:string,parentId:string|null=null):Habit=>({id,parentId,name:id,emoji:'✨',type:'boolean',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'',updatedAt:''});
it('offers compatible active roots and descendants while excluding ancestors of staged selections',()=>{
 const habits=[h('target'),h('source'),h('child','source'),h('grandchild','child'),{...h('numeric'),type:'number' as const},{...h('general','source'),isGeneral:true},{...h('archived'),archivedAt:'now'},h('archived-child','archived')];
 expect(attachmentCandidates(habits,'boolean',new Set(['target','grandchild'])).map(h=>h.id)).toEqual([]);
 expect(attachmentCandidates(habits,'boolean',new Set(['target'])).map(h=>h.id)).toEqual(['source','child','grandchild']);
});
it('accepts a subtree under a temporary child and includes all editable descendant IDs',()=>{
 const habits=[h('target'),h('source'),h('child','source'),{...h('general','source'),isGeneral:true}];
 expect([...validateAttachments(habits,'target',[{key:'draft',parentKey:'target'}],[{id:'source',parentKey:'draft',expectedParentId:null,index:0}])]).toEqual(['target','source','child']);
});
it('rejects missing destinations, archived sources and invalid positions',()=>{
 const habits=[h('target'),h('source'),{...h('archived'),archivedAt:'now'}];
 for(const move of [{id:'source',parentKey:'missing',expectedParentId:null},{id:'missing',parentKey:'target',expectedParentId:null},{id:'archived',parentKey:'target',expectedParentId:null},{id:'source',parentKey:'target',expectedParentId:null,index:-1}])expect(()=>validateAttachments(habits,'target',[],[move])).toThrow();
});
