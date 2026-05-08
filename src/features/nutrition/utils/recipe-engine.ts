import type {
  IngredientCategory,
  IngredientId,
} from '../../../types/ai.types';
import type {
  DietaryRestriction,
  FitnessGoal,
} from '../../../types/profile.types';
import type {
  AIGeneratedRecipe,
  InternalRecipe,
  Recipe,
  RecipeMatch,
} from '../../../types/recipe.types';
import { RECIPE_CATALOG } from '../data/recipe-catalog';
import type { MealType } from './meal-suggestions';

const ALL_RESTRICTIONS: DietaryRestriction[] = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'lactose_free',
  'halal',
  'kosher',
];

/** Maximum number of recipes the UI ever shows for a single mealType. */
export const MAX_RECIPES_PER_MEAL_TYPE = 3;

/**
 * Threshold above which a recipe is considered a "good fridge match" for
 * the badge displayed on its card. Computed as a fraction of the recipe's
 * required ingredient count so small recipes don't always tag.
 */
const GOOD_FRIDGE_MATCH_RATIO = 0.6;

/** A recipe that violates one of the listed restrictions is hard-excluded. */
export function filterRecipesByRestrictions<T extends Recipe>(
  recipes: T[],
  restrictions: DietaryRestriction[],
): T[] {
  if (!restrictions || restrictions.length === 0) return recipes;
  return recipes.filter((recipe) => {
    if (recipe.source !== 'internal') return true;
    return restrictions.every((r) =>
      recipe.dietaryRestrictionsCompatibility.includes(r),
    );
  });
}

/** Returns true when the recipe is restriction-agnostic (compatible with everything). */
export function isRestrictionAgnostic(recipe: InternalRecipe): boolean {
  return ALL_RESTRICTIONS.every((r) =>
    recipe.dietaryRestrictionsCompatibility.includes(r),
  );
}

interface ScoreContext {
  available: ReadonlySet<IngredientId>;
  unmappedCategories: ReadonlySet<IngredientCategory>;
  goal?: FitnessGoal;
  /** When provided, recipes much closer to this kcal target score higher. */
  targetKcal?: number;
}

/**
 * Score a single recipe against the user's confirmed fridge + goal context.
 * The score is a weighted sum of:
 *   - ingredient overlap (the dominant signal),
 *   - optional ingredient overlap (small bonus),
 *   - allowed unmapped categories (very small bonus),
 *   - missing-ingredient penalty (kept gentle so partial matches still win),
 *   - goal alignment (compatibleGoals hits, high_protein for muscle goals,
 *     low_calorie for weight loss, mass_gain for muscle gain),
 *   - simplicity bonus (no_cook + quick recipes get a small nudge).
 */
