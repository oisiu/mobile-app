import { migrate } from '@/data/migrations';
import { HabitRepository } from '@/data/repository';
import type { Entry, Habit } from '@/domain/types';
import * as SQLite from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

type Snapshot = { habits: Habit[]; entries: Entry[] };

async function readSnapshot(repo: HabitRepository): Promise<Snapshot> {
  const [habits, entries] = await Promise.all([repo.habits(), repo.entries()]);
  return { habits, entries };
}

export function useAppData() {
  const [ready, setReady] = useState(false);
  const [repo, setRepo] = useState<HabitRepository | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>({ habits: [], entries: [] });
  const [error, setError] = useState<string | null>(null);
  const startupPending = useRef(false);
  const refreshQueue = useRef(Promise.resolve());

  const refresh = useCallback(() => {
    if (!repo) return Promise.resolve();
    // Read both collections together and serialize complete publications.
    // A failed request rejects its caller without blocking the next request.
    const pending = refreshQueue.current.then(async () => {
      const nextSnapshot = await readSnapshot(repo);
      setSnapshot(nextSnapshot);
    });
    refreshQueue.current = pending.catch(() => {});
    return pending;
  }, [repo]);

  const retryStartup = useCallback(async () => {
    if (startupPending.current) return;
    startupPending.current = true;
    setError(null);
    setReady(false);
    let db: SQLite.SQLiteDatabase | undefined;
    try {
      db = await SQLite.openDatabaseAsync('oisiu.db');
      await migrate(db);
      const nextRepo = new HabitRepository(db);
      const nextSnapshot = await readSnapshot(nextRepo);
      setSnapshot(nextSnapshot);
      setRepo(nextRepo);
      setReady(true);
    } catch (error) {
      if (db) await db.closeAsync().catch(() => {});
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      startupPending.current = false;
    }
  }, []);

  useEffect(() => {
    void retryStartup();
  }, [retryStartup]);
  return { ready, error, retryStartup, repo, refresh, ...snapshot };
}
