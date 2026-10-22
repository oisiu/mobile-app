import { expect,it } from 'vitest';
import { exportEntriesCsv,selectExportCategory } from '../src/domain/export';
import { planImport,validateImport } from '../src/domain/import';
import { Entry,ExportData,Habit } from '../src/domain/types';

const now='2025-01-01T00:00:00.000Z';
const habit=(id:string,parentId:string|null=null,sortOrder=0,isGeneral=false):Habit=>({id,parentId,sortOrder,isGeneral,name:id,emoji:'',type:'number',archivedAt:null,createdAt:now,updatedAt:now});
const entry=(id:string,habitId:string,value=0):Entry=>({id,habitId,value,localDate:'2025-01-01',occurredAt:now,timezone:'UTC',createdAt:now,updatedAt:now});
const data:ExportData={version:1,exportedAt:now,habits:[habit('other'),{...habit('root',null,1),isHidden:true,color:'green',calendarThreshold:5},habit('general','root',-1,true),habit('child','root'),habit('nestedGeneral','child',-1,true),{...habit('leaf','child'),archivedAt:now}],entries:[entry('unrelated','other',9),entry('direct','general',3),entry('nestedDirect','nestedGeneral',2),entry('zero','leaf')]};

it('keeps a complete export unchanged by default',()=>{
  expect(selectExportCategory(data,null)).toBe(data);
});
it('exports only a root and its complete history, preserving identities and import compatibility',()=>{
  const before=JSON.stringify(data),selected=selectExportCategory(data,'root');
  expect(selected.habits.map(h=>h.id)).toEqual(['root','general','child','nestedGeneral','leaf']);
  expect(selected.entries.map(e=>e.id)).toEqual(['direct','nestedDirect','zero']);
  expect(selected.habits[0]).toEqual(data.habits[1]);expect(selected.entries.at(-1)?.value).toBe(0);
  expect(validateImport(selected)).toEqual(selected);
  expect(planImport(data,selected)).toEqual(data);
  expect(validateImport(planImport({...data,habits:[],entries:[]},selected)).habits.find(h=>h.id==='root')?.sortOrder).toBe(0);
  expect(JSON.stringify(data)).toBe(before);
});
it.each(['missing','leaf','general'])('rejects an unavailable or non-root selection: %s',id=>{
  expect(()=>selectExportCategory(data,id)).toThrow('Export category not found');
});
it('exports an archived category without records',()=>{
  const archived={...habit('archived'),archivedAt:now};
  expect(selectExportCategory({...data,habits:[archived],entries:[]},archived.id).habits).toEqual([archived]);
});

it('exports multiple complete categories without duplicates and rejects empty or stale selections',()=>{
 const selected=selectExportCategory(data,['root','other','root']);
 expect(selected.habits).toEqual(data.habits);expect(selected.entries).toEqual(data.entries);
 expect(validateImport(selected)).toEqual(selected);
 expect(()=>selectExportCategory(data,[])).toThrow('Select an export category');
 expect(()=>selectExportCategory(data,['root','missing'])).toThrow('Export category not found');
});

it('quotes CSV identifiers, timezones and paths containing separators, quotes or line breaks',()=>{
 const snapshot:ExportData={...data,habits:[{...habit('root'),name:'Read "books", daily\nnotes'}],entries:[{...entry('entry,"quoted"\nline','root'),timezone:'Custom, "zone"\r\nnext'}]};
 expect(exportEntriesCsv(snapshot)).toBe('entry_id,local_date,timezone,type,value,habit_path\n"entry,""quoted""\nline",2025-01-01,"Custom, ""zone""\r\nnext",number,0,"Read ""books"", daily\nnotes"');
 expect(()=>exportEntriesCsv({...snapshot,habits:[]})).toThrow('Export habit not found');
});
