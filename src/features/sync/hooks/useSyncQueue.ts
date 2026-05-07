import { useCallback, useEffect, useState } from 'react';
import { runSync } from '../sync-runner';
import { getCounts } from '../sync-queue-storage';
import type { SyncQueueCounts } from '../types';

const ZERO: SyncQueueCounts = { pending: 0, syncing: 0, synced: 0, failed: 0 };

/**
 * Read the live sync queue counts and expose a manual retry trigger. The
 * counts are refreshed on mount and after every retry — the runner itself
 * is fire-and-forget elsewhere, so this hook is mainly a UI surface for
 * "X pending / Y failed" badges and a "Retry sync" button.
 */
export function useSyncQueue(): {
  counts: SyncQueueCounts;
  isSyncing: boolean;
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const [counts, setCounts] = useState<SyncQueueCounts>(ZERO);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await getCounts();
      setCounts(next);
    } catch {
      // counts are advisory — never crash the UI on read failure
    }
  }, []);

  const retry = useCallback(async () => {
    setIsSyncing(true);
    try {
      await runSync();
    } finally {
      setIsSyncing(false);
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { counts, isSyncing, retry, refresh };
}
