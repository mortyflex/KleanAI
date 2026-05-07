import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IngredientId } from '../../../types/ai.types';

const STORAGE_KEY = '@klean_confirmed_fridge';

export interface ConfirmedFridgeRecord {
  /** Internal ingredient ids the user has confirmed are in their fridge. */
  ingredientIds: IngredientId[];
  updatedAt: string;
}

/** Returns the persisted confirmed fridge, or null if nothing has been saved yet. */
export async function getConfirmedFridge(): Promise<ConfirmedFridgeRecord | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConfirmedFridgeRecord;
  } catch {
    // A corrupt entry is treated as empty so we never crash the nutrition flow.
    return null;
  }
}

export async function saveConfirmedFridge(
  ingredientIds: IngredientId[],
): Promise<ConfirmedFridgeRecord> {
  // De-duplicate while preserving order.
  const unique = Array.from(new Set<IngredientId>(ingredientIds));
  const record: ConfirmedFridgeRecord = {
    ingredientIds: unique,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return record;
}

export async function clearConfirmedFridge(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
