import type { Json } from '../../../types/database.types';
import { enqueue, getAll } from '../../sync/sync-queue-storage';
import { runSync } from '../../sync/sync-runner';
import type { DailyNutritionRecord } from '../types';

interface QueueNutritionInput {
  userId: string;
  record: DailyNutritionRecord;
}

export type NutritionSyncOutcome = 'synced' | 'failed' | 'pending';

export interface NutritionSyncResult {
  outcome: NutritionSyncOutcome;
  /** First non-empty error reported by the queued item, if it ended in `failed`. */
  error?: string;
}

/**
 * Persist a day's nutrition totals to the sync queue, drain it, and report the
 * outcome. Daily logs are upserted on `(user_id, log_date)` so re-queuing the
 * same day overwrites the previous payload server-side without creating a
 * dupe. The hook uses the outcome to flip syncStatus to synced / failed.
 */
export async function queueNutritionSync(
  input: QueueNutritionInput,
): Promise<NutritionSyncResult> {
  const { userId, record } = input;
  const dedupeKey = `nutrition_log:${record.logDate}`;

  await enqueue({
    resource: 'nutrition_log',
    dedupeKey,
    payload: {
      user_id: userId,
      log_date: record.logDate,
      calories: record.calories,
      protein_g: record.proteinG,
      carbs_g: record.carbsG,
      fat_g: record.fatG,
      notes: record.notes ?? null,
    } as unknown as Json,
  });

  await runSync();

  const all = await getAll();
  const ours = all.filter(
    (i) => i.dedupeKey === dedupeKey && i.resource === 'nutrition_log',
  );
  if (ours.length === 0) return { outcome: 'pending' };
  if (ours.every((i) => i.status === 'synced')) return { outcome: 'synced' };
  const failed = ours.find((i) => i.status === 'failed');
  if (failed) {
    return { outcome: 'failed', error: failed.lastError };
  }
  return { outcome: 'pending' };
}
