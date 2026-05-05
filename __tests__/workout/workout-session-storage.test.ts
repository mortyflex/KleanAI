import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSession,
  saveSession,
  clearSession,
} from '../../src/features/workout/store/workout-session-storage';
import type { WorkoutSessionRecord } from '../../src/types/workout-session.types';

const MOCK_SESSION: WorkoutSessionRecord = {
  dayId: 'day-0',
  weekDayIndex: 0,
  status: 'in_progress',
  syncStatus: 'pending',
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
  ],
  startedAt: '2026-05-05T08:00:00.000Z',
  updatedAt: '2026-05-05T08:01:00.000Z',
};

describe('workout-session-storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('getSession', () => {
    it('returns null when no session has been saved', async () => {
      const result = await getSession('day-0');
      expect(result).toBeNull();
    });

    it('returns null for an unknown dayId even when other sessions exist', async () => {
      await saveSession(MOCK_SESSION);
      const result = await getSession('day-99');
      expect(result).toBeNull();
    });
  });

  describe('saveSession / getSession round-trip', () => {
    it('persists and retrieves a session by dayId', async () => {
      await saveSession(MOCK_SESSION);
      const result = await getSession('day-0');
      expect(result).toEqual(MOCK_SESSION);
    });

    it('overwrites an existing session with the same dayId', async () => {
      await saveSession(MOCK_SESSION);
      const updated: WorkoutSessionRecord = {
        ...MOCK_SESSION,
        status: 'completed',
        syncStatus: 'pending',
        finishedAt: '2026-05-05T09:00:00.000Z',
        updatedAt: '2026-05-05T09:00:00.000Z',
      };
      await saveSession(updated);
      const result = await getSession('day-0');
      expect(result?.status).toBe('completed');
      expect(result?.finishedAt).toBe('2026-05-05T09:00:00.000Z');
    });

    it('stores sessions for different days independently', async () => {
      const sessionB: WorkoutSessionRecord = { ...MOCK_SESSION, dayId: 'day-2', weekDayIndex: 2 };
      await saveSession(MOCK_SESSION);
      await saveSession(sessionB);

      const resultA = await getSession('day-0');
      const resultB = await getSession('day-2');

      expect(resultA?.dayId).toBe('day-0');
      expect(resultB?.dayId).toBe('day-2');
    });
  });

  describe('clearSession', () => {
    it('removes the session so subsequent reads return null', async () => {
      await saveSession(MOCK_SESSION);
      await clearSession('day-0');
      const result = await getSession('day-0');
      expect(result).toBeNull();
    });

    it('does not affect other sessions when clearing one', async () => {
      const sessionB: WorkoutSessionRecord = { ...MOCK_SESSION, dayId: 'day-2', weekDayIndex: 2 };
      await saveSession(MOCK_SESSION);
      await saveSession(sessionB);

      await clearSession('day-0');

      expect(await getSession('day-0')).toBeNull();
      expect(await getSession('day-2')).not.toBeNull();
    });

    it('silently succeeds when clearing a non-existent session', async () => {
      await expect(clearSession('day-99')).resolves.toBeUndefined();
    });
  });
});
