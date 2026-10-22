import { expect,it } from 'vitest';
import { validateImport } from '../src/domain/import';
import { Entry,ExportData,Habit } from '../src/domain/types';

const timestamp='2025-01-01T00:00:00Z';
const habit:Habit={id:'habit',parentId:null,name:'Habit',emoji:'',type:'number',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:timestamp,updatedAt:timestamp};
const entry:Entry={id:'entry',habitId:'habit',value:1,localDate:'2025-01-01',occurredAt:timestamp,timezone:'UTC',createdAt:timestamp,updatedAt:timestamp};
const data:ExportData={version:1,exportedAt:timestamp,habits:[habit],entries:[entry]};

it.each([
  null,[],{...habit,id:42},{...habit,name:42},{...habit,parentId:undefined},
  {...habit,parentId:''},{...habit,isGeneral:'false'},{...habit,isGeneral:undefined},
  {...habit,archivedAt:false},{...habit,createdAt:undefined},{...habit,updatedAt:{}},
])('rejects malformed habit fields before they reach persistence: %j',invalid=>{
  expect(()=>validateImport({...data,habits:[invalid]})).toThrow('Invalid habit');
});

it.each([
  null,[],{...entry,id:42},{...entry,habitId:42},{...entry,occurredAt:undefined},
  {...entry,timezone:{}},{...entry,createdAt:false},{...entry,updatedAt:''},
])('rejects malformed entry fields before they reach persistence: %j',invalid=>{
  expect(()=>validateImport({...data,entries:[invalid]})).toThrow('Invalid entry');
});

it('preserves legacy names and emoji strings and optional absent preferences',()=>{
  const legacy={...data,habits:[{...habit,name:'A legacy name longer than twenty-five characters',emoji:'legacy emoji text'}]};
  expect(validateImport(legacy)).toBe(legacy);
});
