import type { Json } from '../../../types/database.types';
import type {
  SmoothingEvent,
  SmoothingResult,
} from '../../../types/smoothing.types';
import { enqueue, getAll } from '../../sync/sync-queue-storage';
import { runSync } from '../../sync/sync-runner';

interface QueueSmoothingInput {
  userId: string;
  event: SmoothingEvent;
  result: SmoothingResult;
  /** Stable id for dedupe — usually the local event id or a generated uuid. */
  eventId: string;
}

export type SmoothingSyncOutcome = 'synced' | 'failed' | 'pending';

export interface SmoothingSyncResult {
  outcome: SmoothingSyncOutcome;
  /** First non-empty error reported by the queued item, if it ended in `failed`. */
  error?: string;
}

function totalDelta(result: SmoothingResult): number | null {
  if (!result.ok) return null;
  if (result.category !== 'nutrition') return null;
  return result.adjustments.reduce((sum, a) => sum + a.kcalDelta, 0);
}

function spreadDays(result: SmoothingResult): number | null {
  if (!result.ok) return null;
  if (result.category !== 'nutrition') return null;
  return result.spreadDays;
}

/**
 * Persist a smoothing decision to the sync queue, drain it, and report the
 * outcome. The local Smoothing Engine remains the source of truth; Supabase is
 * just a durable log used for analytics and history. The hook uses the outcome
 * to flip status to synced / failed.
 */
export async function queueSmoothingSync(
  input: QueueSmoothingInput,
): Promise<SmoothingSyncResult> {
  const { userId, event, result, eventId } = input;
  const dedupeKey = `smoothing_event:${eventId}`;

  await enqueue({
    resource: 'smoothing_event',
    dedupeKey,
    payload: {
      user_id: userId,
      event_type: event.type,
      delta_kcal: totalDelta(result),
      spread_days: spreadDays(result),
      payload: {
        event,
        result,
      } as unknown as Json,
    } as unknown as Json,
  });

  await runSync();

  const all = await getAll();
  const ours = all.filter(
    (i) => i.dedupeKey === dedupeKey && i.resource === 'smoothing_event',
  );
  if (ours.length === 0) return { outcome: 'pending' };
  if (ours.every((i) => i.status === 'synced')) return { outcome: 'synced' };
  const failed = ours.find((i) => i.status === 'failed');
  if (failed) {
    return { outcome: 'failed', error: failed.lastError };
  }
  return { outcome: 'pending' };
}
