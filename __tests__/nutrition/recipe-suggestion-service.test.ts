import {
  filterAIRecipes,
  generateAIRecipeSuggestions,
  getHybridRecipesForMealType,
} from '../../src/features/nutrition/services/recipe-suggestion.service';
import { clearAILogs, getAILogs } from '../../src/lib/ai/logs';
import type { AIProvider, AIRecipeRequest } from '../../src/types/ai.types';
import type { AIGeneratedRecipe } from '../../src/types/recipe.types';

function makeProvider(
  payload: () => Promise<unknown>,
): AIProvider {
  return {
    id: 'mock',
    modelId: 'fake-recipe-model',
    analyzeGymImages: async () =>
      ({ schemaVersion: '1' as const, detected: [] } as never),
    analyzeFridgeImages: async () =>
      ({ schemaVersion: '1' as const, detected: [] } as never),
    generateRecipeSuggestions: async (req: AIRecipeRequest) => {
      const out = await payload();
      // Cast — tests deliberately return invalid shapes to exercise schema errors.
      return out as never;
    },
  };
}

const validAIPayload = (override: Partial<{
  title: string;
  ingredientLabels: string[];
  steps: string[];
}> = {}) => ({
  schemaVersion: '1',
  recipes: [
    {
      title: override.title ?? 'AI bowl',
      description: 'AI-generated balanced bowl built around your fridge.',
      ingredientLabels: override.ingredientLabels ?? ['Tofu', 'Quinoa', 'Spinach'],
      steps: override.steps ?? ['Cook quinoa', 'Pan-fry tofu', 'Serve'],
      prepTimeMinutes: 15,
      difficulty: 'easy',
      estimatedCalories: 480,
      estimatedProteinG: 28,
      estimatedCarbsG: 50,
      estimatedFatG: 14,
      tags: ['high_protein', 'quick'],
    },
  ],
});

