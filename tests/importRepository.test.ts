import { descendants } from '../src/domain/tree';
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
    sqlite.exec('ALTER TABLE habits DROP COLUMN calendar_threshold; ALTER TABLE habits DROP COLUMN is_hidden; ALTER TABLE habits DROP COLUMN hide_from_overview; ALTER TABLE habits DROP COLUMN color; DELETE FROM schema_versions WHERE version>=3;');
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
  sqlite.exec("ALTER TABLE habits RENAME COLUMN color TO expanded_color; ALTER TABLE habits ADD COLUMN color TEXT CHECK(color IS NULL OR color IN ('green','blue','purple','orange','pink','teal')); UPDATE habits SET color=expanded_color; ALTER TABLE habits DROP COLUMN expanded_color; ALTER TABLE habits DROP COLUMN calendar_threshold; ALTER TABLE habits DROP COLUMN is_hidden; ALTER TABLE habits DROP COLUMN hide_from_overview; DELETE FROM schema_versions WHERE version>=4;");
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
  sqlite.exec('ALTER TABLE habits DROP COLUMN calendar_threshold; ALTER TABLE habits DROP COLUMN is_hidden; ALTER TABLE habits DROP COLUMN hide_from_overview; DELETE FROM schema_versions WHERE version>=4;');
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
  sqlite.exec('ALTER TABLE habits DROP COLUMN calendar_threshold; ALTER TABLE habits DROP COLUMN is_hidden; ALTER TABLE habits DROP COLUMN hide_from_overview; DELETE FROM schema_versions WHERE version>=5;');
  await migrate(db as unknown as SQLiteDatabase);await migrate(db as unknown as SQLiteDatabase);
  expect((await repo.export()).habits).toEqual(before.habits);expect(await repo.entries()).toEqual(before.entries);
  expect(sqlite.prepare('SELECT MAX(version) version FROM schema_versions').get()?.version).toBe(7);
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
 sqlite.exec('ALTER TABLE habits DROP COLUMN calendar_threshold; ALTER TABLE habits DROP COLUMN is_hidden; DELETE FROM schema_versions WHERE version>=6;');await migrate(db as unknown as SQLiteDatabase);await migrate(db as unknown as SQLiteDatabase);
 expect((await repo.export()).habits).toEqual(before.habits);expect(await repo.entries()).toEqual(before.entries);
});
it('rejects visibility conflicts and treats absent and false hidden flags equally for import identity',()=>{
 expect(()=>planImport(doc([h('root')]),doc([{...h('root'),isHidden:false}]))).not.toThrow();
 expect(()=>planImport(doc([h('root')]),doc([{...h('root'),isHidden:true}]))).toThrow('Habit conflict');
});

