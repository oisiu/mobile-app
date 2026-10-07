import { SQLiteDatabase } from 'expo-sqlite';
import { makeId } from '@/utils/id';
export async function migrate(db:SQLiteDatabase){
  await db.execAsync(`PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS schema_versions(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);`);
  const row=await db.getFirstAsync<{version:number}>('SELECT MAX(version) version FROM schema_versions');
  if((row?.version??0)<1) await db.withTransactionAsync(async()=>{
    await db.execAsync(`CREATE TABLE habits(id TEXT PRIMARY KEY NOT NULL,parent_id TEXT REFERENCES habits(id) ON DELETE CASCADE,name TEXT NOT NULL,emoji TEXT NOT NULL,type TEXT NOT NULL CHECK(type IN ('boolean','number','duration')),sort_order INTEGER NOT NULL,is_general INTEGER NOT NULL DEFAULT 0,archived_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL); CREATE INDEX habits_parent_order_idx ON habits(parent_id,sort_order); CREATE TABLE entries(id TEXT PRIMARY KEY NOT NULL,habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,value REAL NOT NULL,occurred_at TEXT NOT NULL,local_date TEXT NOT NULL,timezone TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(habit_id,local_date)); CREATE INDEX entries_date_idx ON entries(local_date); INSERT INTO schema_versions VALUES(1,datetime('now'));`);
  });
  if((row?.version??0)<2) await db.withTransactionAsync(async()=>{
    const alcohol=await db.getFirstAsync<{id:string}>(`SELECT alcohol.id FROM habits alcohol JOIN habits vices ON vices.id=alcohol.parent_id WHERE alcohol.name='Alcohol' AND alcohol.emoji='🍺' AND alcohol.type='number' AND alcohol.is_general=0 AND vices.parent_id IS NULL AND vices.name='Vices' AND vices.emoji='🚬' AND vices.type='number' AND NOT EXISTS(SELECT 1 FROM habits child WHERE child.parent_id=alcohol.id) LIMIT 1`);
    if(alcohol){
      const now=new Date().toISOString(),generalId=makeId();
      await db.runAsync('INSERT INTO habits VALUES(?,?,?,?,?,?,?,?,?,?)',[generalId,alcohol.id,'General','•','number',-1,1,null,now,now]);
      await db.runAsync('UPDATE entries SET habit_id=? WHERE habit_id=?',[generalId,alcohol.id]);
      const children=[['Beer','🍺'],['Cocktails','🍸'],['Wine','🍷'],['Shots','🥃']];
      for(let index=0;index<children.length;index++) await db.runAsync('INSERT INTO habits VALUES(?,?,?,?,?,?,?,?,?,?)',[makeId(),alcohol.id,children[index][0],children[index][1],'number',index,0,null,now,now]);
    }
    await db.runAsync('INSERT INTO schema_versions VALUES(2,datetime(\'now\'))');
  });
  if((row?.version??0)<3)await db.withTransactionAsync(async()=>{
    await db.execAsync("ALTER TABLE habits ADD COLUMN color TEXT CHECK(color IS NULL OR color IN ('green','blue','purple','orange','pink','teal')); INSERT INTO schema_versions VALUES(3,datetime('now'));");
  });

  if((row?.version??0)<4)await db.withTransactionAsync(async()=>{
    await db.execAsync("ALTER TABLE habits RENAME COLUMN color TO legacy_color; ALTER TABLE habits ADD COLUMN color TEXT CHECK(color IS NULL OR color IN ('red','orange','yellow','lime','green','teal','cyan','blue','purple','pink','brown','gray')); UPDATE habits SET color=legacy_color; ALTER TABLE habits DROP COLUMN legacy_color; INSERT INTO schema_versions VALUES(4,datetime('now'));");
  });
  if((row?.version??0)<5)await db.withTransactionAsync(async()=>{
    await db.execAsync("ALTER TABLE habits ADD COLUMN hide_from_overview INTEGER NOT NULL DEFAULT 0 CHECK(hide_from_overview IN (0,1) AND (hide_from_overview=0 OR (parent_id IS NULL AND is_general=0))); INSERT INTO schema_versions VALUES(5,datetime('now'));");
  });
  if((row?.version??0)<6)await db.withTransactionAsync(async()=>{
    await db.execAsync("ALTER TABLE habits ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0 CHECK(is_hidden IN (0,1) AND (is_hidden=0 OR (parent_id IS NULL AND is_general=0))); INSERT INTO schema_versions VALUES(6,datetime('now'));");
  });

}
