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
  logEvent: (event: SmoothingEvent, result: SmoothingResult) => Promise<string | null>;
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Records a smoothing decision in the sync queue. Optimistic: sets `pending`
 * immediately, then leaves the runner to update the queue entry. The hook
 * does not poll; screens should re-render via `useSyncQueue` if they want to
 * reflect synced/failed states from elsewhere in the app.
 */
export function useSmoothingLogger(): UseSmoothingLoggerResult {
  const { user } = useAuth();
  const [status, setStatus] = useState<SmoothingLogStatus>('idle');
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const logEvent = useCallback(
    async (event: SmoothingEvent, result: SmoothingResult) => {
      if (!user?.id) {
        setStatus('failed');
        return null;
      }
      const eventId = event.id ?? makeId();
      setLastEventId(eventId);
      setStatus('pending');
      try {
        await queueSmoothingSync({
          userId: user.id,
          event: { ...event, id: eventId },
          result,
          eventId,
        });
        return eventId;
      } catch {
        setStatus('failed');
        return null;
      }
    },
    [user?.id],
  );

  return { status, lastEventId, logEvent };
}