it('persists, clears, exports and imports independent calendar thresholds',async()=>{
 const {repo}=await setup();const id=await repo.create({name:'Pages',emoji:'📖',type:'number',parentId:null,calendarThreshold:10});
 expect((await repo.habits())[0].calendarThreshold).toBe(10);
 await repo.editTree(id,[{id,name:'Pages',emoji:'📖',calendarThreshold:20}],[{key:'child',parentKey:id,name:'Chapter',emoji:'📖',calendarThreshold:5}],[]);
 const data=await repo.export();const {repo:other}=await setup();await other.import(data);expect(await other.habits()).toEqual(await repo.habits());
 await repo.update(id,{calendarThreshold:null});expect((await repo.habits()).find(h=>h.id===id)?.calendarThreshold).toBeUndefined();
 expect((await repo.habits()).find(h=>h.name==='Chapter')?.calendarThreshold).toBe(5);
 const changed={...data,habits:data.habits.map(h=>h.id===id?{...h,calendarThreshold:30}:h)};
 await expect(other.import(changed)).rejects.toThrow();
});
it('upgrades version 6 without changing records and rejects invalid thresholds before writes',async()=>{
 const {repo,db,sqlite}=await setup();await repo.import(doc([h('numeric')],[e('record','numeric')]));
 sqlite.exec('ALTER TABLE habits DROP COLUMN calendar_threshold; DELETE FROM schema_versions WHERE version=7;');
 await migrate(db as unknown as SQLiteDatabase);await migrate(db as unknown as SQLiteDatabase);
 expect(await repo.entries()).toEqual([e('record','numeric')]);expect((await repo.habits())[0].calendarThreshold).toBeUndefined();
 await expect(repo.create({name:'Invalid',emoji:'📖',type:'boolean',parentId:null,calendarThreshold:1})).rejects.toThrow();
 await expect(repo.update('numeric',{calendarThreshold:-1})).rejects.toThrow();
 await expect(repo.editTree('numeric',[{id:'numeric',name:'Changed',emoji:'•',calendarThreshold:0}],[],[])).rejects.toThrow();
 expect((await repo.habits())[0].name).toBe('numeric');
 for(const threshold of [0,-1,Infinity])expect(()=>validateImport(doc([{...h('invalid'),calendarThreshold:threshold}]))).toThrow();
 expect(()=>validateImport(doc([{...h('duration'),type:'duration',calendarThreshold:.5}]))).toThrow();
 expect(sqlite.prepare('SELECT MAX(version) version FROM schema_versions').get()?.version).toBe(7);
});
it('rolls back thresholds, new descendants and redirected records on a hierarchy write failure',async()=>{
 const {repo,db}=await setup();await repo.import(doc([{...h('root'),calendarThreshold:10}],[e('record','root')]));
 const before=await repo.export(),run=db.runAsync;
 vi.spyOn(db,'runAsync').mockImplementation(async(sql,params)=>{
  if(sql==='UPDATE habits SET calendar_threshold=? WHERE id=?')throw new Error('Synthetic threshold failure');
  return run(sql,params);
 });
 await expect(repo.editTree('root',[{id:'root',name:'Changed',emoji:'📖',calendarThreshold:20}],[{key:'child',parentKey:'root',name:'Child',emoji:'📖',calendarThreshold:5}],[])).rejects.toThrow('Synthetic threshold failure');
 const after=await repo.export();expect(after.habits).toEqual(before.habits);expect(after.entries).toEqual(before.entries);
});
it('enforces threshold constraints for Boolean and General rows in SQLite',async()=>{
 const {repo,sqlite}=await setup();await repo.import(doc([h('root'),h('general','root',-1,true),h('child','root'),{...h('boolean',null,1),type:'boolean'}]));
 for(const id of ['general','boolean'])expect(()=>sqlite.prepare('UPDATE habits SET calendar_threshold=1 WHERE id=?').run(id)).toThrow();
 expect((await repo.habits()).every(habit=>habit.calendarThreshold===undefined)).toBe(true);
});


