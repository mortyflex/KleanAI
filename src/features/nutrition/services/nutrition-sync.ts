import type { Json } from '../../../types/database.types';
import { enqueue } from '../../sync/sync-queue-storage';
import { runSync } from '../../sync/sync-runner';
import type { DailyNutritionRecord } from '../types';

interface QueueNutritionInput {
  userId: string;
  record: DailyNutritionRecord;
}

/**
 * Persist a day's nutrition totals to the sync queue and trigger a drain.
 * Daily logs are upserted on `(user_id, log_date)` so re-queuing the same
 * day overwrites the previous payload server-side without creating a dupe.
 */
export async function queueNutritionSync(input: QueueNutritionInput): Promise<void> {
  const { userId, record } = input;
  await enqueue({
    resource: 'nutrition_log',
    dedupeKey: `nutrition_log:${record.logDate}`,
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
  runSync().catch(() => {});
}
