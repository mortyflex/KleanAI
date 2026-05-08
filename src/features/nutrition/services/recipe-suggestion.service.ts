import type {
  AIProvider,
  AIRecipeRequest,
  AIRecipeRaw,
  IngredientCategory,
  IngredientId,
} from '../../../types/ai.types';
import type {
  DietaryRestriction,
  FitnessGoal,
} from '../../../types/profile.types';
import type {
  AIGeneratedRecipe,
  Recipe,
  RecipeMatch,
  RecipeTag,
} from '../../../types/recipe.types';
import { getAIProvider } from '../../../lib/ai';
import { recordAILog } from '../../../lib/ai/logs';
import {
  MAX_RECIPES_PER_MEAL_TYPE,
  filterRecipesByRestrictions,
  getRecipesForMealType,
} from '../utils/recipe-engine';
import { parseAIRecipesResponse } from '../utils/parse-ai-recipes';
import type { MealType } from '../utils/meal-suggestions';

export const RECIPE_GENERATION_PROMPT_VERSION = 'recipe-suggestions/v1';

const KNOWN_RECIPE_TAGS: ReadonlySet<RecipeTag> = new Set([
  'high_protein',
  'quick',
  'low_calorie',
  'mass_gain',
  'recomposition',
  'vegetarian',
  'budget',
  'no_cook',
]);

const RESTRICTION_FORBIDDEN_KEYWORDS: Record<DietaryRestriction, string[]> = {
  vegetarian: ['chicken', 'beef', 'turkey', 'pork', 'bacon', 'ham', 'salmon', 'tuna', 'fish', 'shrimp', 'poulet', 'boeuf', 'bœuf', 'dinde', 'porc', 'jambon', 'saumon', 'thon', 'poisson', 'crevette'],
  vegan: ['chicken', 'beef', 'turkey', 'pork', 'bacon', 'ham', 'salmon', 'tuna', 'fish', 'shrimp', 'egg', 'cheese', 'yogurt', 'milk', 'butter', 'honey', 'poulet', 'boeuf', 'bœuf', 'dinde', 'porc', 'jambon', 'saumon', 'thon', 'poisson', 'crevette', 'œuf', 'oeuf', 'fromage', 'yaourt', 'lait', 'beurre', 'miel'],
  gluten_free: ['wheat', 'pasta', 'bread', 'flour', 'oat', 'oats', 'barley', 'rye', 'pâte', 'pates', 'pain', 'farine', 'avoine', 'orge', 'seigle'],
  lactose_free: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'lait', 'fromage', 'yaourt', 'beurre', 'crème'],
  halal: ['pork', 'bacon', 'ham', 'alcohol', 'wine', 'beer', 'porc', 'jambon', 'alcool', 'vin', 'bière'],
  kosher: ['pork', 'bacon', 'ham', 'shellfish', 'shrimp', 'porc', 'jambon', 'crustacé', 'crevette'],
};

export interface AIRecipesFailure {
  ok: false;
  reason:
    | 'not_supported'
    | 'invalid_json'
    | 'invalid_schema'
    | 'provider_error'
    | 'all_filtered_out';
  details?: string;
}

export interface AIRecipesSuccess {
  ok: true;
  recipes: AIGeneratedRecipe[];
  rawCount: number;
  filteredOutCount: number;
}

export type AIRecipesResult = AIRecipesSuccess | AIRecipesFailure;

export interface GenerateAIRecipesOptions {
  provider?: AIProvider;
  mealType: MealType;
  ingredientIds: IngredientId[];
  unmappedLabels: string[];
  goal: FitnessGoal;
  restrictions: DietaryRestriction[];
  desiredCount: number;
  targetKcal?: number;
  targetProteinG?: number;
  language?: string;
}

/**
 * Asks the active AI provider for complementary recipes, validates the
 * response with Zod, and applies the deterministic restriction filter.
 *
 * **Safety note:** the AI is not the source of truth for restrictions.
 * Anything that mentions a forbidden keyword is filtered out post-hoc.
 *
 * Never throws — returns a discriminated result so callers can render a
 * graceful fallback (internal-only recipes) when the AI is unavailable.
 */
