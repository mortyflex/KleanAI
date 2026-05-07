import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DailyNutritionRecord } from '../types';

const dayKey = (logDate: string) => `@klean_nutrition_day_${logDate}`;

export async function getDay(logDate: string): Promise<DailyNutritionRecord | null> {
  const raw = await AsyncStorage.getItem(dayKey(logDate));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DailyNutritionRecord;
  } catch {
    return null;
  }
}

export async function saveDay(record: DailyNutritionRecord): Promise<void> {
  await AsyncStorage.setItem(dayKey(record.logDate), JSON.stringify(record));
}

export async function clearDay(logDate: string): Promise<void> {
  await AsyncStorage.removeItem(dayKey(logDate));
}
