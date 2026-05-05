import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWorkoutSession } from '../../src/features/workout/hooks/useWorkoutSession';
import * as storage from '../../src/features/workout/store/workout-session-storage';
import type { WorkoutDay } from '../../src/types/workout.types';
import type { WorkoutSessionRecord } from '../../src/types/workout-session.types';

const MOCK_DAY: WorkoutDay = {
  id: 'day-0',
  weekDayIndex: 0,
  nameKey: 'workout.program.days.fullBodyA',
  focus: ['chest', 'back'],
  exercises: [
    {
      exerciseId: 'bench_press',
      nameKey: 'workout.exercises.bench_press',
      muscleGroups: ['chest'],
      category: 'strength',
      sets: 3,
      reps: 10,
      restSec: 90,
      done: false,
    },
    {
      exerciseId: 'barbell_row',
      nameKey: 'workout.exercises.barbell_row',
      muscleGroups: ['back'],
      category: 'strength',
      sets: 3,
      reps: 10,
      restSec: 90,
      done: false,
    },
  ],
  durationMin: 45,
  intensity: 'medium',
  isRestDay: false,
};

describe('useWorkoutSession', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('initial state', () => {
    it('starts with in_progress status', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.status).toBe('in_progress');
    });

    it('starts with local syncStatus', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.syncStatus).toBe('local');
    });

    it('initialises exercises from the provided day', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.exercises).toHaveLength(MOCK_DAY.exercises.length);
      expect(result.current.exercises.every((e) => !e.done)).toBe(true);
    });
  });

  describe('loading saved session', () => {
    it('restores exercises and status from AsyncStorage', async () => {
      const saved: WorkoutSessionRecord = {
        dayId: 'day-0',
        weekDayIndex: 0,
        status: 'completed',
        syncStatus: 'pending',
        exercises: MOCK_DAY.exercises.map((e) => ({ ...e, done: true })),
        startedAt: '2026-05-05T08:00:00.000Z',
        finishedAt: '2026-05-05T08:45:00.000Z',
        updatedAt: '2026-05-05T08:45:00.000Z',
      };
      await storage.saveSession(saved);

      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.status).toBe('completed');
      expect(result.current.syncStatus).toBe('pending');
      expect(result.current.exercises.every((e) => e.done)).toBe(true);
    });

    it('does not persist the restored state back to storage (no spurious save)', async () => {
      const saved: WorkoutSessionRecord = {
        dayId: 'day-0',
        weekDayIndex: 0,
        status: 'missed',
        syncStatus: 'synced',
        exercises: MOCK_DAY.exercises,
        startedAt: '2026-01-01T00:00:00.000Z',
        missedAt: '2026-01-01T00:01:00.000Z',
        updatedAt: '2026-01-01T00:01:00.000Z',
      };
      await storage.saveSession(saved);

      const saveSpy = jest.spyOn(storage, 'saveSession');

      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // No user interaction → saveSession must not have been called
      expect(saveSpy).not.toHaveBeenCalled();
      saveSpy.mockRestore();
    });
  });

  describe('toggleExercise', () => {
    it('marks an unchecked exercise as done', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.toggleExercise('bench_press');
      });

      const ex = result.current.exercises.find((e) => e.exerciseId === 'bench_press');
      expect(ex?.done).toBe(true);
    });

    it('marks a checked exercise as undone', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.toggleExercise('bench_press'); });
      act(() => { result.current.toggleExercise('bench_press'); });

      const ex = result.current.exercises.find((e) => e.exerciseId === 'bench_press');
      expect(ex?.done).toBe(false);
    });

    it('only toggles the targeted exercise', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.toggleExercise('bench_press'); });

      const untouched = result.current.exercises.find((e) => e.exerciseId === 'barbell_row');
      expect(untouched?.done).toBe(false);
    });

    it('sets syncStatus to pending after a toggle', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.toggleExercise('bench_press'); });

      expect(result.current.syncStatus).toBe('pending');
    });

    it('persists the toggled state to AsyncStorage', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.toggleExercise('bench_press'); });

      await waitFor(async () => {
        const saved = await storage.getSession('day-0');
        const ex = saved?.exercises.find((e) => e.exerciseId === 'bench_press');
        expect(ex?.done).toBe(true);
      });
    });
  });

  describe('finishWorkout', () => {
    it('sets status to completed', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.finishWorkout(); });

      expect(result.current.status).toBe('completed');
    });

    it('sets syncStatus to pending', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.finishWorkout(); });

      expect(result.current.syncStatus).toBe('pending');
    });

    it('persists the completed session to AsyncStorage', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.finishWorkout(); });

      await waitFor(async () => {
        const saved = await storage.getSession('day-0');
        expect(saved?.status).toBe('completed');
        expect(saved?.finishedAt).toBeDefined();
      });
    });
  });

  describe('markMissed', () => {
    it('sets status to missed', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.markMissed(); });

      expect(result.current.status).toBe('missed');
    });

    it('sets syncStatus to pending', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.markMissed(); });

      expect(result.current.syncStatus).toBe('pending');
    });

    it('persists the missed session to AsyncStorage', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.markMissed(); });

      await waitFor(async () => {
        const saved = await storage.getSession('day-0');
        expect(saved?.status).toBe('missed');
        expect(saved?.missedAt).toBeDefined();
      });
    });
  });

  describe('offline / pending state', () => {
    it('syncStatus is local on a fresh session (no prior interactions)', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.syncStatus).toBe('local');
    });

    it('syncStatus becomes pending after toggleExercise', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.toggleExercise('bench_press'); });

      expect(result.current.syncStatus).toBe('pending');
    });

    it('syncStatus becomes pending after finishWorkout', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.finishWorkout(); });

      expect(result.current.syncStatus).toBe('pending');
    });

    it('syncStatus becomes pending after markMissed', async () => {
      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.markMissed(); });

      expect(result.current.syncStatus).toBe('pending');
    });

    it('restores a synced session without changing syncStatus', async () => {
      const saved: WorkoutSessionRecord = {
        dayId: 'day-0',
        weekDayIndex: 0,
        status: 'completed',
        syncStatus: 'synced',
        exercises: MOCK_DAY.exercises,
        startedAt: '2026-05-05T08:00:00.000Z',
        updatedAt: '2026-05-05T08:45:00.000Z',
      };
      await storage.saveSession(saved);

      const { result } = renderHook(() => useWorkoutSession(MOCK_DAY));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.syncStatus).toBe('synced');
    });
  });
});
