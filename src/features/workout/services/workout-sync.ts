import type { Json } from '../../../types/database.types';
import type { WorkoutSessionRecord } from '../../../types/workout-session.types';
import { enqueue, getAll } from '../../sync/sync-queue-storage';
import { runSync } from '../../sync/sync-runner';

interface QueueWorkoutSessionInput {
  userId: string;
  session: WorkoutSessionRecord;
  /** Stable id used as the Supabase row id and dedupe key. */
  sessionId: string;
}

export type WorkoutSessionSyncOutcome = 'synced' | 'failed' | 'pending';

function logKey(sessionId: string, exerciseId: string): string {
  return `workout_log:${sessionId}:${exerciseId}`;
}

/**
 * Persist a workout session change to the sync queue and drain it. Returns
 * the resulting outcome the UI should show:
 *   - `synced` — every queued row landed in Supabase.
 *   - `failed` — at least one row threw and is left in `failed` state.
 *   - `pending` — the runner skipped some items (e.g. attempts cap reached).
 *
 * Each completed exercise is enqueued as its own `workout_log` row so partial
 * progress is preserved even if the session row fails to upsert.
 */
export async function queueWorkoutSessionSync(
  input: QueueWorkoutSessionInput,
): Promise<WorkoutSessionSyncOutcome> {
  const { userId, session, sessionId } = input;
  const sessionDedupe = `workout_session:${sessionId}`;
  const logDedupes: string[] = [];

  await enqueue({
    resource: 'workout_session',
    dedupeKey: sessionDedupe,
    payload: {
      user_id: userId,
      session_id: sessionId,
      day_id: session.dayId,
      status: session.status,
      finished_at: session.finishedAt ?? null,
      missed_at: session.missedAt ?? null,
    } as unknown as Json,
  });

  let setIndex = 0;
  for (const ex of session.exercises) {
    if (!ex.done) continue;
    setIndex += 1;
    const dedupeKey = logKey(sessionId, ex.exerciseId);
    logDedupes.push(dedupeKey);
    await enqueue({
      resource: 'workout_log',
      dedupeKey,
      payload: {
        user_id: userId,
        session_id: sessionId,
        exercise_key: ex.exerciseId,
        set_index: setIndex,
        reps: ex.reps,
        logged_at: session.updatedAt,
      } as unknown as Json,
    });
  }

  await runSync();

  const all = await getAll();
  const ours = all.filter(
    (i) => i.dedupeKey === sessionDedupe || logDedupes.includes(i.dedupeKey),
  );
  if (ours.length === 0) return 'pending';
  if (ours.every((i) => i.status === 'synced')) return 'synced';
  if (ours.some((i) => i.status === 'failed')) return 'failed';
  return 'pending';
}