describe('Existing category attachments',()=>{
  it('groups recorded roots under a new category atomically and preserves metadata',async()=>{
    const {repo}=await setup();await repo.import(doc([{...h('reading'),isHidden:true,hideFromOverview:true,color:'blue'},h('painting',null,1),h('general','painting',-1,true),h('canvas','painting')],[e('read','reading',0),e('paint','canvas',20)]));
    const before=await repo.entries();
    const id=await repo.createTree({name:'Leisure',emoji:'🎨',type:'number',parentId:null},[],[],[{id:'reading',parentKey:'__new_root__',expectedParentId:null},{id:'painting',parentKey:'__new_root__',expectedParentId:null}]);
    const saved=await repo.export();expect(saved.habits.filter(h=>h.parentId===null).map(h=>h.id)).toEqual([id]);
    expect(saved.habits.filter(h=>h.parentId===id&&!h.isGeneral).map(h=>[h.id,h.sortOrder])).toEqual([['reading',0],['painting',1]]);
    expect(saved.habits.find(h=>h.id==='reading')).toEqual(expect.objectContaining({parentId:id,color:'blue'}));
    expect(saved.habits.find(h=>h.id==='reading')?.isHidden).toBeUndefined();expect(saved.habits.find(h=>h.id==='reading')?.hideFromOverview).toBeUndefined();
    expect(saved.entries).toEqual(before);expect(aggregate(saved.habits,saved.entries,id,new Set([date]))).toBe(20);expect(()=>validateImport(saved)).not.toThrow();
  });
  it('moves a last child to a newly created grandchild and restores the former parent direct records',async()=>{
    const {repo}=await setup();await repo.import(doc([h('source'),h('source-general','source',-1,true),h('child','source'),h('target',null,1)],[e('direct','source-general'),e('child-record','child'),e('target-record','target')]));
    await repo.editTree('target',[],[{key:'new-child',parentKey:'target',name:'Arts',emoji:'🎨'}],[],[{id:'child',parentKey:'new-child',expectedParentId:'source'}]);
    const saved=await repo.export(),middle=saved.habits.find(h=>h.name==='Arts')!;
    expect(saved.habits.find(h=>h.id==='child')?.parentId).toBe(middle.id);expect(saved.habits.some(h=>h.id==='source-general')).toBe(false);
    expect(saved.entries.find(e=>e.id==='direct')).toEqual({...e('direct','source-general'),habitId:'source'});
    expect(saved.entries.find(e=>e.id==='child-record')).toEqual(e('child-record','child'));
    expect(saved.entries.find(e=>e.id==='target-record')?.habitId).toBe(saved.habits.find(h=>h.parentId==='target'&&h.isGeneral)?.id);
    expect(()=>validateImport(saved)).not.toThrow();
  });
  it('moves a nested subtree and normalizes remaining source siblings',async()=>{
    const {repo}=await setup();await repo.import(doc([h('source'),h('g','source',-1,true),h('branch','source'),h('branch-general','branch',-1,true),h('leaf','branch'),h('sibling','source',1),h('target',null,1)],[e('nested','leaf')]));
    await repo.editTree('target',[],[],[],[{id:'branch',parentKey:'target',expectedParentId:'source'}]);
    const saved=await repo.export();expect(saved.habits.find(h=>h.id==='sibling')?.sortOrder).toBe(0);expect(saved.habits.find(h=>h.id==='leaf')?.parentId).toBe('branch');expect(saved.entries).toEqual([e('nested','leaf')]);expect(()=>validateImport(saved)).not.toThrow();
  });
  it('rejects incompatible, stale, General, overlapping and cyclic attachments without changing data',async()=>{
    const {repo}=await setup();await repo.import(doc([h('root'),h('g','root',-1,true),h('child','root'),h('other',null,1),{...h('boolean',null,2),type:'boolean'}]));const before=await repo.export();
    const invalid=[[{id:'boolean',parentKey:'other',expectedParentId:null}],[{id:'child',parentKey:'other',expectedParentId:null}],[{id:'g',parentKey:'other',expectedParentId:'root'}],[{id:'root',parentKey:'other',expectedParentId:null},{id:'child',parentKey:'other',expectedParentId:'root'}],[{id:'root',parentKey:'child',expectedParentId:null}]];
    for(const moves of invalid){await expect(repo.editTree('other',[],[],[],moves)).rejects.toThrow();expect(await repo.habits()).toEqual(before.habits);expect(await repo.entries()).toEqual(before.entries)}
  });
  it('rolls back the new root, sibling changes and General transfers when an attachment write fails',async()=>{
    const {repo,db}=await setup();await repo.import(doc([h('first'),h('second',null,1)],[e('record','first')]));const before=await repo.export(),run=db.runAsync;
    vi.spyOn(db,'runAsync').mockImplementation(async(sql,params)=>{if(sql.startsWith('UPDATE habits SET parent_id=')&&params?.at(-1)==='second')throw new Error('Synthetic attachment failure');return run(sql,params)});
    await expect(repo.createTree({name:'New',emoji:'✨',type:'number',parentId:null},[],[],[{id:'first',parentKey:'__new_root__',expectedParentId:null},{id:'second',parentKey:'__new_root__',expectedParentId:null}])).rejects.toThrow('Synthetic attachment failure');
    expect(await repo.habits()).toEqual(before.habits);expect(await repo.entries()).toEqual(before.entries);
  });
});

