import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { onTestFinished } from 'vitest';
import { migrate } from '../../src/data/migrations';
import { HabitRepository } from '../../src/data/repository';

type Params = (string | number | null)[];

/**
 * Opens a migrated in-memory SQLite database behind the subset of the Expo SQLite API
 * the data layer uses. The database closes automatically when the current test finishes.
 */
export async function openTestRepository() {
  const sqlite = new DatabaseSync(':memory:');
  onTestFinished(() => sqlite.close());
  const db = {
    execAsync: async (sql: string) => {
      sqlite.exec(sql);
    },
    getFirstAsync: async (sql: string, params: Params = []) => sqlite.prepare(sql).get(...params),
    getAllAsync: async (sql: string, params: Params = []) => sqlite.prepare(sql).all(...params),
    runAsync: async (sql: string, params: Params = []) => sqlite.prepare(sql).run(...params),
    withTransactionAsync: async (action: () => Promise<void>) => {
      sqlite.exec('BEGIN');
      try {
        await action();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  await migrate(db as unknown as SQLiteDatabase);
  return { repo: new HabitRepository(db as unknown as SQLiteDatabase), sqlite, db };
}