export function scoreRecipeAgainstFridge(
  recipe: InternalRecipe,
  ctx: ScoreContext,
): RecipeMatch {
  const required = recipe.ingredientIds ?? [];
  const optional = recipe.optionalIngredientIds ?? [];

  const matchedRequired = required.filter((id) => ctx.available.has(id));
  const matchedOptional = optional.filter((id) => ctx.available.has(id));
  const missing = required.filter((id) => !ctx.available.has(id));

  let score = 0;
  // Required matches dominate the signal — 4 pts each.
  score += matchedRequired.length * 4;
  // Optional matches are bonuses — 1.5 pts each.
  score += matchedOptional.length * 1.5;
  // Missing ingredients incur a gentle penalty — 1 pt each — capped so
  // recipes with many ingredients can still surface when the user has most.
  score -= Math.min(missing.length, 3) * 1;

  // Allowed unmapped categories: tiny nudge so a recipe stays attractive
  // when the user has confirmed a related condiment / spice.
  const allowedUnmapped = recipe.allowedUnmappedIngredientCategories ?? [];
  const unmappedHits = allowedUnmapped.filter((c) =>
    ctx.unmappedCategories.has(c),
  ).length;
  score += unmappedHits * 0.5;

  // Goal alignment.
  if (ctx.goal) {
    if (recipe.compatibleGoals.includes(ctx.goal)) score += 2;

    if (ctx.goal === 'lose_weight') {
      if (recipe.tags.includes('low_calorie')) score += 1.5;
      if (recipe.estimatedCalories <= 500) score += 1;
      if (recipe.tags.includes('mass_gain')) score -= 1;
    }

    if (ctx.goal === 'gain_muscle') {
      if (recipe.tags.includes('mass_gain')) score += 1.5;
      if (recipe.tags.includes('high_protein')) score += 1.5;
      if (recipe.estimatedCalories >= 500) score += 1;
      if (recipe.tags.includes('low_calorie')) score -= 1;
    }

    if (ctx.goal === 'recomposition') {
      if (recipe.tags.includes('high_protein')) score += 1.5;
      if (recipe.tags.includes('recomposition')) score += 1;
    }

    if (ctx.goal === 'maintain') {
      if (recipe.tags.includes('high_protein')) score += 0.5;
    }
  }

  // Simplicity bonus.
  if (recipe.tags.includes('quick') || recipe.prepTimeMinutes <= 10) score += 0.5;
  if (recipe.tags.includes('no_cook')) score += 0.5;

  // Calorie-target proximity (used for "full day" planning).
  if (ctx.targetKcal && ctx.targetKcal > 0) {
    const delta = Math.abs(recipe.estimatedCalories - ctx.targetKcal);
    const proximity = Math.max(0, 2 - delta / 100);
    score += proximity;
  }

  const goodFridgeMatch =
    required.length > 0 &&
    matchedRequired.length / required.length >= GOOD_FRIDGE_MATCH_RATIO;

  return {
    recipe,
    score,
    matchedIngredientIds: matchedRequired,
    missingIngredientIds: missing,
    optionalIngredientIds: matchedOptional,
    matchReasonKeys: getRecipeMatchReasons(
      recipe,
      ctx,
      matchedRequired.length,
      missing.length,
    ),
    goodFridgeMatch,
  };
}

/**
 * Translation keys describing why a recipe matches the user's context.
 * Kept deterministic so the UI can render them as chips without further
 * computation. Keys live under `nutrition.recipes.matchReasons.*`.
 */
export function getRecipeMatchReasons(
  recipe: InternalRecipe,
  ctx: ScoreContext,
  matchedRequiredCount: number,
  missingCount: number,
): string[] {
  const reasons: string[] = [];

  if (matchedRequiredCount > 0 && missingCount === 0) {
    reasons.push('nutrition.recipes.matchReasons.allInFridge');
  } else if (
    matchedRequiredCount > 0 &&
    matchedRequiredCount >= Math.ceil((recipe.ingredientIds.length || 1) / 2)
  ) {
    reasons.push('nutrition.recipes.matchReasons.mostInFridge');
  }

  if (recipe.tags.includes('quick') || recipe.prepTimeMinutes <= 10) {
    reasons.push('nutrition.recipes.matchReasons.quick');
  }
  if (recipe.tags.includes('high_protein')) {
    reasons.push('nutrition.recipes.matchReasons.highProtein');
  }

  if (ctx.goal && recipe.compatibleGoals.includes(ctx.goal)) {
    if (ctx.goal === 'lose_weight') {
      reasons.push('nutrition.recipes.matchReasons.fitsWeightLoss');
    } else if (ctx.goal === 'gain_muscle') {
      reasons.push('nutrition.recipes.matchReasons.fitsMassGain');
    } else if (ctx.goal === 'recomposition') {
      reasons.push('nutrition.recipes.matchReasons.fitsRecomposition');
    } else if (ctx.goal === 'maintain') {
      reasons.push('nutrition.recipes.matchReasons.fitsMaintain');
    }
  }

  return reasons;
}

export interface RankRecipesOptions {
  ingredientIds: IngredientId[];
  unmappedLabels?: string[];
  unmappedCategories?: IngredientCategory[];
  restrictions?: DietaryRestriction[];
  goal?: FitnessGoal;
  mealType?: MealType;
  /** Used only when planning a full day to bias toward a per-meal kcal target. */
  targetKcal?: number;
  /** Cap on the number of returned matches — defaults to 3. */
  limit?: number;
}

/**
 * Returns the best-ranked internal recipes for a given context. Restrictions
 * are applied first (hard exclusion); the remaining recipes are scored and
 * the top {@link MAX_RECIPES_PER_MEAL_TYPE} (or `limit`) are returned.
 */
