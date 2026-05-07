import { useState, useEffect, useCallback, useRef } from 'react';
import type { WorkoutDay, WorkoutExercise } from '../../../types/workout.types';
import type {
  WorkoutSessionRecord,
  WorkoutSessionStatus,
  WorkoutSyncStatus,
} from '../../../types/workout-session.types';
import { useAuth } from '../../auth';
import { queueWorkoutSessionSync } from '../services/workout-sync';
import { getSession, saveSession } from '../store/workout-session-storage';

export interface UseWorkoutSessionResult {
  exercises: WorkoutExercise[];
  status: WorkoutSessionStatus;
  syncStatus: WorkoutSyncStatus;
  isLoading: boolean;
  toggleExercise: (exerciseId: string) => void;
  finishWorkout: () => void;
  markMissed: () => void;
  retrySync: () => void;
}

/**
 * Stable Supabase row id for a session. Derived from the local day id so the
 * server upsert is idempotent across retries; once Supabase returns its own
 * ids we can swap this for the server value without changing the queue shape.
 */
function sessionIdFor(userId: string, dayId: string): string {
  return `${userId}:${dayId}`;
}

export function useWorkoutSession(day: WorkoutDay): UseWorkoutSessionResult {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<WorkoutExercise[]>(day.exercises);
  const [status, setStatus] = useState<WorkoutSessionStatus>('in_progress');
  const [syncStatus, setSyncStatus] = useState<WorkoutSyncStatus>('local');
  const [isLoading, setIsLoading] = useState(true);

  // Timestamps stored in refs so they don't cause re-renders or stale-closure issues
  const startedAtRef = useRef(new Date().toISOString());
  const finishedAtRef = useRef<string | undefined>(undefined);
  const missedAtRef = useRef<string | undefined>(undefined);
  // Guards the persistence effect: only persist after the user takes an action,
  // never on the initial load from storage (which would overwrite saved timestamps).
  const hasUserInteracted = useRef(false);

  // Load saved session from AsyncStorage; reset everything if the day changes.
  useEffect(() => {
    setExercises(day.exercises);
    setStatus('in_progress');
    setSyncStatus('local');
    setIsLoading(true);
    hasUserInteracted.current = false;
    startedAtRef.current = new Date().toISOString();
    finishedAtRef.current = undefined;
    missedAtRef.current = undefined;

    let cancelled = false;

    getSession(day.id)
      .then((saved) => {
        if (cancelled) return;
        if (saved) {
          setExercises(saved.exercises);
          setStatus(saved.status);
          setSyncStatus(saved.syncStatus);
          startedAtRef.current = saved.startedAt;
          finishedAtRef.current = saved.finishedAt;
          missedAtRef.current = saved.missedAt;
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // day.exercises is intentionally excluded: for a given day.id the exercise list
    // is always the same (generated from the mocked program), so we only react to id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.id]);

  // Build the current record snapshot. Used both for persistence and queue payload.
  const buildRecord = useCallback(
    (
      nextExercises: WorkoutExercise[],
      nextStatus: WorkoutSessionStatus,
      nextSyncStatus: WorkoutSyncStatus,
    ): WorkoutSessionRecord => ({
      dayId: day.id,
      weekDayIndex: day.weekDayIndex,
      status: nextStatus,
      syncStatus: nextSyncStatus,
      exercises: nextExercises,
      startedAt: startedAtRef.current,
      finishedAt: finishedAtRef.current,
      missedAt: missedAtRef.current,
      updatedAt: new Date().toISOString(),
    }),
    [day.id, day.weekDayIndex],
  );

  // Persist to AsyncStorage and enqueue a sync push after every user action.
  // The queue + runner await Supabase, then we update syncStatus to reflect
  // the final outcome (synced / failed). The UI never blocks: the user keeps
  // interacting with the hook while the promise resolves in the background.
  useEffect(() => {
    if (isLoading || !hasUserInteracted.current) return;

    const record = buildRecord(exercises, status, syncStatus);
    saveSession(record).catch(() => {});

    if (syncStatus !== 'pending' || !user?.id) return;

    let cancelled = false;
    queueWorkoutSessionSync({
      userId: user.id,
      session: record,
      sessionId: sessionIdFor(user.id, day.id),
    })
      .then((outcome) => {
        if (cancelled) return;
        if (outcome === 'synced') setSyncStatus('synced');
        else if (outcome === 'failed') setSyncStatus('failed');
      })
      .catch(() => {
        if (!cancelled) setSyncStatus('failed');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises, status, syncStatus, isLoading]);

  const toggleExercise = useCallback((exerciseId: string) => {
    hasUserInteracted.current = true;
    setExercises((prev) =>
      prev.map((e) => (e.exerciseId === exerciseId ? { ...e, done: !e.done } : e)),
    );
    setSyncStatus('pending');
  }, []);

  const finishWorkout = useCallback(() => {
    hasUserInteracted.current = true;
    finishedAtRef.current = new Date().toISOString();
    setStatus('completed');
    setSyncStatus('pending');
  }, []);

  const markMissed = useCallback(() => {
    hasUserInteracted.current = true;
    missedAtRef.current = new Date().toISOString();
    setStatus('missed');
    setSyncStatus('pending');
  }, []);

  const retrySync = useCallback(() => {
    if (!user?.id) return;
    hasUserInteracted.current = true;
    setSyncStatus('pending');
  }, [user?.id]);

  return {
    exercises,
    status,
    syncStatus,
    isLoading,
    toggleExercise,
    finishWorkout,
    markMissed,
    retrySync,
  };
}