export async function generateAIRecipeSuggestions(
  opts: GenerateAIRecipesOptions,
): Promise<AIRecipesResult> {
  const provider = opts.provider ?? getAIProvider();
  const startedAt = Date.now();

  if (!provider.generateRecipeSuggestions) {
    recordAILog({
      feature: 'recipe_generation',
      providerId: provider.id,
      modelId: provider.modelId,
      promptVersion: RECIPE_GENERATION_PROMPT_VERSION,
      latencyMs: 0,
      imageCount: 0,
      outputSummary: 'not_supported',
      succeeded: false,
      errorMessage: 'provider has no generateRecipeSuggestions',
    });
    return { ok: false, reason: 'not_supported' };
  }

  const request: AIRecipeRequest = {
    promptVersion: RECIPE_GENERATION_PROMPT_VERSION,
    mappedIngredientIds: opts.ingredientIds,
    unmappedIngredientLabels: opts.unmappedLabels,
    goal: opts.goal,
    restrictions: opts.restrictions,
    mealType: opts.mealType,
    desiredCount: opts.desiredCount,
    targetKcal: opts.targetKcal,
    targetProteinG: opts.targetProteinG,
    language: opts.language,
  };

  let raw: unknown;
  try {
    raw = await provider.generateRecipeSuggestions(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown provider error';
    recordAILog({
      feature: 'recipe_generation',
      providerId: provider.id,
      modelId: provider.modelId,
      promptVersion: RECIPE_GENERATION_PROMPT_VERSION,
      latencyMs: Date.now() - startedAt,
      imageCount: 0,
      outputSummary: 'provider_error',
      succeeded: false,
      errorMessage: message,
    });
    return { ok: false, reason: 'provider_error', details: message };
  }

  const parsed = parseAIRecipesResponse(raw);
  if (!parsed.ok) {
    recordAILog({
      feature: 'recipe_generation',
      providerId: provider.id,
      modelId: provider.modelId,
      promptVersion: RECIPE_GENERATION_PROMPT_VERSION,
      latencyMs: Date.now() - startedAt,
      imageCount: 0,
      outputSummary: parsed.reason,
      succeeded: false,
      errorMessage: parsed.details,
    });
    return { ok: false, reason: parsed.reason, details: parsed.details };
  }

  const allRecipes = parsed.data.recipes.map((r, i) =>
    aiRawToRecipe(r, opts.mealType, i),
  );
  const safe = filterAIRecipes(allRecipes, opts.restrictions);

  recordAILog({
    feature: 'recipe_generation',
    providerId: provider.id,
    modelId: provider.modelId,
    promptVersion: RECIPE_GENERATION_PROMPT_VERSION,
    latencyMs: Date.now() - startedAt,
    imageCount: 0,
    outputSummary: `parsed=${allRecipes.length} kept=${safe.length}`,
    succeeded: true,
  });

  if (safe.length === 0 && allRecipes.length > 0) {
    return {
      ok: false,
      reason: 'all_filtered_out',
      details: 'every AI recipe violated a dietary restriction',
    };
  }

  return {
    ok: true,
    recipes: safe.slice(0, opts.desiredCount),
    rawCount: allRecipes.length,
    filteredOutCount: allRecipes.length - safe.length,
  };
}

/** Coerces a raw AI recipe to the typed `AIGeneratedRecipe` shape. */
function aiRawToRecipe(
  raw: AIRecipeRaw,
  mealType: MealType,
  index: number,
): AIGeneratedRecipe {
  const tags: RecipeTag[] = (raw.tags ?? []).filter((t): t is RecipeTag =>
    KNOWN_RECIPE_TAGS.has(t as RecipeTag),
  );
  return {
    id: `ai:${mealType}:${index}:${Date.now().toString(36)}`,
    source: 'ai',
    mealType,
    title: raw.title,
    description: raw.description,
    ingredientLabels: raw.ingredientLabels,
    prepTimeMinutes: raw.prepTimeMinutes,
    difficulty: raw.difficulty,
    estimatedCalories: raw.estimatedCalories,
    estimatedProteinG: raw.estimatedProteinG,
    estimatedCarbsG: raw.estimatedCarbsG,
    estimatedFatG: raw.estimatedFatG,
    steps: raw.steps,
    tags,
  };
}

/** Defensive post-AI filter — drops recipes that mention forbidden keywords. */
export function filterAIRecipes(
  recipes: AIGeneratedRecipe[],
  restrictions: DietaryRestriction[],
): AIGeneratedRecipe[] {
  if (!restrictions || restrictions.length === 0) return recipes;
  return recipes.filter((recipe) => {
    const text = [
      recipe.title,
      recipe.description,
      ...recipe.ingredientLabels,
      ...recipe.steps,
    ]
      .join(' ')
      .toLowerCase();

    for (const restriction of restrictions) {
      const forbidden = RESTRICTION_FORBIDDEN_KEYWORDS[restriction] ?? [];
      if (forbidden.some((keyword) => text.includes(keyword))) {
        return false;
      }
    }
    return true;
  });
}

export interface HybridRecipeResult {
  /** Internal matches first, AI matches appended at the end. */
  matches: RecipeMatch[];
  internalCount: number;
  aiCount: number;
  /** Failure reason from the AI side, if any. UI uses this for telemetry. */
  aiFailure?: AIRecipesFailure;
}

export interface GetHybridRecipesOptions {
  provider?: AIProvider;
  mealType: MealType;
  ingredientIds: IngredientId[];
  unmappedLabels?: string[];
  unmappedCategories?: IngredientCategory[];
  goal: FitnessGoal;
  restrictions?: DietaryRestriction[];
  /** Cap — defaults to {@link MAX_RECIPES_PER_MEAL_TYPE} (3). */
  limit?: number;
  /** Skip AI completely — useful for tests / when offline. */
  skipAI?: boolean;
  language?: string;
}

/**
 * Returns up to `limit` recipes for a meal type, blending the internal
 * catalog with AI-generated complementary recipes.
 *
 * Algorithm:
 *   1. Rank internal recipes deterministically.
 *   2. If the user has confirmed *unmapped* fridge ingredients (e.g.
 *      ketchup, harissa), reserve at least one slot for an AI recipe so
 *      they get suggestions that actually use those items — even when the
 *      internal catalog could fill all 3 slots on its own.
 *   3. Otherwise ask the AI only for the missing slots, validate,
 *      restriction-filter, and append.
 *   4. AI failures fall through gracefully — internal recipes are always
 *      shown first and the UI surfaces the failure for telemetry.
 */
export async function getHybridRecipesForMealType(
  opts: GetHybridRecipesOptions,
): Promise<HybridRecipeResult> {
  const limit = opts.limit ?? MAX_RECIPES_PER_MEAL_TYPE;
  const restrictions = opts.restrictions ?? [];
  const unmappedLabels = opts.unmappedLabels ?? [];
  const hasUnmapped = unmappedLabels.length > 0;

  // When the user has confirmed unmapped ingredients, we cap the internal
  // contribution one short of the limit so the AI has room to surface a
  // recipe that *uses* those ingredients. Without this carve-out, three
  // strong internal matches would lock the AI out and the user would never
  // see suggestions involving e.g. their ketchup or harissa.
  const internalLimit = hasUnmapped && !opts.skipAI ? limit - 1 : limit;

  const internal = getRecipesForMealType(opts.mealType, {
    ingredientIds: opts.ingredientIds,
    unmappedCategories: opts.unmappedCategories,
    restrictions,
    goal: opts.goal,
    limit: internalLimit,
  });

  const aiSlotsWanted = limit - internal.length;
  if (aiSlotsWanted <= 0 || opts.skipAI) {
    return {
      matches: internal,
      internalCount: internal.length,
      aiCount: 0,
    };
  }

  const aiResult = await generateAIRecipeSuggestions({
    provider: opts.provider,
    mealType: opts.mealType,
    ingredientIds: opts.ingredientIds,
    unmappedLabels,
    goal: opts.goal,
    restrictions,
    desiredCount: aiSlotsWanted,
    language: opts.language,
  });

  if (!aiResult.ok) {
    return {
      matches: internal,
      internalCount: internal.length,
      aiCount: 0,
      aiFailure: aiResult,
    };
  }

  const aiMatches: RecipeMatch[] = aiResult.recipes.slice(0, aiSlotsWanted).map(
    (recipe): RecipeMatch => ({
      recipe,
      score: 0,
      matchedIngredientIds: [],
      missingIngredientIds: [],
      optionalIngredientIds: [],
      matchReasonKeys: ['recipes.matchReasons.aiSuggested'],
      goodFridgeMatch: false,
    }),
  );

  return {
    matches: [...internal, ...aiMatches],
    internalCount: internal.length,
    aiCount: aiMatches.length,
  };
}

/**
 * Re-export — useful for tests that want to verify the deterministic filter
 * is applied on the resulting recipe list (not just on the AI response).
 */
export function filterByRestrictions<T extends Recipe>(
  recipes: T[],
  restrictions: DietaryRestriction[],
): T[] {
  return filterRecipesByRestrictions(recipes, restrictions);
}