it('keeps staged attachments in the preview order among newly created siblings',async()=>{
 const {repo}=await setup();await repo.import(doc([h('root'),h('existing',null,1)]));
 await repo.editTree('root',[],[{key:'new',parentKey:'root',name:'New',emoji:'✨'}],[],[{id:'existing',parentKey:'root',expectedParentId:null,index:0}]);
 const saved=await repo.export();expect(saved.habits.filter(h=>h.parentId==='root'&&!h.isGeneral).map(h=>[h.name,h.sortOrder])).toEqual([['existing',0],['New',1]]);expect(()=>validateImport(saved)).not.toThrow();
});
it('enforces name limits on writes while preserving unchanged imported legacy names',async()=>{
 const {repo}=await setup(),legacy='a'.repeat(60);
 await repo.import(doc([{...h('root'),name:legacy}]));
 await repo.update('root',{name:legacy,color:'blue'});
 await expect(repo.update('root',{name:'b'.repeat(26)})).rejects.toThrow('habitNameTooLong');
 await expect(repo.create({name:' ',emoji:'✨',type:'number',parentId:null})).rejects.toThrow('nameRequired');
 await expect(repo.create({name:'b'.repeat(26),emoji:'✨',type:'number',parentId:null})).rejects.toThrow('habitNameTooLong');
 await expect(repo.editTree('root',[{id:'root',name:legacy,emoji:'•'}],[{key:'new',parentKey:'root',name:'b'.repeat(26),emoji:'✨'}],[])).rejects.toThrow('habitNameTooLong');
 expect((await repo.habits()).map(item=>item.name)).toEqual([legacy]);
 await repo.create({name:'b'.repeat(25),emoji:'✨',type:'number',parentId:'root'});
 expect((await repo.deletionImpact('root')).habits).toBe(2);
});
it('excludes internal General habits from deletion counts while including their records',async()=>{
 const {repo}=await setup();await repo.import(doc([h('root'),h('general','root',-1,true),h('child','root')],[e('direct','general'),e('child-record','child')]));
 expect(await repo.deletionImpact('root')).toEqual({habits:2,entries:2});
 expect(await repo.deletionImpact('child')).toEqual({habits:1,entries:1});
});

it('preserves draft insertion positions among existing, new and attached siblings at nested levels',async()=>{
 const {repo}=await setup();await repo.import(doc([h('root'),h('general','root',-1,true),h('existing','root'),h('nested-general','existing',-1,true),h('nested','existing'),h('source',null,1)],[e('record','nested')]));
 await repo.editTree('root',[],[
  {key:'first',parentKey:'root',name:'First',emoji:'✨',index:0},
  {key:'nested-first',parentKey:'existing',name:'Nested first',emoji:'✨',index:0},
  {key:'last',parentKey:'root',name:'Last',emoji:'✨',index:3},
 ],[],[{id:'source',parentKey:'root',expectedParentId:null,index:1}]);
 const saved=await repo.export();
 expect(saved.habits.filter(item=>item.parentId==='root'&&!item.isGeneral).map(item=>[item.name,item.sortOrder])).toEqual([['First',0],['source',1],['existing',2],['Last',3]]);
 expect(saved.habits.filter(item=>item.parentId==='existing'&&!item.isGeneral).map(item=>[item.name,item.sortOrder])).toEqual([['Nested first',0],['nested',1]]);
 expect(saved.entries).toEqual([e('record','nested')]);expect(()=>validateImport(saved)).not.toThrow();
});

