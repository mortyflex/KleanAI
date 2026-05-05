import type { WorkoutExercise } from './workout.types';

export type WorkoutSyncStatus = 'local' | 'pending' | 'synced';
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
}
