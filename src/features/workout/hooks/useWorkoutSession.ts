import { useState, useEffect, useCallback, useRef } from 'react';
import type { WorkoutDay, WorkoutExercise } from '../../../types/workout.types';
import type {
  WorkoutSessionRecord,
  WorkoutSessionStatus,
  WorkoutSyncStatus,
} from '../../../types/workout-session.types';
import { getSession, saveSession } from '../store/workout-session-storage';

export interface UseWorkoutSessionResult {
  exercises: WorkoutExercise[];
  status: WorkoutSessionStatus;
  syncStatus: WorkoutSyncStatus;
  isLoading: boolean;
  toggleExercise: (exerciseId: string) => void;
  finishWorkout: () => void;
  markMissed: () => void;
}

export function useWorkoutSession(day: WorkoutDay): UseWorkoutSessionResult {
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

  // Persist to AsyncStorage after every user-triggered state change.
  useEffect(() => {
    if (isLoading || !hasUserInteracted.current) return;

    const record: WorkoutSessionRecord = {
      dayId: day.id,
      weekDayIndex: day.weekDayIndex,
      status,
      syncStatus,
      exercises,
      startedAt: startedAtRef.current,
      finishedAt: finishedAtRef.current,
      missedAt: missedAtRef.current,
      updatedAt: new Date().toISOString(),
    };

    saveSession(record).catch(() => {});
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

  return { exercises, status, syncStatus, isLoading, toggleExercise, finishWorkout, markMissed };
}