describe('generateAIRecipeSuggestions', () => {
  beforeEach(() => clearAILogs());

  it('returns not_supported when the provider lacks generateRecipeSuggestions', async () => {
    const provider: AIProvider = {
      id: 'mock',
      modelId: 'no-recipes',
      analyzeGymImages: async () =>
        ({ schemaVersion: '1' as const, detected: [] } as never),
      analyzeFridgeImages: async () =>
        ({ schemaVersion: '1' as const, detected: [] } as never),
    };

    const result = await generateAIRecipeSuggestions({
      provider,
      mealType: 'lunch',
      ingredientIds: ['eggs'],
      ingredientLabels: ['Eggs'],
      unmappedLabels: [],
      goal: 'maintain',
      restrictions: [],
      desiredCount: 2,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not_supported');
  });

  it('returns ok with parsed recipes for a valid AI response', async () => {
    const provider = makeProvider(async () => validAIPayload());
    const result = await generateAIRecipeSuggestions({
      provider,
      mealType: 'lunch',
      ingredientIds: ['tofu', 'quinoa'],
      ingredientLabels: ['Tofu', 'Quinoa'],
      unmappedLabels: [],
      goal: 'maintain',
      restrictions: [],
      desiredCount: 2,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.recipes).toHaveLength(1);
      expect(result.recipes[0].source).toBe('ai');
      expect(result.recipes[0].title).toBe('AI bowl');
    }
  });

  it('forwards the localized ingredient labels to the provider', async () => {
    const spy = jest.fn(async () => validAIPayload());
    const provider = makeProvider(spy);
    await generateAIRecipeSuggestions({
      provider,
      mealType: 'lunch',
      ingredientIds: ['greek_yogurt', 'tofu'],
      ingredientLabels: ['Yaourt grec', 'Tofu'],
      unmappedLabels: ['Ketchup'],
      goal: 'maintain',
      restrictions: [],
      desiredCount: 1,
      language: 'fr',
    });
    expect(spy).toHaveBeenCalled();
  });

  it('returns invalid_schema for malformed AI responses', async () => {
    const provider = makeProvider(async () => ({
      schemaVersion: '1',
      recipes: [{ title: 'broken' }],
    }));
    const result = await generateAIRecipeSuggestions({
      provider,
      mealType: 'lunch',
      ingredientIds: [],
      ingredientLabels: [],
      unmappedLabels: [],
      goal: 'maintain',
      restrictions: [],
      desiredCount: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_schema');
  });

  it('returns provider_error when the provider throws', async () => {
    const provider = makeProvider(async () => {
      throw new Error('network down');
    });
    const result = await generateAIRecipeSuggestions({
      provider,
      mealType: 'lunch',
      ingredientIds: [],
      ingredientLabels: [],
      unmappedLabels: [],
      goal: 'maintain',
      restrictions: [],
      desiredCount: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('provider_error');
      expect(result.details).toContain('network down');
    }
  });

  it('records an AI log entry on success', async () => {
    const provider = makeProvider(async () => validAIPayload());
    await generateAIRecipeSuggestions({
      provider,
      mealType: 'lunch',
      ingredientIds: ['tofu'],
      ingredientLabels: ['Tofu'],
      unmappedLabels: [],
      goal: 'maintain',
      restrictions: [],
      desiredCount: 1,
    });
    const logs = getAILogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      feature: 'recipe_generation',
      succeeded: true,
    });
  });
});

describe('filterAIRecipes — restriction post-filter', () => {
  const beefRecipe: AIGeneratedRecipe = {
    id: 'ai:lunch:0:test',
    source: 'ai',
    mealType: 'lunch',
    title: 'Beef bowl',
    description: 'Quick beef bowl with rice.',
    ingredientLabels: ['Beef strips', 'Brown rice'],
    steps: ['Sear the beef', 'Plate over rice'],
    prepTimeMinutes: 15,
    difficulty: 'easy',
    estimatedCalories: 600,
    estimatedProteinG: 38,
    estimatedCarbsG: 50,
    estimatedFatG: 22,
    tags: ['high_protein'],
  };

  const veganRecipe: AIGeneratedRecipe = {
    id: 'ai:lunch:1:test',
    source: 'ai',
    mealType: 'lunch',
    title: 'Tofu bowl',
    description: 'Plant-based bowl with tofu and grains.',
    ingredientLabels: ['Tofu', 'Quinoa', 'Spinach'],
    steps: ['Pan-fry tofu', 'Plate over quinoa'],
    prepTimeMinutes: 15,
    difficulty: 'easy',
    estimatedCalories: 480,
    estimatedProteinG: 26,
    estimatedCarbsG: 56,
    estimatedFatG: 14,
    tags: ['high_protein', 'vegetarian'],
  };

  it('drops recipes that mention forbidden keywords for vegan users', () => {
    const result = filterAIRecipes([beefRecipe, veganRecipe], ['vegan']);
    expect(result.map((r) => r.title)).toEqual(['Tofu bowl']);
  });

  it('keeps every recipe when the user has no restrictions', () => {
    const result = filterAIRecipes([beefRecipe, veganRecipe], []);
    expect(result).toHaveLength(2);
  });
});

describe('getHybridRecipesForMealType — fallback wiring', () => {
  it('returns internal-only matches when there is no AI provider available', async () => {
    const provider: AIProvider = {
      id: 'mock',
      modelId: 'no-recipes',
      analyzeGymImages: async () =>
        ({ schemaVersion: '1' as const, detected: [] } as never),
      analyzeFridgeImages: async () =>
        ({ schemaVersion: '1' as const, detected: [] } as never),
    };
    const result = await getHybridRecipesForMealType({
      provider,
      mealType: 'lunch',
      ingredientIds: ['chicken_breast', 'brown_rice'],
      goal: 'maintain',
    });
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.aiCount).toBe(0);
    expect(result.matches.every((m) => m.recipe.source === 'internal')).toBe(true);
  });

  it('appends AI recipes when internal matches do not fill the limit', async () => {
    const provider = makeProvider(async () => validAIPayload());
    // Restrict so heavily that internal matches drop near zero, forcing AI fill.
    const result = await getHybridRecipesForMealType({
      provider,
      mealType: 'lunch',
      ingredientIds: [],
      goal: 'maintain',
      restrictions: ['vegan', 'gluten_free', 'lactose_free', 'halal', 'kosher'],
      limit: 3,
    });
    // We always cap at 3 total.
    expect(result.matches.length).toBeLessThanOrEqual(3);
    if (result.aiCount > 0) {
      const ai = result.matches.find((m) => m.recipe.source === 'ai');
      expect(ai?.matchReasonKeys).toContain(
        'nutrition.recipes.matchReasons.aiSuggested',
      );
    }
  });

  it('skips the AI call entirely when skipAI is true', async () => {
    const callSpy = jest.fn();
    const provider: AIProvider = {
      id: 'mock',
      modelId: 'spy',
      analyzeGymImages: async () =>
        ({ schemaVersion: '1' as const, detected: [] } as never),
      analyzeFridgeImages: async () =>
        ({ schemaVersion: '1' as const, detected: [] } as never),
      generateRecipeSuggestions: async () => {
        callSpy();
        return validAIPayload() as never;
      },
    };
    await getHybridRecipesForMealType({
      provider,
      mealType: 'lunch',
      ingredientIds: ['chicken_breast', 'brown_rice'],
      goal: 'maintain',
      skipAI: true,
    });
    expect(callSpy).not.toHaveBeenCalled();
  });

  it('reserves a slot for AI even when internal matches could fill the limit, if the user has unmapped fridge items', async () => {
    const callSpy = jest.fn(async () => validAIPayload());
    const provider: AIProvider = {
      id: 'mock',
      modelId: 'spy',
      analyzeGymImages: async () =>
        ({ schemaVersion: '1' as const, detected: [] } as never),
      analyzeFridgeImages: async () =>
        ({ schemaVersion: '1' as const, detected: [] } as never),
      generateRecipeSuggestions: async () => callSpy() as never,
    };
    const result = await getHybridRecipesForMealType({
      provider,
      mealType: 'lunch',
      // Plenty of mapped ingredients — internal would normally fill 3 slots.
      ingredientIds: ['chicken_breast', 'brown_rice', 'broccoli', 'salmon'],
      // …but the user also confirmed an unmapped item like ketchup. The
      // service must still call AI to surface a recipe that uses it.
      unmappedLabels: ['Ketchup'],
      goal: 'maintain',
      limit: 3,
    });
    expect(callSpy).toHaveBeenCalled();
    expect(result.aiCount).toBe(1);
    expect(result.matches).toHaveLength(3);
    expect(
      result.matches.find((m) => m.recipe.source === 'ai'),
    ).toBeDefined();
  });

  it('drops AI recipes that violate user restrictions even if the model returned them', async () => {
    const provider = makeProvider(async () =>
      validAIPayload({
        title: 'Beef tartare',
        ingredientLabels: ['Beef strips', 'Olive oil'],
        steps: ['Slice the beef', 'Plate'],
      }),
    );
    const result = await getHybridRecipesForMealType({
      provider,
      mealType: 'lunch',
      ingredientIds: [],
      goal: 'maintain',
      restrictions: ['vegan', 'gluten_free', 'lactose_free', 'halal', 'kosher'],
      limit: 3,
    });
    // AI recipe must have been filtered out — no AI match should remain.
    expect(result.matches.find((m) => m.recipe.source === 'ai')).toBeUndefined();
  });
});