export function rankRecipesForGoal(opts: RankRecipesOptions): RecipeMatch[] {
  const limit = opts.limit ?? MAX_RECIPES_PER_MEAL_TYPE;
  const available = new Set<IngredientId>(opts.ingredientIds);
  const unmappedCategories = new Set<IngredientCategory>(
    opts.unmappedCategories ?? [],
  );

  const filtered = RECIPE_CATALOG.filter((recipe) => {
    if (opts.mealType && recipe.mealType !== opts.mealType) return false;
    if (recipe.forbiddenIngredientIds?.some((id) => available.has(id))) {
      return false;
    }
    return true;
  });

  const allowedByRestrictions = filterRecipesByRestrictions(
    filtered,
    opts.restrictions ?? [],
  );

  const scored = allowedByRestrictions.map((recipe, index) => ({
    match: scoreRecipeAgainstFridge(recipe, {
      available,
      unmappedCategories,
      goal: opts.goal,
      targetKcal: opts.targetKcal,
    }),
    index,
  }));

  scored.sort((a, b) => {
    const delta = b.match.score - a.match.score;
    if (delta !== 0) return delta;
    return a.index - b.index;
  });

  return scored.slice(0, limit).map((s) => s.match);
}

/** Same as {@link rankRecipesForGoal} but always scoped to a single mealType. */
export function getRecipesForMealType(
  mealType: MealType,
  opts: Omit<RankRecipesOptions, 'mealType'>,
): RecipeMatch[] {
  return rankRecipesForGoal({ ...opts, mealType });
}

/**
 * Convenience around {@link rankRecipesForGoal} that returns up to 3 matches
 * for a given mealType, biased by the user's fridge.
 */
export function getFridgeAwareRecipes(opts: {
  mealType: MealType;
  ingredientIds: IngredientId[];
  unmappedCategories?: IngredientCategory[];
  restrictions?: DietaryRestriction[];
  goal?: FitnessGoal;
  limit?: number;
}): RecipeMatch[] {
  return getRecipesForMealType(opts.mealType, {
    ingredientIds: opts.ingredientIds,
    unmappedCategories: opts.unmappedCategories,
    restrictions: opts.restrictions,
    goal: opts.goal,
    limit: opts.limit,
  });
}

export interface FullDayRecipePlan {
  breakfast: RecipeMatch | null;
  lunch: RecipeMatch | null;
  dinner: RecipeMatch | null;
  snack: RecipeMatch | null;
}

/**
 * Picks one recipe per meal type to suggest a coherent day. Each slot is
 * ranked independently with the same fridge + goal context.
 *
 * If `targetDailyKcal` is provided, each slot biases toward a sensible
 * fraction of the day (breakfast 25%, lunch 35%, dinner 30%, snack 10%).
 */
export function getFullDayRecipePlan(opts: {
  ingredientIds: IngredientId[];
  unmappedCategories?: IngredientCategory[];
  restrictions?: DietaryRestriction[];
  goal?: FitnessGoal;
  targetDailyKcal?: number;
}): FullDayRecipePlan {
  const slotShares: Record<MealType, number> = {
    breakfast: 0.25,
    lunch: 0.35,
    dinner: 0.3,
    snack: 0.1,
  };

  const result: FullDayRecipePlan = {
    breakfast: null,
    lunch: null,
    dinner: null,
    snack: null,
  };

  for (const slot of ['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]) {
    const targetKcal = opts.targetDailyKcal
      ? Math.round(opts.targetDailyKcal * slotShares[slot])
      : undefined;
    const matches = getRecipesForMealType(slot, {
      ingredientIds: opts.ingredientIds,
      unmappedCategories: opts.unmappedCategories,
      restrictions: opts.restrictions,
      goal: opts.goal,
      targetKcal,
      limit: 1,
    });
    result[slot] = matches[0] ?? null;
  }

  return result;
}

/**
 * Type guard — narrows a `Recipe` to the AI-generated branch. Useful for the
 * recipe card to render the "Proposée par IA" badge.
 */
export function isAIGeneratedRecipe(recipe: Recipe): recipe is AIGeneratedRecipe {
  return recipe.source === 'ai';
}

/**
 * Type guard — narrows a `Recipe` to the internal branch.
 */
export function isInternalRecipe(recipe: Recipe): recipe is InternalRecipe {
  return recipe.source === 'internal';
}
