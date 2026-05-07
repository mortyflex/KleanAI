import { useCallback, useState } from 'react';
import type {
  SmoothingEvent,
  SmoothingResult,
} from '../../../types/smoothing.types';
import { useAuth } from '../../auth';
import type { SyncItemStatus } from '../../sync/types';
import { queueSmoothingSync } from '../services/smoothing-sync';

export type SmoothingLogStatus = SyncItemStatus | 'idle';

export interface UseSmoothingLoggerResult {
  status: SmoothingLogStatus;
  lastEventId: string | null;
  lastSyncError: string | null;
  logEvent: (event: SmoothingEvent, result: SmoothingResult) => Promise<string | null>;
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Records a smoothing decision in the sync queue. Optimistic: sets `pending`
 * immediately, then awaits the runner's outcome to flip to `synced` or
 * `failed`. The hook does not poll; screens that want to reflect the queue
 * counts globally should use `useSyncQueue`.
 */
export function useSmoothingLogger(): UseSmoothingLoggerResult {
  const { user } = useAuth();
  const [status, setStatus] = useState<SmoothingLogStatus>('idle');
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const logEvent = useCallback(
    async (event: SmoothingEvent, result: SmoothingResult) => {
      if (!user?.id) {
        setStatus('failed');
        setLastSyncError('No authenticated user');
        return null;
      }
      const eventId = event.id ?? makeId();
      setLastEventId(eventId);
      setLastSyncError(null);
      setStatus('pending');
      try {
        const queueResult = await queueSmoothingSync({
          userId: user.id,
          event: { ...event, id: eventId },
          result,
          eventId,
        });
        if (queueResult.outcome === 'synced') {
          setStatus('synced');
        } else if (queueResult.outcome === 'failed') {
          setStatus('failed');
          setLastSyncError(queueResult.error ?? 'Unknown sync error');
        }
        return eventId;
      } catch (err) {
        setStatus('failed');
        setLastSyncError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [user?.id],
  );

  return { status, lastEventId, lastSyncError, logEvent };
}