it('rejects invalid insertion positions and rolls back a failed sibling-order write',async()=>{
 const {repo,db}=await setup();await repo.import(doc([h('root')],[e('direct','root')]));const before=await repo.export();
 for(const index of [-1,0.5,NaN])await expect(repo.editTree('root',[],[{key:'new',parentKey:'root',name:'New',emoji:'✨',index}],[])).rejects.toThrow('Invalid draft position');
 const run=db.runAsync;vi.spyOn(db,'runAsync').mockImplementation(async(sql,params)=>{if(sql.startsWith('UPDATE habits SET sort_order='))throw new Error('Synthetic order failure');return run(sql,params)});
 await expect(repo.editTree('root',[],[{key:'new',parentKey:'root',name:'New',emoji:'✨',index:0}],[])).rejects.toThrow('Synthetic order failure');
 expect(await repo.habits()).toEqual(before.habits);expect(await repo.entries()).toEqual(before.entries);
});

it('rolls back both source and destination direct-record transfers on a later attachment failure',async()=>{
 const {repo,db}=await setup();await repo.import(doc([h('source'),h('source-general','source',-1,true),h('child','source'),h('target',null,1),h('second',null,2)],[e('source-direct','source-general'),e('target-direct','target'),e('child-entry','child')]));const before=await repo.export(),run=db.runAsync;
 vi.spyOn(db,'runAsync').mockImplementation(async(sql,params)=>{if(sql.startsWith('UPDATE habits SET parent_id=')&&params?.at(-1)==='second')throw new Error('Synthetic later failure');return run(sql,params)});
 await expect(repo.editTree('target',[],[],[],[{id:'child',parentKey:'target',expectedParentId:'source'},{id:'second',parentKey:'target',expectedParentId:null}])).rejects.toThrow('Synthetic later failure');
 expect(await repo.habits()).toEqual(before.habits);expect(await repo.entries()).toEqual(before.entries);expect(()=>validateImport({...before,exportedAt:'now'})).not.toThrow();
});

