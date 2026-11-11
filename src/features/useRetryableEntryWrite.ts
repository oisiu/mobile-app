import { useApp } from '@/features/AppProvider';
import { EntryRefreshError, entryErrorTitle } from '@/features/entryWriteError';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

export type EntryRequest = { habitId: string; date: string; value: number | null };

type Options = {
  /**
   * Remember a write that committed but failed to refresh, so the next attempt only refreshes.
   * Turn off when there is no open editor to retry from.
   */
  retryable?: boolean;
  /** Skip the `saving` state for instant actions that show no progress. */
  quiet?: boolean;
};

/**
 * Saves or clears one day entry for the editors on Home, Calendar and Insights.
 *
 * An entry write can commit and then fail to refresh the screen. That request is kept, and
 * every later attempt repeats it instead of whatever the editor now holds, so the record is
 * never written twice. Failures are reported with an alert; the result says whether it succeeded.
 */
export function useRetryableEntryWrite() {
  const { changeEntry } = useApp();
  const busy = useRef(false);
  const committed = useRef<EntryRequest | null>(null);
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  /** Forgets a committed request, e.g. when its editor is dismissed. */
  const reset = useCallback(() => {
    committed.current = null;
    setNeedsRefresh(false);
  }, []);

  const run = useCallback(
    async (request: EntryRequest, { retryable = true, quiet = false }: Options = {}) => {
      if (busy.current) return false;
      busy.current = true;
      const operation = committed.current ?? request;
      if (!quiet) setSavingDate(operation.date);
      try {
        await changeEntry(operation.habitId, operation.date, operation.value);
        reset();
        return true;
      } catch (error) {
        if (error instanceof EntryRefreshError && retryable) {
          committed.current = operation;
          setNeedsRefresh(true);
        }
        Alert.alert(entryErrorTitle(error), error instanceof Error ? error.message : String(error));
        return false;
      } finally {
        busy.current = false;
        if (!quiet) setSavingDate(null);
      }
    },
    [changeEntry, reset],
  );

  return {
    run,
    reset,
    /** True while a write is in flight; safe to read inside event handlers. */
    isBusy: useCallback(() => busy.current, []),
    /** The request waiting for a refresh-only retry, if any. */
    pending: useCallback(() => committed.current, []),
    saving: savingDate !== null,
    savingDate,
    needsRefresh,
  };
}
