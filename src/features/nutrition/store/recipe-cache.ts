import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IngredientId } from '../../../types/ai.types';
import type {
  DietaryRestriction,
  FitnessGoal,
} from '../../../types/profile.types';
import type { HybridRecipeResult } from '../services/recipe-suggestion.service';
import type { MealType } from '../utils/meal-suggestions';
import { buildFridgeFingerprint } from '../utils/fridge-fingerprint';

/**
 * Persistent cache for hybrid recipe lists (internal + AI). The expensive
 * part of `getHybridRecipesForMealType` is the Gemini call, so we cache the
 * whole result keyed by everything that can change it. Opening the recipe
 * list re-uses the cached list with **zero** AI calls — a fresh call only
 * happens when the user explicitly regenerates, or when the cache key
 * changes (fridge / goal / restrictions / language) or the entry expires.
 *
 * The `_v1` suffix is a manual schema guard: bump it whenever
 * `HybridRecipeResult` changes shape so stale entries are dropped on read.
 */
const STORAGE_KEY = '@klean_recipe_cache_v1';

/** Entries older than this are treated as a miss — food / availability drifts. */
export const RECIPE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Hard cap on stored entries — oldest are evicted first to keep storage small. */
const MAX_ENTRIES = 16;

interface CacheEntry {
  result: HybridRecipeResult;
  cachedAt: number;
}

type CacheMap = Record<string, CacheEntry>;

export interface RecipeCacheKeyInput {
  mealType: MealType;
  ingredientIds: readonly IngredientId[];
  unmappedLabels?: readonly string[];
  goal: FitnessGoal;
  restrictions?: readonly DietaryRestriction[];
  language?: string;
}

/**
 * Builds the cache key. Two requests that would produce the same recipe list
 * map to the same key; any change that could change the list — meal type,
 * fridge contents, goal, dietary restrictions, output language — produces a
 * different key.
 */
export function buildRecipeCacheKey(input: RecipeCacheKeyInput): string {
  const fridge = buildFridgeFingerprint(
    input.ingredientIds,
    input.unmappedLabels ?? [],
  );
  const restrictions = [...(input.restrictions ?? [])].sort().join(',');
  const language = (input.language ?? 'en').toLowerCase().slice(0, 2);
  return [
    input.mealType,
    input.goal,
    `r:${restrictions}`,
    `l:${language}`,
    fridge,
  ].join('::');
}

async function readCache(): Promise<CacheMap> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as CacheMap;
  } catch {
    // A corrupt cache must never break the recipe flow — treat it as empty.
    return {};
  }
}

async function writeCache(map: CacheMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/**
 * Returns the cached recipe result for `key`, or `null` on a miss. Expired
 * entries count as a miss and are pruned from storage as a side effect.
 */
export async function getCachedRecipeResult(
  key: string,
): Promise<HybridRecipeResult | null> {
  const map = await readCache();
  const entry = map[key];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > RECIPE_CACHE_TTL_MS) {
    delete map[key];
    await writeCache(map);
    return null;
  }
  return entry.result;
}

/**
 * Stores `result` under `key`. Enforces {@link MAX_ENTRIES} by evicting the
 * oldest entries first.
 */
export async function setCachedRecipeResult(
  key: string,
  result: HybridRecipeResult,
): Promise<void> {
  const map = await readCache();
  map[key] = { result, cachedAt: Date.now() };

  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) {
    const sortedByAge = keys.sort(
      (a, b) => map[a].cachedAt - map[b].cachedAt,
    );
    for (const stale of sortedByAge.slice(0, keys.length - MAX_ENTRIES)) {
      delete map[stale];
    }
  }
  await writeCache(map);
}

/** Wipes the whole recipe cache — used by tests and manual cache resets. */
export async function clearRecipeCache(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