async function typeChangeRequest(repo:HabitRepository,id:string,to:Habit['type'],value?:number){
 const all=await repo.habits(),root=all.find(h=>h.id===id)!,branch=[root,...descendants(all,id)],ids=new Set(branch.map(h=>h.id));
 return {from:root.type,to,expectedHabitIds:[...ids],expectedEntries:(await repo.entries()).filter(e=>ids.has(e.habitId)),...(root.type==='boolean'?{trueValue:value}:to!=='boolean'?{unitDurationSeconds:value}:{})};
}
it.each(['number','duration'] as const)('converts a complete Boolean branch to %s without losing history metadata',async to=>{
 const {repo}=await setup();await repo.import(doc([{...h('root'),type:'boolean'},{...h('g','root',-1,true),type:'boolean'},{...h('child','root'),type:'boolean'},{...h('archived','root',1),type:'boolean',archivedAt:now},h('unrelated',null,1)],[e('direct','g',1),e('false','child',0),e('archived-record','archived',1),e('unrelated-record','unrelated',3)]));
 const before=await repo.entries(),change=await typeChangeRequest(repo,'root',to,to==='number'?2:5400);
 await repo.editTree('root',[],[],[],[],change);const saved=await repo.export();
 expect(saved.habits.filter(h=>change.expectedHabitIds.includes(h.id)).every(h=>h.type===to)).toBe(true);expect(saved.entries.find(e=>e.id==='false')?.value).toBe(0);
 for(const id of ['direct','archived-record']){const record=saved.entries.find(e=>e.id===id)!;expect(record.value).toBe(to==='number'?2:5400);expect({...record,value:before.find(e=>e.id===id)!.value,updatedAt:before.find(e=>e.id===id)!.updatedAt}).toEqual(before.find(e=>e.id===id))}
 expect(saved.entries.find(e=>e.id==='unrelated-record')).toEqual(before.find(e=>e.id==='unrelated-record'));expect(()=>validateImport(saved)).not.toThrow();
});
it.each(['number','duration'] as const)('permanently converts %s records including zero to Boolean and clears thresholds',async from=>{
 const {repo}=await setup();await repo.import(doc([{...h('root'),type:from,calendarThreshold:10},{...h('g','root',-1,true),type:from},{...h('child','root'),type:from,calendarThreshold:20}],[e('zero','g',0),e('positive','child',100)]));
 await repo.editTree('root',[],[],[],[],await typeChangeRequest(repo,'root','boolean'));const saved=await repo.export();expect(saved.entries.map(e=>e.value)).toEqual([1,1]);expect(saved.habits.every(h=>h.type==='boolean'&&h.calendarThreshold===undefined)).toBe(true);expect(()=>validateImport(saved)).not.toThrow();
});
it('converts quantities and durations proportionally using the chosen seconds per unit',async()=>{
 const {repo}=await setup();await repo.import(doc([h('root')],[e('record','root',2.5)]));await repo.editTree('root',[],[],[],[],await typeChangeRequest(repo,'root','duration',1800));expect((await repo.entries())[0].value).toBe(4500);
 await repo.editTree('root',[],[],[],[],await typeChangeRequest(repo,'root','number',1800));expect((await repo.entries())[0].value).toBe(2.5);const saved=await repo.export();expect(()=>validateImport(saved)).not.toThrow();
});
it('rejects history changed after confirmation without saving other draft edits',async()=>{
 const {repo}=await setup();await repo.import(doc([h('root')],[e('record','root',2)]));const change=await typeChangeRequest(repo,'root','boolean');await repo.saveEntry({habitId:'root',localDate:date,value:4});const before=await repo.export();
 await expect(repo.editTree('root',[{id:'root',name:'Changed',emoji:'•'}],[],[],[],change)).rejects.toThrow('TYPE_CHANGE_STALE');expect(await repo.habits()).toEqual(before.habits);expect(await repo.entries()).toEqual(before.entries);
});
it('rolls back type, history, thresholds and tree edits if a later write fails',async()=>{
 const {repo,db}=await setup();await repo.import(doc([{...h('root'),calendarThreshold:20},h('g','root',-1,true),h('child','root')],[e('record','child',2)]));const change=await typeChangeRequest(repo,'root','boolean'),before=await repo.export(),run=db.runAsync;
 vi.spyOn(db,'runAsync').mockImplementation(async(sql,params)=>{if(sql.startsWith('UPDATE habits SET name='))throw new Error('Synthetic conversion failure');return run(sql,params)});
 await expect(repo.editTree('root',[{id:'root',name:'Changed',emoji:'•',calendarThreshold:null}],[],[],[],change)).rejects.toThrow('Synthetic conversion failure');expect(await repo.habits()).toEqual(before.habits);expect(await repo.entries()).toEqual(before.entries);
});
it('converts only the original branch before adding compatible target-type categories and new children',async()=>{
 const {repo}=await setup();await repo.import(doc([{...h('root'),type:'boolean'},h('existing',null,1)],[e('yes','root',1),e('quantity','existing',5)]));
 await repo.editTree('root',[],[{key:'new',parentKey:'root',name:'New',emoji:'✨'}],[],[{id:'existing',parentKey:'root',expectedParentId:null}],await typeChangeRequest(repo,'root','number',2));
 const saved=await repo.export();expect(saved.entries.find(e=>e.id==='yes')?.value).toBe(2);expect(saved.entries.find(e=>e.id==='quantity')?.value).toBe(5);expect(saved.habits.every(h=>h.type==='number')).toBe(true);expect(()=>validateImport(saved)).not.toThrow();
});
