import { expect,it } from 'vitest';
import { isLocalDate,validateEntry } from '../src/domain/entries';
import { validateImport } from '../src/domain/import';
import { Habit,ExportData } from '../src/domain/types';

it.each(['2026-02-29','2026-02-30','2026-02-31','2026-04-31','1900-02-29','2026-13-01','2026-00-01','2026-01-00','2026-01-32','2026-1-01','bad'])('rejects the nonexistent or malformed date %s',date=>{
 expect(isLocalDate(date)).toBe(false);
 expect(validateEntry('number',1,date,new Date('2026-10-22T12:00:00Z'))).toBe('Invalid date');
});
it.each(['2000-02-29','2024-02-29','2026-02-28','2026-04-30','2026-12-31'])('accepts the real calendar date %s',date=>expect(isLocalDate(date)).toBe(true));
it('rejects impossible imported dates before persistence',()=>{
 const habit:Habit={id:'habit',parentId:null,name:'Example',emoji:'',type:'number',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'2026-01-01',updatedAt:'2026-01-01'};
 const data:ExportData={version:1,exportedAt:'2026-10-22T12:00:00Z',habits:[habit],entries:[{id:'entry',habitId:habit.id,localDate:'2026-02-31',value:1,timezone:'UTC',occurredAt:'2026-02-28T12:00:00Z',createdAt:'2026-02-28',updatedAt:'2026-02-28'}]};
 expect(()=>validateImport(data)).toThrow();
 expect(()=>validateImport({...data,entries:[{...data.entries[0],localDate:'2024-02-29'}]})).not.toThrow();
});
