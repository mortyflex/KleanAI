import type { SyncItemStatus } from '../sync/types';

export type NutritionSyncStatus = SyncItemStatus | 'local';

/**
 * Local snapshot of one calendar day's nutrition totals. Mirrors the shape of
 * `daily_nutrition_logs` in Supabase so we can ship the record straight to
 * the sync handler without remapping fields.
 */
export interface DailyNutritionRecord {
  logDate: string; // YYYY-MM-DD, local timezone
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes?: string;
  syncStatus: NutritionSyncStatus;
  updatedAt: string;
}
