import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RECIPE_CACHE_TTL_MS,
  buildRecipeCacheKey,
  clearRecipeCache,
  getCachedRecipeResult,
  setCachedRecipeResult,
} from '../../src/features/nutrition/store/recipe-cache';
import type { HybridRecipeResult } from '../../src/features/nutrition/services/recipe-suggestion.service';
import type { IngredientId } from '../../src/types/ai.types';

const result = (aiCount = 1): HybridRecipeResult => ({
  matches: [],
  internalCount: 2,
  aiCount,
});

describe('buildRecipeCacheKey', () => {
  it('is identical for requests that would produce the same list', () => {
    const a = buildRecipeCacheKey({
      mealType: 'lunch',
      ingredientIds: ['chicken_breast', 'broccoli'] as IngredientId[],
      unmappedLabels: ['Ketchup'],
      goal: 'recomposition',
      restrictions: ['halal'],
      language: 'fr',
    });
    const b = buildRecipeCacheKey({
      mealType: 'lunch',
      ingredientIds: ['broccoli', 'chicken_breast'] as IngredientId[],
      unmappedLabels: ['Ketchup'],
      goal: 'recomposition',
      restrictions: ['halal'],
      language: 'fr-FR',
    });
    expect(a).toBe(b);
  });

  it('differs when meal type, fridge, goal, restrictions or language change', () => {
    const base = {
      mealType: 'lunch' as const,
      ingredientIds: ['eggs'] as IngredientId[],
      unmappedLabels: [],
      goal: 'maintain' as const,
      restrictions: [],
      language: 'en',
    };
    const baseKey = buildRecipeCacheKey(base);
    expect(buildRecipeCacheKey({ ...base, mealType: 'dinner' })).not.toBe(baseKey);
    expect(
      buildRecipeCacheKey({ ...base, ingredientIds: ['eggs', 'spinach'] as IngredientId[] }),
    ).not.toBe(baseKey);
    expect(buildRecipeCacheKey({ ...base, goal: 'gain_muscle' })).not.toBe(baseKey);
    expect(
      buildRecipeCacheKey({ ...base, restrictions: ['vegan'] }),
    ).not.toBe(baseKey);
    expect(buildRecipeCacheKey({ ...base, language: 'fr' })).not.toBe(baseKey);
  });
});

describe('recipe-cache storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('returns null on a miss and the stored result on a hit', async () => {
    expect(await getCachedRecipeResult('missing')).toBeNull();
    await setCachedRecipeResult('key-1', result(2));
    const hit = await getCachedRecipeResult('key-1');
    expect(hit).not.toBeNull();
    expect(hit?.aiCount).toBe(2);
  });

  it('treats entries older than the TTL as a miss and prunes them', async () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000_000);
    await setCachedRecipeResult('key-ttl', result());

    // Still fresh just before the TTL boundary.
    nowSpy.mockReturnValue(1_000_000 + RECIPE_CACHE_TTL_MS - 1);
    expect(await getCachedRecipeResult('key-ttl')).not.toBeNull();

    // Expired once past the TTL.
    nowSpy.mockReturnValue(1_000_000 + RECIPE_CACHE_TTL_MS + 1);
    expect(await getCachedRecipeResult('key-ttl')).toBeNull();
    // And the expired entry is pruned, not just hidden.
    nowSpy.mockReturnValue(1_000_000 + RECIPE_CACHE_TTL_MS + 1);
    const raw = await AsyncStorage.getItem('@klean_recipe_cache_v1');
    expect(raw ? JSON.parse(raw) : {}).toEqual({});
  });

  it('evicts the oldest entries once the cap is exceeded', async () => {
    const nowSpy = jest.spyOn(Date, 'now');
    // 18 entries, each one millisecond newer than the last (cap is 16).
    for (let i = 0; i < 18; i += 1) {
      nowSpy.mockReturnValue(2_000_000 + i);
      await setCachedRecipeResult(`key-${i}`, result(i));
    }
    nowSpy.mockReturnValue(2_000_100);
    // The two oldest were evicted.
    expect(await getCachedRecipeResult('key-0')).toBeNull();
    expect(await getCachedRecipeResult('key-1')).toBeNull();
    // Recent entries survive.
    expect(await getCachedRecipeResult('key-2')).not.toBeNull();
    expect(await getCachedRecipeResult('key-17')).not.toBeNull();
  });

  it('clearRecipeCache wipes everything', async () => {
    await setCachedRecipeResult('key-a', result());
    await clearRecipeCache();
    expect(await getCachedRecipeResult('key-a')).toBeNull();
  });
});
