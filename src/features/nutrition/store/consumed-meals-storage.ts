import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MealType } from '../utils/meal-suggestions';

/**
 * Per-meal consumption record. Local-only, indexed by meal id so we can
 * un-consume without recomputing deltas. The aggregated totals
 * (`DailyNutritionRecord`) remain the source of truth for the sync layer —
 * this map is purely a UI/UX seam to drive checked/unchecked state and to
 * let the user undo a tap.
 */
export interface ConsumedMealEntry {
  mealId: string;
  type: MealType;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** ISO timestamp when the user tapped "I ate this". */
  consumedAt: string;
}

export type ConsumedMealMap = Record<string, ConsumedMealEntry>;

const dayKey = (logDate: string) => `@klean_consumed_meals_${logDate}`;

export async function getConsumedMeals(
  logDate: string,
): Promise<ConsumedMealMap> {
  const raw = await AsyncStorage.getItem(dayKey(logDate));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as ConsumedMealMap;
  } catch {
    return {};
  }
}

export async function saveConsumedMeals(
  logDate: string,
  map: ConsumedMealMap,
): Promise<void> {
  await AsyncStorage.setItem(dayKey(logDate), JSON.stringify(map));
}

export async function clearConsumedMeals(logDate: string): Promise<void> {
  await AsyncStorage.removeItem(dayKey(logDate));
}

export interface ConsumedTotals {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const ZERO_TOTALS: ConsumedTotals = {
  kcal: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
};

export function totalsFromConsumed(map: ConsumedMealMap): ConsumedTotals {
  let kcal = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  for (const entry of Object.values(map)) {
    kcal += entry.kcal;
    proteinG += entry.proteinG;
    carbsG += entry.carbsG;
    fatG += entry.fatG;
  }
  return { kcal, proteinG, carbsG, fatG };
}
