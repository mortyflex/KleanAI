import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IngredientId } from '../../../types/ai.types';

const STORAGE_KEY = '@klean_confirmed_fridge';

export interface ConfirmedFridgeRecord {
  /** Internal ingredient ids the user has confirmed are in their fridge. */
  ingredientIds: IngredientId[];
  /**
   * Free-text labels the user confirmed even though they don't match any
   * entry in the internal catalog (e.g. "ketchup", "harissa"). These are
   * forwarded to the AI recipe generator to enrich its suggestions, but
   * never used by the deterministic meal-suggestion engine — their nutrition
   * data is unknown.
   */
  unmappedLabels: string[];
  updatedAt: string;
}

interface PersistedFridgeRecord {
  ingredientIds: IngredientId[];
  unmappedLabels?: string[];
  updatedAt: string;
}

/** Returns the persisted confirmed fridge, or null if nothing has been saved yet. */
export async function getConfirmedFridge(): Promise<ConfirmedFridgeRecord | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedFridgeRecord;
    return {
      ingredientIds: parsed.ingredientIds ?? [],
      unmappedLabels: parsed.unmappedLabels ?? [],
      updatedAt: parsed.updatedAt,
    };
  } catch {
    // A corrupt entry is treated as empty so we never crash the nutrition flow.
    return null;
  }
}

export interface SaveConfirmedFridgeInput {
  ingredientIds: IngredientId[];
  unmappedLabels?: string[];
}

export async function saveConfirmedFridge(
  input: SaveConfirmedFridgeInput | IngredientId[],
): Promise<ConfirmedFridgeRecord> {
  const ingredientIds = Array.isArray(input) ? input : input.ingredientIds;
  const unmappedLabels = Array.isArray(input) ? [] : input.unmappedLabels ?? [];
  // De-duplicate while preserving order.
  const uniqueIds = Array.from(new Set<IngredientId>(ingredientIds));
  const uniqueLabels = Array.from(new Set<string>(unmappedLabels));
  const record: ConfirmedFridgeRecord = {
    ingredientIds: uniqueIds,
    unmappedLabels: uniqueLabels,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return record;
}

export async function clearConfirmedFridge(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
