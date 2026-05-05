import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutSessionRecord } from '../../../types/workout-session.types';

const sessionKey = (dayId: string) => `@klean_workout_session_${dayId}`;

export async function getSession(dayId: string): Promise<WorkoutSessionRecord | null> {
  const raw = await AsyncStorage.getItem(sessionKey(dayId));
  if (!raw) return null;
  return JSON.parse(raw) as WorkoutSessionRecord;
}

export async function saveSession(session: WorkoutSessionRecord): Promise<void> {
  await AsyncStorage.setItem(sessionKey(session.dayId), JSON.stringify(session));
}

export async function clearSession(dayId: string): Promise<void> {
  await AsyncStorage.removeItem(sessionKey(dayId));
}
