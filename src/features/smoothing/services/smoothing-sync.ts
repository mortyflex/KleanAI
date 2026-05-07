import type { Json } from '../../../types/database.types';
import type {
  SmoothingEvent,
  SmoothingResult,
} from '../../../types/smoothing.types';
import { enqueue } from '../../sync/sync-queue-storage';
import { runSync } from '../../sync/sync-runner';

interface QueueSmoothingInput {
  userId: string;
  event: SmoothingEvent;
  result: SmoothingResult;
  /** Stable id for dedupe — usually the local event id or a generated uuid. */
  eventId: string;
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
 * Persist a smoothing decision to the sync queue so the server keeps a record
 * of how the plan adapted. The local Smoothing Engine remains the source of
 * truth; Supabase is just a durable log used for analytics and history.
 */
export async function queueSmoothingSync(input: QueueSmoothingInput): Promise<void> {
  const { userId, event, result, eventId } = input;
  await enqueue({
    resource: 'smoothing_event',
    dedupeKey: `smoothing_event:${eventId}`,
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
  runSync().catch(() => {});
}
