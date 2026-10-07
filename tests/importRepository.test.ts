import { afterEach,describe,expect,it,vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { HabitRepository } from '../src/data/repository';
import { migrate } from '../src/data/migrations';
import { aggregate } from '../src/domain/aggregation';
import { planImport,validateImport } from '../src/domain/import';
import { Entry,ExportData,Habit } from '../src/domain/types';
vi.mock('expo-sqlite',()=>({}));
const now='2025-01-01T00:00:00.000Z',date='2025-01-01';
const h=(id:string,parentId:string|null=null,sortOrder=0,isGeneral=false):Habit=>({id,parentId,sortOrder,isGeneral,name:id,emoji:'•',type:'number',archivedAt:null,createdAt:now,updatedAt:now});
const e=(id:string,habitId:string,value=5):Entry=>({id,habitId,value,localDate:date,occurredAt:now,timezone:'UTC',createdAt:now,updatedAt:now});
const doc=(habits:Habit[],entries:Entry[]=[]):ExportData=>({version:1,exportedAt:now,habits,entries});
const databases:DatabaseSync[]=[];
afterEach(()=>{databases.splice(0).forEach(db=>db.close())});
async function setup(){
  const sqlite=new DatabaseSync(':memory:');databases.push(sqlite);
  const db={execAsync:async(sql:string)=>{sqlite.exec(sql)},getFirstAsync:async(sql:string,params:(string|number|null)[]=[])=>sqlite.prepare(sql).get(...params),getAllAsync:async(sql:string,params:(string|number|null)[]=[])=>sqlite.prepare(sql).all(...params),runAsync:async(sql:string,params:(string|number|null)[]=[])=>sqlite.prepare(sql).run(...params),withTransactionAsync:async(action:()=>Promise<void>)=>{sqlite.exec('BEGIN');try{await action();sqlite.exec('COMMIT')}catch(error){sqlite.exec('ROLLBACK');throw error}}};
  await migrate(db as unknown as SQLiteDatabase);
  return {repo:new HabitRepository(db as unknown as SQLiteDatabase),sqlite,db};
}
describe('Safe import integrity',()=>{
  it('persists root reordering with sequential positions while preserving descendants and entries',async()=>{
    const {repo}=await setup();await repo.import(doc([h('first'),h('general','first',-1,true),h('child','first'),h('second',null,1),h('third',null,2)],[e('record','child')]));
    await repo.move('first',null,2);
    const saved=await repo.export();expect(saved.habits.filter(item=>item.parentId===null).map(item=>[item.id,item.sortOrder])).toEqual([['second',0],['third',1],['first',2]]);
    expect(saved.habits.find(item=>item.id==='child')?.parentId).toBe('first');expect(saved.entries).toEqual([e('record','child')]);expect(()=>validateImport(saved)).not.toThrow();
    await repo.move('first',null,0);expect((await repo.habits()).filter(item=>item.parentId===null).map(item=>item.id)).toEqual(['first','second','third']);
  });
  it('rolls back all sibling positions when a reorder write fails',async()=>{
    const {repo,db}=await setup();await repo.import(doc([h('first'),h('second',null,1),h('third',null,2)]));const before=await repo.habits(),run=db.runAsync;let writes=0;
    vi.spyOn(db,'runAsync').mockImplementation(async(sql,params)=>{if(sql.startsWith('UPDATE habits SET sort_order')&&++writes===2)throw new Error('Synthetic reorder failure');return run(sql,params)});
    await expect(repo.move('first',null,2)).rejects.toThrow('Synthetic reorder failure');expect(await repo.habits()).toEqual(before);
  });
  it('deletes all archived and visible habits and records without removing migration history',async()=>{
    const {repo,sqlite}=await setup();await repo.import(doc([h('root'),h('general','root',-1,true),{...h('child','root'),archivedAt:now}],[e('record','child')]));
    await repo.deleteAllData();expect(await repo.habits()).toEqual([]);expect(await repo.entries()).toEqual([]);
    expect(sqlite.prepare('SELECT COUNT(*) n FROM schema_versions').get()?.n).toBeGreaterThan(0);
    await repo.deleteAllData();await repo.import(doc([h('fresh')],[e('fresh-record','fresh')]));expect(await repo.habits()).toHaveLength(1);
  });
  it('rolls back record deletion when deleting habits fails',async()=>{
    const {repo,db}=await setup();await repo.import(doc([h('root')],[e('record','root')]));
    const run=db.runAsync;vi.spyOn(db,'runAsync').mockImplementation(async(sql,params)=>{if(sql==='DELETE FROM habits')throw new Error('Synthetic write failure');return run(sql,params)});
    await expect(repo.deleteAllData()).rejects.toThrow('Synthetic write failure');expect(await repo.entries()).toHaveLength(1);expect(await repo.habits()).toHaveLength(1);
  });
  it('appends new siblings in incoming order and supports repeated imports',async()=>{
    const {repo}=await setup();await repo.import(doc([h('existing')]));
    const incoming=doc([h('last',null,1),h('first')]);
    await repo.import(incoming);await repo.import(incoming);
    const exported=await repo.export();expect(exported.habits.map(h=>[h.id,h.sortOrder])).toEqual([['existing',0],['first',1],['last',2]]);
    expect(()=>validateImport(exported)).not.toThrow();
  });
  it('imports a fresh hierarchy with children before parents in the file',async()=>{
    const {repo}=await setup();
    await repo.import(doc([h('child','root'),h('general','root',-1,true),h('root')],[e('record','child')]));
    const exported=await repo.export();expect(exported.habits).toHaveLength(3);
    expect(aggregate(exported.habits,exported.entries,'root',new Set([date]))).toBe(5);
  });
  it('preserves totals and entry metadata when an existing leaf becomes a branch',async()=>{
    const {repo}=await setup(),root=h('root'),record=e('old','root');await repo.import(doc([root],[record]));
    const incoming=doc([h('child','root'),h('general','root',-1,true),root],[e('new','child',3)]);
    await repo.import(incoming);await repo.import(incoming);
    const exported=await repo.export();expect(exported.entries.find(e=>e.id==='old')).toEqual({...record,habitId:'general'});
    expect(aggregate(exported.habits,exported.entries,'root',new Set([date]))).toBe(8);
    expect(()=>validateImport(exported)).not.toThrow();
  });
  it('rejects a destination daily conflict after General routing without changing stored data',async()=>{
    const {repo}=await setup(),root=h('root');await repo.import(doc([root],[e('old','root')]));
    await expect(repo.import(doc([root,h('general','root',-1,true),h('child','root')],[e('new','general')]))).rejects.toThrow(/daily/i);
    expect((await repo.export()).habits).toEqual([root]);expect(await repo.entries()).toEqual([e('old','root')]);
  });
  it('rejects a second General when combining otherwise valid documents',()=>{
    const root=h('root'),child=h('child','root');
    expect(()=>planImport(doc([root,child,h('general','root',-1,true)]),doc([root,child,h('other-general','root',-1,true)]))).toThrow(/General/);
  });
  it('rolls back inserted children and transferred records after an injected write failure',async()=>{
    const {repo,sqlite}=await setup(),root=h('root');await repo.import(doc([root],[e('old','root')]));
    sqlite.exec("CREATE TRIGGER fail_entry BEFORE INSERT ON entries BEGIN SELECT RAISE(ABORT,'injected failure'); END;");
    await expect(repo.import(doc([root,h('general','root',-1,true),h('child','root')],[e('new','child')]))).rejects.toThrow('injected failure');
    expect((await repo.export()).habits).toEqual([root]);expect(await repo.entries()).toEqual([e('old','root')]);
  });
  it.each([
    [h('root'),h('child','root')],
    [h('general',null,-1,true)],
    [h('root'),h('general','root',0,true),h('child','root')],
    [h('root'),h('general','root',-1,true)],
    [h('root'),h('general','root',-1,true),h('child','root'),h('nested','general')],
  ])('rejects noncanonical General structures %#',(...habits)=>{expect(()=>validateImport(doc(habits))).toThrow(/General/)});
  it('rejects direct parent records instead of accepting invisible totals',()=>{
    expect(()=>validateImport(doc([h('root'),h('general','root',-1,true),h('child','root')],[e('record','root')]))).toThrow(/entry/);
  });
});

describe('Appearance persistence and upgrade',()=>{
  it('upgrades version 2 without changing legacy emojis or entries and is idempotent',async()=>{
    const {repo,sqlite,db}=await setup();await repo.import(doc([{...h('old'),emoji:'✨✨'}],[e('record','old')]));
    sqlite.exec('ALTER TABLE habits DROP COLUMN is_hidden; ALTER TABLE habits DROP COLUMN hide_from_overview; ALTER TABLE habits DROP COLUMN color; DELETE FROM schema_versions WHERE version>=3;');
    await migrate(db as unknown as SQLiteDatabase);await migrate(db as unknown as SQLiteDatabase);
    expect(sqlite.prepare('SELECT color FROM habits').get()).toEqual({color:null});
    expect((await repo.habits())[0].emoji).toBe('✨✨');expect(await repo.entries()).toEqual([e('record','old')]);
    expect(sqlite.prepare('SELECT COUNT(*) n FROM schema_versions WHERE version=3').get()).toEqual({n:1});
  });
  it('creates, updates, resets and exports colors while preserving a legacy emoji until changed',async()=>{
    const {repo}=await setup(),id=await repo.create({name:'Colored',emoji:'👨‍👩‍👧‍👦',color:'blue',type:'number',parentId:null});
    expect((await repo.habits())[0].color).toBe('blue');
    await repo.update(id,{color:'pink'});expect((await repo.export()).habits[0].color).toBe('pink');
    await repo.update(id,{color:null});expect((await repo.habits())[0].color).toBeUndefined();
    await repo.import(doc([{...h('legacy',null,1),emoji:'✨✨'}]));
    await repo.update('legacy',{name:'Renamed'});expect((await repo.habits()).find(h=>h.id==='legacy')?.emoji).toBe('✨✨');
    await expect(repo.update('legacy',{emoji:'💪💪'})).rejects.toThrow('INVALID_EMOJI');
    await repo.update('legacy',{emoji:'👍🏽'});expect((await repo.habits()).find(h=>h.id==='legacy')?.emoji).toBe('👍🏽');
  });
  it('stores root and child colors together and leaves records intact',async()=>{
    const {repo}=await setup(),root=h('root');await repo.import(doc([root],[e('record','root')]));
    await repo.editTree('root',[{id:'root',name:'Root',emoji:'🇪🇸',color:'purple'}],[{key:'new',parentKey:'root',name:'Child',emoji:'🏳️‍🌈',color:'orange'}],[]);
    const exported=await repo.export();expect(exported.habits.find(h=>h.id==='root')?.color).toBe('purple');expect(exported.habits.find(h=>h.name==='Child')?.color).toBe('orange');
    expect(aggregate(exported.habits,exported.entries,'root',new Set([date]))).toBe(5);
  });
  it('rejects invalid edits and rolls back color updates after a later failure',async()=>{
    const {repo,sqlite}=await setup();await repo.import(doc([h('root')]));
    await expect(repo.create({name:'Bad',emoji:'✨✨',type:'number',parentId:null})).rejects.toThrow('INVALID_EMOJI');
    await expect(repo.editTree('root',[],[{key:'new',parentKey:'root',name:'Bad',emoji:'x'}],[])).rejects.toThrow('INVALID_EMOJI');
    await expect(repo.editTree('root',[{id:'root',name:'Root',emoji:'✨✨'}],[],[])).rejects.toThrow('INVALID_EMOJI');
    sqlite.exec("CREATE TRIGGER fail_child BEFORE INSERT ON habits BEGIN SELECT RAISE(ABORT,'injected failure'); END;");
    await expect(repo.editTree('root',[{id:'root',name:'Root',emoji:'✨',color:'blue'}],[{key:'new',parentKey:'root',name:'Child',emoji:'✨'}],[])).rejects.toThrow('injected failure');
    expect((await repo.habits())[0]).toEqual(h('root'));
  });
  it('accepts old colorless exports, round-trips chosen colors and rejects invalid/conflicting colors',async()=>{
    const {repo}=await setup();await repo.import(doc([{...h('root'),color:'teal'}]));
    await repo.import(await repo.export());expect((await repo.export()).habits[0].color).toBe('teal');
    await expect(repo.import(doc([{...h('root'),color:'green'}]))).rejects.toThrow(/Habit conflict/);
    expect(()=>validateImport(doc([{...h('bad'),color:'#fff' as Habit['color']}]))).toThrow(/habit/);
    await repo.import(doc([h('old')]));expect((await repo.habits()).find(h=>h.id==='old')?.color).toBeUndefined();
  });
});

it('upgrades the six-color constraint without changing trees or entries',async()=>{
  const {repo,sqlite,db}=await setup();
  await repo.import(doc([{...h('root'),color:'blue'},h('general','root',-1,true),{...h('child','root'),color:'pink'}],[e('record','child')]));
  sqlite.exec("ALTER TABLE habits RENAME COLUMN color TO expanded_color; ALTER TABLE habits ADD COLUMN color TEXT CHECK(color IS NULL OR color IN ('green','blue','purple','orange','pink','teal')); UPDATE habits SET color=expanded_color; ALTER TABLE habits DROP COLUMN expanded_color; ALTER TABLE habits DROP COLUMN is_hidden; ALTER TABLE habits DROP COLUMN hide_from_overview; DELETE FROM schema_versions WHERE version>=4;");
  const before=await repo.export();
  expect(()=>sqlite.prepare("UPDATE habits SET color='yellow' WHERE id='root'").run()).toThrow();
  await migrate(db as unknown as SQLiteDatabase);await migrate(db as unknown as SQLiteDatabase);
  const after=await repo.export();expect(after.habits).toEqual(before.habits);expect(after.entries).toEqual(before.entries);
  expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  expect(sqlite.prepare('SELECT COUNT(*) n FROM schema_versions WHERE version=4').get()).toEqual({n:1});
  await repo.update('root',{color:'yellow'});expect((await repo.habits()).find(habit=>habit.id==='root')?.color).toBe('yellow');
  for(const color of ['red','yellow','lime','cyan','brown','gray'] as const){
    const id=await repo.create({name:color,emoji:'',color,type:'number',parentId:null});
    expect((await repo.export()).habits.find(habit=>habit.id===id)?.color).toBe(color);
  }
  const exported=await repo.export();expect(()=>validateImport(exported)).not.toThrow();await repo.import(exported);
});

it('rolls back a failed palette upgrade before retrying',async()=>{
  const {repo,sqlite,db}=await setup();await repo.import(doc([{...h('root'),color:'green'}],[e('record','root')]));
  sqlite.exec('ALTER TABLE habits DROP COLUMN is_hidden; ALTER TABLE habits DROP COLUMN hide_from_overview; DELETE FROM schema_versions WHERE version>=4;');
  const before=await repo.export(),original=db.execAsync;
  const failure=vi.spyOn(db,'execAsync').mockImplementation(async sql=>{
    if(sql.startsWith('ALTER TABLE habits RENAME COLUMN color')){sqlite.exec('ALTER TABLE habits RENAME COLUMN color TO legacy_color;');throw new Error('injected palette failure')}
    await original(sql);
  });
  await expect(migrate(db as unknown as SQLiteDatabase)).rejects.toThrow('injected palette failure');failure.mockRestore();
  expect((await repo.export()).habits).toEqual(before.habits);expect(await repo.entries()).toEqual(before.entries);
  expect(sqlite.prepare('SELECT MAX(version) version FROM schema_versions').get()).toEqual({version:3});
  await migrate(db as unknown as SQLiteDatabase);expect((await repo.export()).habits).toEqual(before.habits);
});

it('persists visibility through creation, tree edits, export and import without changing records',async()=>{
  const {repo}=await setup();const id=await repo.create({name:'Hidden',emoji:'✨',type:'number',parentId:null,hideFromOverview:true});
  await repo.saveEntry({habitId:id,value:4,localDate:date});const saved=await repo.export();expect(saved.habits[0].hideFromOverview).toBe(true);
  const copy=await setup();await copy.repo.import(saved);expect((await copy.repo.export()).habits).toEqual(saved.habits);
  await repo.editTree(id,[{id,name:'Visible',emoji:'✨',hideFromOverview:false}],[],[]);
  expect((await repo.habits())[0].hideFromOverview).toBeUndefined();expect(await repo.entries()).toEqual(saved.entries);
  await repo.editTree(id,[{id,name:'Hidden again',emoji:'✨',hideFromOverview:true}],[],[]);
  await repo.editTree(id,[{id,name:'Renamed',emoji:'✨'}],[],[]);expect((await repo.habits())[0].hideFromOverview).toBe(true);
});
it('rejects hidden children and malformed visibility flags before mutations',async()=>{
  const {repo}=await setup();await repo.import(doc([h('root'),h('general','root',-1,true),h('child','root')]));const before=await repo.export();
  await expect(repo.create({name:'Bad',emoji:'✨',type:'number',parentId:'root',hideFromOverview:true})).rejects.toThrow('Only top-level');
  await expect(repo.editTree('root',[{id:'child',name:'Bad',emoji:'✨',hideFromOverview:true}],[],[])).rejects.toThrow('Only top-level');
  expect(()=>validateImport(doc([{...h('root'),hideFromOverview:'yes' as unknown as boolean}]))).toThrow('Invalid habit');
  expect(()=>validateImport(doc([h('root'),h('general','root',-1,true),{...h('child','root'),hideFromOverview:true}]))).toThrow('Invalid habit');
  expect((await repo.export()).habits).toEqual(before.habits);
});
it('upgrades existing habits to visible defaults and runs visibility migration only once',async()=>{
  const {repo,db,sqlite}=await setup();await repo.import(doc([h('root')],[e('record','root')]));const before=await repo.export();
  sqlite.exec('ALTER TABLE habits DROP COLUMN is_hidden; ALTER TABLE habits DROP COLUMN hide_from_overview; DELETE FROM schema_versions WHERE version>=5;');
  await migrate(db as unknown as SQLiteDatabase);await migrate(db as unknown as SQLiteDatabase);
  expect((await repo.export()).habits).toEqual(before.habits);expect(await repo.entries()).toEqual(before.entries);
  expect(sqlite.prepare('SELECT MAX(version) version FROM schema_versions').get()?.version).toBe(6);
});

it('persists complete hiding and one-tap recovery while retaining branch records and overview visibility',async()=>{
 const {repo}=await setup();const id=await repo.create({name:'Hidden',emoji:'✨',type:'number',parentId:null,isHidden:true,hideFromOverview:true});
 await repo.create({name:'Child',emoji:'✨',type:'number',parentId:id});await repo.saveEntry({habitId:id,value:3,localDate:date});const saved=await repo.export();
 expect(saved.habits.find(item=>item.id===id)?.isHidden).toBe(true);const copy=await setup();await copy.repo.import(saved);expect((await copy.repo.export()).habits).toEqual(saved.habits);
 await repo.editTree(id,[{id,name:'Renamed',emoji:'✨'}],[],[]);expect((await repo.habits()).find(item=>item.id===id)?.isHidden).toBe(true);
 await repo.setHidden(id,false);expect((await repo.habits()).find(item=>item.id===id)).toEqual(expect.objectContaining({hideFromOverview:true}));expect((await repo.habits()).find(item=>item.id===id)?.isHidden).toBeUndefined();expect(await repo.entries()).toEqual(saved.entries);
 await repo.editTree(id,[{id,name:'Renamed',emoji:'✨',isHidden:true}],[],[]);expect((await repo.habits()).find(item=>item.id===id)?.isHidden).toBe(true);
 const child=(await repo.habits()).find(item=>item.parentId===id&&!item.isGeneral)!;
 await expect(repo.setHidden(child.id,true)).rejects.toThrow('Top-level');await expect(repo.setHidden('missing',false)).rejects.toThrow('Top-level');
 await expect(repo.create({name:'Bad',emoji:'✨',type:'number',parentId:id,isHidden:true})).rejects.toThrow('Only top-level');
 await expect(repo.editTree(id,[{id:child.id,name:'Bad',emoji:'✨',isHidden:true}],[],[])).rejects.toThrow('Only top-level');
 expect(()=>validateImport(doc([{...h('bad'),isHidden:1 as unknown as boolean}]))).toThrow('Invalid habit');
 expect(()=>validateImport(doc([h('parent'),h('general','parent',-1,true),{...h('child','parent'),isHidden:true}]))).toThrow('Invalid habit');
});
it('adds complete visibility to existing databases without touching previous visibility or entries',async()=>{
 const {repo,sqlite,db}=await setup();await repo.import(doc([{...h('root'),hideFromOverview:true}],[e('record','root')]));const before=await repo.export();
 sqlite.exec('ALTER TABLE habits DROP COLUMN is_hidden; DELETE FROM schema_versions WHERE version=6;');await migrate(db as unknown as SQLiteDatabase);await migrate(db as unknown as SQLiteDatabase);
 expect((await repo.export()).habits).toEqual(before.habits);expect(await repo.entries()).toEqual(before.entries);
});
it('rejects visibility conflicts and treats absent and false hidden flags equally for import identity',()=>{
 expect(()=>planImport(doc([h('root')]),doc([{...h('root'),isHidden:false}]))).not.toThrow();
 expect(()=>planImport(doc([h('root')]),doc([{...h('root'),isHidden:true}]))).toThrow('Habit conflict');
});
