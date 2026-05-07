import type { WorkoutExercise } from './workout.types';

export type WorkoutSyncStatus = 'local' | 'pending' | 'syncing' | 'synced' | 'failed';
export type WorkoutSessionStatus = 'in_progress' | 'completed' | 'missed';

export interface WorkoutSessionRecord {
  dayId: string;
  weekDayIndex: number;
  status: WorkoutSessionStatus;
  syncStatus: WorkoutSyncStatus;
  exercises: WorkoutExercise[];
  startedAt: string;
  finishedAt?: string;
  missedAt?: string;
  updatedAt: string;
  /**
   * UUID v4 generated client-side on the first user interaction. Used as the
   * `id` of the matching `workout_sessions` row in Supabase so upserts are
   * idempotent across retries. Persisted with the rest of the record.
   */
  serverId?: string;
  /** Last error reported by the sync runner, if any. Surfaced in the UI. */
  lastSyncError?: string;
}
