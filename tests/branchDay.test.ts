import { afterEach,describe,expect,it,vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { branchRecords,planBranchEdit,validBranchDate } from '../src/domain/branchDay';
import { HabitRepository } from '../src/data/repository';
import { migrate } from '../src/data/migrations';
import { Entry,Habit } from '../src/domain/types';
import type { SQLiteDatabase } from 'expo-sqlite';
vi.mock('expo-sqlite',()=>({}));
const date='2026-09-10',destination='2026-09-09';
const habit=(id:string,parentId:string|null=null,isGeneral=false):Habit=>({id,parentId,isGeneral,name:id,emoji:'',type:'boolean',sortOrder:0,archivedAt:null,createdAt:date,updatedAt:date});
const entry=(habitId:string,localDate=date,value=1):Entry=>({id:habitId+localDate,habitId,localDate,value,occurredAt:date,timezone:'UTC',createdAt:date,updatedAt:date});
const sport=habit('sport'),gym=habit('gym','sport'),legs=habit('legs','gym'),arms=habit('arms','gym'),general=habit('general','sport',true);
const habits=[sport,gym,legs,arms,general,habit('other')];
const databases:DatabaseSync[]=[];
afterEach(()=>{databases.splice(0).forEach(db=>db.close());vi.restoreAllMocks();vi.resetModules()});
async function setup(records:Entry[],type:Habit['type']='boolean'){
  const sqlite=new DatabaseSync(':memory:');databases.push(sqlite);
  const db={execAsync:async(sql:string)=>{sqlite.exec(sql)},getFirstAsync:async(sql:string)=>sqlite.prepare(sql).get(),getAllAsync:async(sql:string,params:(string|number|null)[]=[])=>sqlite.prepare(sql).all(...params),runAsync:vi.fn(async(sql:string,params:(string|number|null)[]=[])=>sqlite.prepare(sql).run(...params)),withTransactionAsync:async(action:()=>Promise<void>)=>{sqlite.exec('BEGIN');try{await action();sqlite.exec('COMMIT')}catch(error){sqlite.exec('ROLLBACK');throw error}}};
  await migrate(db as unknown as SQLiteDatabase);
  for(const h of habits)sqlite.prepare('INSERT INTO habits VALUES(?,?,?,?,?,?,?,?,?,?)').run(h.id,h.parentId,h.name,h.emoji,type,h.sortOrder,Number(h.isGeneral),h.archivedAt,h.createdAt,h.updatedAt);
  for(const e of records)sqlite.prepare('INSERT INTO entries VALUES(?,?,?,?,?,?,?,?)').run(e.id,e.habitId,e.value,e.occurredAt,e.localDate,e.timezone,e.createdAt,e.updatedAt);
  return {repo:new HabitRepository(db as unknown as SQLiteDatabase),db,sqlite};
}
describe('Branch day planning',()=>{
  it('finds full paths, General, zeros and archived records without other dates or branches',()=>{
    const records=branchRecords(habits,[entry('arms'),entry('legs'),entry('general'),entry('other'),entry('arms',destination)],sport,date);
    expect(records).toHaveLength(3);expect(records.find(r=>r.entry.habitId==='arms')?.path.map(h=>h.id)).toEqual(['sport','gym','arms']);
    expect(records.filter(r=>!r.direct)).toHaveLength(2);
    expect(branchRecords(habits,[entry('general')],sport,date)[0].direct).toBe(true);
    expect(branchRecords(habits,[entry('arms')],arms,date)[0].direct).toBe(true);
    expect(branchRecords(habits,[entry('arms',date,0)],sport,date)).toHaveLength(1);
    expect(branchRecords(habits.map(h=>({...h,archivedAt:date})),[entry('arms')],sport,date)).toHaveLength(1);
  });
  it.each(['2026-02-30','2026-13-01','bad','9999-01-01','2026-2-1'])('rejects invalid/future date %s',value=>{expect(validBranchDate(value,'2026-09-11')).toBe(false)});
  it('handles an orphan record without inventing a path',()=>{const orphan=habit('orphan','missing');expect(branchRecords([orphan],[entry('orphan')],orphan,date)[0].path).toEqual([orphan])});
  it('accepts a real leap day',()=>expect(validBranchDate('2024-02-29','2026-09-11')).toBe(true));
  it('rejects stale snapshots, invalid edits and typed values',()=>{
    const records=[entry('arms')],edits=[{id:records[0].id,value:1}];
    expect(()=>planBranchEdit(habits,records,sport,date,[],edits,date)).toThrow('BRANCH_DAY_CHANGED');
    expect(()=>planBranchEdit(habits,records,sport,date,records,[],date)).toThrow('BRANCH_DAY_CHANGED');
    expect(()=>planBranchEdit(habits,records,sport,date,records,[{id:'other',value:1}],date)).toThrow('BRANCH_DAY_CHANGED');
    expect(()=>planBranchEdit(habits,records,sport,date,records,[{id:records[0].id,value:8}],date)).toThrow('BRANCH_VALUE');
    expect(()=>planBranchEdit(habits,records,sport,date,records,edits,'bad')).toThrow('BRANCH_DATE');
    expect(()=>planBranchEdit(habits,records,sport,date,[{...records[0],value:0}],edits,date)).toThrow('BRANCH_DAY_CHANGED');
    expect(()=>planBranchEdit(habits,records,sport,date,[{...records[0],updatedAt:'changed'}],edits,date)).toThrow('BRANCH_DAY_CHANGED');
  });
});
describe('Branch edits with real SQLite transactions',()=>{
  it('clears reviewed children only and preserves other dates and branches',async()=>{
    const records=[entry('arms'),entry('legs'),entry('other'),entry('arms',destination)],{repo}=await setup(records);
    await repo.editBranchDay('sport',date,records.slice(0,2),records.slice(0,2).map(e=>({id:e.id,value:null})),date);
    expect((await repo.entries()).map(e=>e.id).sort()).toEqual(records.slice(2).map(e=>e.id).sort());
  });
  it.each(['number','duration'] as const)('edits %s values and moves retained records while deleting switched-off records',async type=>{
    const records=[entry('arms',date,8),entry('legs',date,0),entry('general',date,2)],{repo}=await setup(records,type);
    await repo.editBranchDay('sport',date,records,[{id:records[0].id,value:12},{id:records[1].id,value:0},{id:records[2].id,value:null}],destination);
    expect(await repo.entries(date,date)).toEqual([]);
    const moved=await repo.entries(destination,destination);expect(moved.map(e=>e.value).sort((a,b)=>a-b)).toEqual([0,12]);
    expect(moved.every(e=>e.occurredAt===date&&e.timezone==='UTC')).toBe(true);
  });
  it('blocks conflicting destination records without overwriting or deleting anything',async()=>{
    const source=entry('arms'),records=[source,entry('arms',destination,0)],{repo}=await setup(records);
    await expect(repo.editBranchDay('sport',date,[source],[{id:source.id,value:1}],destination)).rejects.toThrow('BRANCH_CONFLICT');
    expect(await repo.entries()).toHaveLength(2);
  });
  it('rolls back an earlier deletion if a later update fails',async()=>{
    const records=[entry('arms'),entry('legs')],{repo,sqlite}=await setup(records);
    sqlite.exec("CREATE TRIGGER fail_move BEFORE UPDATE ON entries BEGIN SELECT RAISE(ABORT,'injected failure'); END;");
    await expect(repo.editBranchDay('sport',date,records,[{id:records[0].id,value:null},{id:records[1].id,value:1}],destination)).rejects.toThrow('injected failure');
    expect(await repo.entries(date,date)).toHaveLength(2);expect(await repo.entries(destination,destination)).toHaveLength(0);
  });
  it('rejects stale source records and missing roots',async()=>{
    const source=entry('arms'),{repo}=await setup([source,entry('legs')]);
    await expect(repo.editBranchDay('sport',date,[source],[{id:source.id,value:null}],date)).rejects.toThrow('BRANCH_DAY_CHANGED');
    await expect(repo.editBranchDay('missing',date,[],[],date)).rejects.toThrow('BRANCH_DAY_CHANGED');
  });
  it('leaves identical drafts unchanged and permits deleting a source despite a destination conflict',async()=>{
    const source=entry('arms'),{repo,db}=await setup([source,entry('arms',destination)]);db.runAsync.mockClear();
    await repo.editBranchDay('arms',date,[source],[{id:source.id,value:1}],date);expect(db.runAsync).not.toHaveBeenCalled();
    await repo.editBranchDay('arms',date,[source],[{id:source.id,value:null}],destination);expect(await repo.entries()).toHaveLength(1);
  });
});
describe('Branch and chart localization',()=>{
  it.each(['en-US','es-ES','fr-FR'])('translates all new copy for %s',async locale=>{
    vi.spyOn(Intl.DateTimeFormat.prototype,'resolvedOptions').mockReturnValue({...new Intl.DateTimeFormat().resolvedOptions(),locale});
    const {t}=await import('../src/i18n');
    const keys=['branchDirectShort','branchBefore','branchAfter','branchClearShort','branchMoveShort','branchMovingCount','branchConflictShort','branchRecordSwitch','branchChanged','branchChangedError','branchNoRecords','branchKeepDate','branchDateError','branchConflictHelp','branchManage','branchCellHint','historyComparisonHelp','historyBranchTotal','historyRecordDetails'] as const;
    for(const key of keys){const text=t(key,{name:'Sport',date,count:2,value:8});expect(text).toBeTruthy();expect(text).not.toMatch(/\{\w+\}/)}
    expect(t('branchMoveShort')).toBe(locale==='es-ES'?'Mover día':'Move day');
  });
});
