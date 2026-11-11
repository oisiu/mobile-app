import { describe, expect, it, vi } from 'vitest';
import type { Entry, ExportData, Habit } from '../src/domain/types';
import { validateImport } from '../src/domain/import';
import { openTestRepository } from './support/testDatabase';

vi.mock('expo-sqlite', () => ({}));

const now = '2025-01-01T00:00:00.000Z';
const date = '2025-01-01';

const habit = (id: string, parentId: string | null = null, sortOrder = 0, isGeneral = false): Habit => ({
  id,
  parentId,
  sortOrder,
  isGeneral,
  name: id,
  emoji: '•',
  type: 'number',
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
});

const entry = (id: string, habitId: string, localDate = date): Entry => ({
  id,
  habitId,
  value: 5,
  localDate,
  occurredAt: now,
  timezone: 'UTC',
  createdAt: now,
  updatedAt: now,
});

const doc = (habits: Habit[], entries: Entry[] = []): ExportData => ({ version: 1, exportedAt: now, habits, entries });

/** root → General + first + second(→ General + nested), with one record on each leaf. */
const branch = () =>
  doc(
    [
      habit('root'),
      habit('root-general', 'root', -1, true),
      habit('first', 'root', 0),
      habit('second', 'root', 1),
      habit('second-general', 'second', -1, true),
      habit('nested', 'second', 0),
    ],
    [entry('direct', 'root-general'), entry('first-record', 'first'), entry('nested-record', 'nested')],
  );

async function seeded(data = branch()) {
  const opened = await openTestRepository();
  await opened.repo.import(data);
  return opened;
}

const ids = (habits: Habit[]) => habits.map(item => item.id).sort();
const owners = (entries: Entry[]) => Object.fromEntries(entries.map(item => [item.id, item.habitId]));

describe('Entry clearing', () => {
  it('removes only the selected leaf record for that date', async () => {
    const { repo } = await seeded({
      ...branch(),
      entries: [...branch().entries, entry('first-other-day', 'first', '2025-01-02')],
    });
    await repo.clearEntry('first', date);
    expect(owners(await repo.entries())).toEqual({
      direct: 'root-general',
      'first-other-day': 'first',
      'nested-record': 'nested',
    });
  });

  it('removes a parent’s direct record from General and keeps descendant records', async () => {
    const { repo } = await seeded();
    await repo.clearEntry('root', date);
    expect(owners(await repo.entries())).toEqual({ 'first-record': 'first', 'nested-record': 'nested' });
  });
});

describe('Habit removal', () => {
  it('cascades through the subtree and closes the gap in sibling order', async () => {
    const { repo } = await seeded();
    await repo.remove('first');
    const habits = await repo.habits();
    expect(ids(habits)).toEqual(['nested', 'root', 'root-general', 'second', 'second-general']);
    expect(habits.find(item => item.id === 'second')?.sortOrder).toBe(0);
    expect(owners(await repo.entries())).toEqual({ direct: 'root-general', 'nested-record': 'nested' });
  });

  it('returns General records to a parent that lost its last child', async () => {
    const { repo } = await seeded();
    await repo.saveEntry({ habitId: 'second', value: 3, localDate: '2025-01-02' });
    await repo.remove('nested');
    const habits = await repo.habits();
    expect(ids(habits)).toEqual(['first', 'root', 'root-general', 'second']);
    expect((await repo.entries()).filter(item => item.habitId === 'second').map(item => item.value)).toEqual([3]);
    expect(() => validateImport(doc(habits, []))).not.toThrow();
  });

  it('ignores an unknown habit', async () => {
    const { repo } = await seeded();
    const before = await repo.export();
    await repo.remove('missing');
    expect((await repo.export()).habits).toEqual(before.habits);
  });

  it('rolls back the deletion when a follow-up write fails', async () => {
    const { repo, db } = await seeded();
    const before = await repo.export();
    const run = db.runAsync;
    const failure = vi.spyOn(db, 'runAsync').mockImplementation(async (sql, params) => {
      if (sql.startsWith('UPDATE habits SET sort_order')) throw new Error('Synthetic removal failure');
      return run(sql, params);
    });
    await expect(repo.remove('first')).rejects.toThrow('Synthetic removal failure');
    failure.mockRestore();
    const after = await repo.export();
    expect(after.habits).toEqual(before.habits);
    expect(after.entries).toEqual(before.entries);
  });
});

describe('Hierarchy save deletions', () => {
  const rootUpdate = { id: 'root', name: 'root', emoji: '•' };

  it('deletes a staged subtree, reorders siblings and keeps unrelated records', async () => {
    const { repo } = await seeded();
    await repo.editTree('root', [rootUpdate], [], ['first']);
    const habits = await repo.habits();
    expect(ids(habits)).toEqual(['nested', 'root', 'root-general', 'second', 'second-general']);
    expect(habits.find(item => item.id === 'second')?.sortOrder).toBe(0);
    expect(owners(await repo.entries())).toEqual({ direct: 'root-general', 'nested-record': 'nested' });
  });

  it('treats a nested selection as part of its deleted ancestor', async () => {
    const { repo } = await seeded();
    await repo.editTree('root', [rootUpdate], [], ['nested', 'second']);
    expect(ids(await repo.habits())).toEqual(['first', 'root', 'root-general']);
  });

  it('collapses General when every real child is deleted', async () => {
    const { repo } = await seeded();
    await repo.editTree('root', [rootUpdate], [], ['first', 'second']);
    expect(ids(await repo.habits())).toEqual(['root']);
    expect(owners(await repo.entries())).toEqual({ direct: 'root' });
  });

  it('rejects deleting the root, foreign habits and attachments into deleted branches', async () => {
    const { repo } = await seeded({ ...branch(), habits: [...branch().habits, habit('other', null, 1)] });
    const before = await repo.export();
    await expect(repo.editTree('root', [], [], ['root'])).rejects.toThrow('Invalid subtree deletion');
    await expect(repo.editTree('root', [], [], ['other'])).rejects.toThrow('Invalid subtree deletion');
    await expect(
      repo.editTree('root', [], [], ['second'], [{ id: 'other', parentKey: 'second', expectedParentId: null }]),
    ).rejects.toThrow('Deleted attachment destination');
    expect((await repo.export()).habits).toEqual(before.habits);
  });
});

describe('Root creation through a hierarchy save', () => {
  const input = { name: 'New', emoji: '✨', type: 'number' as const, parentId: null };
  const child = { key: 'child', parentKey: '__new_root__', name: 'Child', emoji: '✨' };

  it('creates the root with its preferences and children in one write', async () => {
    const { repo } = await openTestRepository();
    const id = await repo.createTree({ ...input, color: 'blue', hideFromOverview: true }, [], [child], []);
    const habits = await repo.habits();
    expect(habits.find(item => item.id === id)).toMatchObject({ color: 'blue', hideFromOverview: true, sortOrder: 0 });
    expect(
      habits
        .filter(item => item.parentId === id)
        .map(item => item.name)
        .sort(),
    ).toEqual(['Child', 'General']);
    expect(() => validateImport(doc(habits))).not.toThrow();
  });

  it('rejects non-root input and non-boolean visibility without writing', async () => {
    const { repo } = await seeded();
    const before = await repo.export();
    await expect(repo.createTree({ ...input, parentId: 'root' }, [], [child], [])).rejects.toThrow('Invalid root');
    await expect(repo.createTree({ ...input, isHidden: 'yes' as unknown as boolean }, [], [child], [])).rejects.toThrow(
      'Invalid visibility',
    );
    expect((await repo.export()).habits).toEqual(before.habits);
  });
});
