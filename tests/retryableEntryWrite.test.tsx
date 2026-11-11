import { useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EntryRefreshError } from '../src/features/entryWriteError';
import { useRetryableEntryWrite, type EntryRequest } from '../src/features/useRetryableEntryWrite';
import { t } from '../src/i18n';

const mocks = vi.hoisted(() => ({ changeEntry: vi.fn(), alert: vi.fn() }));
vi.mock('react-native', () => ({ Alert: { alert: mocks.alert } }));
vi.mock('../src/features/AppProvider', () => ({ useApp: () => ({ changeEntry: mocks.changeEntry }) }));

let renderer: ReactTestRenderer;
let write: ReturnType<typeof useRetryableEntryWrite>;
const states: boolean[] = [];
function Harness() {
  const current = useRetryableEntryWrite();
  useLayoutEffect(() => {
    write = current;
    states.push(current.saving);
  });
  return null;
}
const request = (value: number | null, date = '2026-09-08'): EntryRequest => ({ habitId: 'habit', date, value });
const run = async (...args: Parameters<typeof write.run>) => {
  let result = false;
  await act(async () => {
    result = await write.run(...args);
  });
  return result;
};

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  mocks.changeEntry.mockResolvedValue(undefined);
  await act(async () => {
    renderer = create(<Harness />);
  });
  states.length = 0;
});
afterEach(async () => {
  await act(async () => renderer.unmount());
});

it('writes the entry, reports progress for its date, and resolves true', async () => {
  let finish!: () => void;
  mocks.changeEntry.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
  let result: Promise<boolean>;
  await act(async () => {
    result = write.run(request(3));
  });
  expect(write.saving).toBe(true);
  expect(write.savingDate).toBe('2026-09-08');
  expect(write.isBusy()).toBe(true);
  await act(async () => {
    finish();
    expect(await result).toBe(true);
  });
  expect(mocks.changeEntry).toHaveBeenCalledExactlyOnceWith('habit', '2026-09-08', 3);
  expect(write.saving).toBe(false);
  expect(write.isBusy()).toBe(false);
  expect(mocks.alert).not.toHaveBeenCalled();
});

it('ignores a second write while one is in flight', async () => {
  let finish!: () => void;
  mocks.changeEntry.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
  await act(async () => {
    void write.run(request(1));
    expect(await write.run(request(2))).toBe(false);
  });
  expect(mocks.changeEntry).toHaveBeenCalledOnce();
  await act(async () => finish());
});

it('reports a failed write without remembering it', async () => {
  mocks.changeEntry.mockRejectedValueOnce(new Error('Disk full'));
  expect(await run(request(1))).toBe(false);
  expect(mocks.alert).toHaveBeenCalledWith(t('couldNotSave'), 'Disk full');
  expect(write.needsRefresh).toBe(false);
  expect(write.pending()).toBeNull();
  expect(await run(request(2))).toBe(true);
  expect(mocks.changeEntry).toHaveBeenLastCalledWith('habit', '2026-09-08', 2);
});

it('repeats a committed request instead of the new one until the refresh succeeds', async () => {
  mocks.changeEntry.mockRejectedValueOnce(new EntryRefreshError()).mockRejectedValueOnce(new EntryRefreshError());
  expect(await run(request(5))).toBe(false);
  expect(mocks.alert).toHaveBeenCalledWith(t('habitSavedRefreshFailed'), t('entrySavedRefreshHelp'));
  expect(write.needsRefresh).toBe(true);
  expect(write.pending()).toEqual(request(5));
  // The editor may have changed meanwhile; the saved value and date must not be replaced.
  expect(await run(request(9, '2026-09-01'))).toBe(false);
  expect(await run(request(null, '2026-08-01'))).toBe(true);
  expect(mocks.changeEntry.mock.calls).toEqual([
    ['habit', '2026-09-08', 5],
    ['habit', '2026-09-08', 5],
    ['habit', '2026-09-08', 5],
  ]);
  expect(write.needsRefresh).toBe(false);
  expect(write.pending()).toBeNull();
});

it('does not remember a committed write when there is nothing to retry from', async () => {
  mocks.changeEntry.mockRejectedValueOnce(new EntryRefreshError());
  expect(await run(request(1), { retryable: false })).toBe(false);
  expect(mocks.alert).toHaveBeenCalledOnce();
  expect(write.needsRefresh).toBe(false);
  expect(write.pending()).toBeNull();
});

it('forgets a committed request when its editor is dismissed', async () => {
  mocks.changeEntry.mockRejectedValueOnce(new EntryRefreshError());
  await run(request(5));
  await act(async () => write.reset());
  expect(write.needsRefresh).toBe(false);
  expect(await run(request(7))).toBe(true);
  expect(mocks.changeEntry).toHaveBeenLastCalledWith('habit', '2026-09-08', 7);
});

it('skips the saving state for quiet writes but still blocks overlapping ones', async () => {
  let finish!: () => void;
  mocks.changeEntry.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
  await act(async () => {
    void write.run(request(1), { quiet: true });
  });
  expect(write.isBusy()).toBe(true);
  await act(async () => finish());
  expect(states).not.toContain(true);
  expect(write.isBusy()).toBe(false);
});

it('keeps stable callbacks across renders', async () => {
  const before = { run: write.run, reset: write.reset, isBusy: write.isBusy, pending: write.pending };
  await run(request(1));
  expect({ run: write.run, reset: write.reset, isBusy: write.isBusy, pending: write.pending }).toEqual(before);
});
