import { useState, useEffect, useCallback, useRef } from 'react';
import type { WorkoutDay, WorkoutExercise } from '../../../types/workout.types';
import type {
  WorkoutSessionRecord,
  WorkoutSessionStatus,
  WorkoutSyncStatus,
} from '../../../types/workout-session.types';
import { uuidv4 } from '../../../utils/uuid';
import { useAuth } from '../../auth';
import { queueWorkoutSessionSync } from '../services/workout-sync';
import {
  clearSession,
  getSession,
  saveSession,
} from '../store/workout-session-storage';

export interface UseWorkoutSessionResult {
  exercises: WorkoutExercise[];
  status: WorkoutSessionStatus;
  syncStatus: WorkoutSyncStatus;
  lastSyncError: string | null;
  isLoading: boolean;
  toggleExercise: (exerciseId: string) => void;
  finishWorkout: () => void;
  markMissed: () => void;
  retrySync: () => void;
  resetSession: () => void;
}

export function useWorkoutSession(day: WorkoutDay): UseWorkoutSessionResult {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<WorkoutExercise[]>(day.exercises);
  const [status, setStatus] = useState<WorkoutSessionStatus>('in_progress');
  const [syncStatus, setSyncStatus] = useState<WorkoutSyncStatus>('local');
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Timestamps + server id stored in refs so they don't cause re-renders or
  // stale-closure issues across the persistence effect.
  const startedAtRef = useRef(new Date().toISOString());
  const finishedAtRef = useRef<string | undefined>(undefined);
  const missedAtRef = useRef<string | undefined>(undefined);
  const serverIdRef = useRef<string | undefined>(undefined);
  // Guards the persistence effect: only persist after the user takes an action,
  // never on the initial load from storage (which would overwrite saved timestamps).
  const hasUserInteracted = useRef(false);

  // Load saved session from AsyncStorage; reset everything if the day changes.
  useEffect(() => {
    setExercises(day.exercises);
    setStatus('in_progress');
    setSyncStatus('local');
    setLastSyncError(null);
    setIsLoading(true);
    hasUserInteracted.current = false;
    startedAtRef.current = new Date().toISOString();
    finishedAtRef.current = undefined;
    missedAtRef.current = undefined;
    serverIdRef.current = undefined;

    let cancelled = false;

    getSession(day.id)
      .then((saved) => {
        if (cancelled) return;
        if (saved) {
          setExercises(saved.exercises);
          setStatus(saved.status);
          setSyncStatus(saved.syncStatus);
          setLastSyncError(saved.lastSyncError ?? null);
          startedAtRef.current = saved.startedAt;
          finishedAtRef.current = saved.finishedAt;
          missedAtRef.current = saved.missedAt;
          serverIdRef.current = saved.serverId;
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

  const buildRecord = useCallback(
    (
      nextExercises: WorkoutExercise[],
      nextStatus: WorkoutSessionStatus,
      nextSyncStatus: WorkoutSyncStatus,
      nextError?: string | null,
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
      serverId: serverIdRef.current,
      lastSyncError: nextError ?? undefined,
    }),
    [day.id, day.weekDayIndex],
  );

  // Persist + enqueue sync after every user action. The runner awaits Supabase
  // and we then update syncStatus + lastSyncError to reflect the outcome. The
  // UI never blocks: the user keeps interacting while the promise resolves.
  useEffect(() => {
    if (isLoading || !hasUserInteracted.current) return;

    // Lazy-allocate the server-side UUID on the first user action. Reused on
    // every retry so Supabase upsert is idempotent.
    if (!serverIdRef.current) {
      serverIdRef.current = uuidv4();
    }

    const record = buildRecord(exercises, status, syncStatus, lastSyncError);
    saveSession(record).catch(() => {});

    if (syncStatus !== 'pending' || !user?.id) return;

    let cancelled = false;
    queueWorkoutSessionSync({
      userId: user.id,
      session: record,
      sessionId: serverIdRef.current,
    })
      .then((result) => {
        if (cancelled) return;
        if (result.outcome === 'synced') {
          setLastSyncError(null);
          setSyncStatus('synced');
        } else if (result.outcome === 'failed') {
          setLastSyncError(result.error ?? 'Unknown sync error');
          setSyncStatus('failed');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLastSyncError(err instanceof Error ? err.message : String(err));
        setSyncStatus('failed');
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

  /**
   * Wipe the locally-saved session for this day and roll all state back to
   * a fresh start. The matching Supabase row, if any, is left in place — the
   * next finish/miss will upsert over it via the same `serverId`.
   */
  const resetSession = useCallback(() => {
    hasUserInteracted.current = false;
    startedAtRef.current = new Date().toISOString();
    finishedAtRef.current = undefined;
    missedAtRef.current = undefined;
    serverIdRef.current = undefined;
    setExercises(day.exercises.map((e) => ({ ...e, done: false })));
    setStatus('in_progress');
    setSyncStatus('local');
    setLastSyncError(null);
    clearSession(day.id).catch(() => {});
  }, [day.exercises, day.id]);

  return {
    exercises,
    status,
    syncStatus,
    lastSyncError,
    isLoading,
    toggleExercise,
    finishWorkout,
    markMissed,
    retrySync,
    resetSession,
  };
}
