import type { IngredientId } from '../../../types/ai.types';
import type { DietaryRestriction } from '../../../types/profile.types';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealSuggestion {
  /** Stable id, also used as the suffix for the i18n title key. */
  id: string;
  type: MealType;
  /** i18n key for the meal title. */
  titleKey: string;
  /** i18n key for a short copy line (ingredients summary). */
  bodyKey: string;
  approxKcal: number;
  approxProteinG: number;
  /** Approximate carbs in grams — used to decrement the carbs macro bar
   * when the user marks a meal as eaten. */
  approxCarbsG: number;
  /** Approximate fat in grams — used to decrement the fat macro bar when
   * the user marks a meal as eaten. */
  approxFatG: number;
  /** Restrictions this meal is COMPATIBLE with (i.e. user can eat it). */
  compatibleWith: DietaryRestriction[];
  /** Restrictions this meal CONFLICTS with (i.e. should be hidden). */
  conflictsWith: DietaryRestriction[];
  emoji: string;
  /**
   * Internal ingredient ids the meal primarily relies on. Used by the fridge
   * vision flow to score meals against confirmed ingredients — not a strict
   * recipe, just enough to bias suggestions toward what is on hand.
   */
  ingredientIds?: IngredientId[];
}

const ALL_RESTRICTIONS: DietaryRestriction[] = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'lactose_free',
  'halal',
  'kosher',
];

function omit(
  list: DietaryRestriction[],
  exclude: DietaryRestriction[],
): DietaryRestriction[] {
  return list.filter((r) => !exclude.includes(r));
}

/**
 * Static catalog of simple meal suggestions. Klean AI is intentionally
 * NOT a full food tracking app — this is a small, curated set chosen to
 * cover the main goals (high-protein, balanced) and the dietary
 * restrictions we support. Open Food Facts integration is intentionally
 * out of scope for now.
 */
export const MEAL_CATALOG: MealSuggestion[] = [
  // ── Breakfast ────────────────────────────────────────────────────────────
  {
    id: 'oatmeal_berries',
    type: 'breakfast',
    titleKey: 'nutrition.suggestions.meals.oatmeal_berries.title',
    bodyKey: 'nutrition.suggestions.meals.oatmeal_berries.body',
    approxKcal: 380,
    approxProteinG: 18,
    approxCarbsG: 55,
    approxFatG: 9,
    compatibleWith: omit(ALL_RESTRICTIONS, ['gluten_free']),
    conflictsWith: ['gluten_free'],
    emoji: '🥣',
    ingredientIds: ['oats', 'berries'],
  },
  {
    id: 'greek_yogurt_bowl',
    type: 'breakfast',
    titleKey: 'nutrition.suggestions.meals.greek_yogurt_bowl.title',
    bodyKey: 'nutrition.suggestions.meals.greek_yogurt_bowl.body',
    approxKcal: 320,
    approxProteinG: 24,
    approxCarbsG: 38,
    approxFatG: 8,
    compatibleWith: omit(ALL_RESTRICTIONS, ['vegan', 'lactose_free']),
    conflictsWith: ['vegan', 'lactose_free'],
    emoji: '🥛',
    ingredientIds: ['greek_yogurt', 'berries'],
  },
  {
    id: 'tofu_scramble',
    type: 'breakfast',
    titleKey: 'nutrition.suggestions.meals.tofu_scramble.title',
    bodyKey: 'nutrition.suggestions.meals.tofu_scramble.body',
    approxKcal: 360,
    approxProteinG: 22,
    approxCarbsG: 24,
    approxFatG: 18,
    compatibleWith: ALL_RESTRICTIONS,
    conflictsWith: [],
    emoji: '🍳',
    ingredientIds: ['tofu', 'spinach'],
  },
  {
    id: 'eggs_avocado_toast',
    type: 'breakfast',
    titleKey: 'nutrition.suggestions.meals.eggs_avocado_toast.title',
    bodyKey: 'nutrition.suggestions.meals.eggs_avocado_toast.body',
    approxKcal: 420,
    approxProteinG: 22,
    approxCarbsG: 30,
    approxFatG: 22,
    compatibleWith: omit(ALL_RESTRICTIONS, ['vegan', 'gluten_free']),
    conflictsWith: ['vegan', 'gluten_free'],
    emoji: '🥑',
    ingredientIds: ['eggs', 'avocado'],
  },

  // ── Lunch ────────────────────────────────────────────────────────────────
  {
    id: 'chicken_rice_bowl',
    type: 'lunch',
    titleKey: 'nutrition.suggestions.meals.chicken_rice_bowl.title',
    bodyKey: 'nutrition.suggestions.meals.chicken_rice_bowl.body',
    approxKcal: 580,
    approxProteinG: 42,
    approxCarbsG: 70,
    approxFatG: 12,
    compatibleWith: omit(ALL_RESTRICTIONS, ['vegetarian', 'vegan']),
    conflictsWith: ['vegetarian', 'vegan'],
    emoji: '🍗',
    ingredientIds: ['chicken_breast', 'brown_rice', 'broccoli'],
  },
  {
    id: 'lentil_quinoa_salad',
    type: 'lunch',
    titleKey: 'nutrition.suggestions.meals.lentil_quinoa_salad.title',
    bodyKey: 'nutrition.suggestions.meals.lentil_quinoa_salad.body',
    approxKcal: 480,
    approxProteinG: 24,
    approxCarbsG: 60,
    approxFatG: 14,
    compatibleWith: ALL_RESTRICTIONS,
    conflictsWith: [],
    emoji: '🥗',
    ingredientIds: ['lentils', 'quinoa', 'tomato'],
  },
  {
    id: 'salmon_sweet_potato',
    type: 'lunch',
    titleKey: 'nutrition.suggestions.meals.salmon_sweet_potato.title',
    bodyKey: 'nutrition.suggestions.meals.salmon_sweet_potato.body',
    approxKcal: 560,
    approxProteinG: 38,
    approxCarbsG: 48,
    approxFatG: 22,
    compatibleWith: omit(ALL_RESTRICTIONS, ['vegetarian', 'vegan']),
    conflictsWith: ['vegetarian', 'vegan'],
    emoji: '🐟',
    ingredientIds: ['salmon', 'sweet_potato', 'spinach'],
  },
  {
    id: 'tofu_stir_fry',
    type: 'lunch',
    titleKey: 'nutrition.suggestions.meals.tofu_stir_fry.title',
    bodyKey: 'nutrition.suggestions.meals.tofu_stir_fry.body',
    approxKcal: 510,
    approxProteinG: 28,
    approxCarbsG: 60,
    approxFatG: 16,
    compatibleWith: ALL_RESTRICTIONS,
    conflictsWith: [],
    emoji: '🥢',
    ingredientIds: ['tofu', 'brown_rice', 'bell_pepper'],
  },

  // ── Dinner ───────────────────────────────────────────────────────────────
  {
    id: 'turkey_meatballs',
    type: 'dinner',
    titleKey: 'nutrition.suggestions.meals.turkey_meatballs.title',
    bodyKey: 'nutrition.suggestions.meals.turkey_meatballs.body',
    approxKcal: 540,
    approxProteinG: 40,
    approxCarbsG: 50,
    approxFatG: 18,
    compatibleWith: omit(ALL_RESTRICTIONS, ['vegetarian', 'vegan']),
    conflictsWith: ['vegetarian', 'vegan'],
    emoji: '🍝',
    ingredientIds: ['turkey', 'tomato'],
  },
  {
    id: 'chickpea_curry',
    type: 'dinner',
    titleKey: 'nutrition.suggestions.meals.chickpea_curry.title',
    bodyKey: 'nutrition.suggestions.meals.chickpea_curry.body',
    approxKcal: 520,
    approxProteinG: 22,
    approxCarbsG: 70,
    approxFatG: 14,
    compatibleWith: ALL_RESTRICTIONS,
    conflictsWith: [],
    emoji: '🍛',
    ingredientIds: ['chickpeas', 'spinach', 'brown_rice'],
  },
  {
    id: 'grilled_chicken_veg',
    type: 'dinner',
    titleKey: 'nutrition.suggestions.meals.grilled_chicken_veg.title',
    bodyKey: 'nutrition.suggestions.meals.grilled_chicken_veg.body',
    approxKcal: 500,
    approxProteinG: 44,
    approxCarbsG: 30,
    approxFatG: 20,
    compatibleWith: omit(ALL_RESTRICTIONS, ['vegetarian', 'vegan']),
    conflictsWith: ['vegetarian', 'vegan'],
    emoji: '🍽️',
    ingredientIds: ['chicken_breast', 'broccoli', 'olive_oil'],
  },

  // ── Snack ────────────────────────────────────────────────────────────────
  {
    id: 'fruit_almonds',
    type: 'snack',
    titleKey: 'nutrition.suggestions.meals.fruit_almonds.title',
    bodyKey: 'nutrition.suggestions.meals.fruit_almonds.body',
    approxKcal: 220,
    approxProteinG: 6,
    approxCarbsG: 24,
    approxFatG: 12,
    compatibleWith: ALL_RESTRICTIONS,
    conflictsWith: [],
    emoji: '🍎',
    ingredientIds: ['apple', 'almonds'],
  },
  {
    id: 'cottage_cheese_fruit',
    type: 'snack',
    titleKey: 'nutrition.suggestions.meals.cottage_cheese_fruit.title',
    bodyKey: 'nutrition.suggestions.meals.cottage_cheese_fruit.body',
    approxKcal: 200,
    approxProteinG: 18,
    approxCarbsG: 18,
    approxFatG: 5,
    compatibleWith: omit(ALL_RESTRICTIONS, ['vegan', 'lactose_free']),
    conflictsWith: ['vegan', 'lactose_free'],
    emoji: '🥄',
    ingredientIds: ['cottage_cheese', 'banana'],
  },
  {
    id: 'edamame',
    type: 'snack',
    titleKey: 'nutrition.suggestions.meals.edamame.title',
    bodyKey: 'nutrition.suggestions.meals.edamame.body',
    approxKcal: 180,
    approxProteinG: 16,
    approxCarbsG: 14,
    approxFatG: 7,
    compatibleWith: ALL_RESTRICTIONS,
    conflictsWith: [],
    emoji: '🫛',
  },
];

export interface SuggestionsQuery {
  restrictions?: DietaryRestriction[];
  type?: MealType;
  /** Maximum number of suggestions returned per meal type. */
  limit?: number;
}

/**
 * Filter the catalog by dietary restrictions and (optionally) by meal type.
 * Returns up to `limit` suggestions (default 3). The catalog is small and
 * deterministic — no shuffling — so the order is stable across renders.
 */
export function getMealSuggestions(query: SuggestionsQuery = {}): MealSuggestion[] {
  const { restrictions = [], type, limit = 3 } = query;
  const filtered = MEAL_CATALOG.filter((m) => {
    if (type && m.type !== type) return false;
    return !m.conflictsWith.some((c) => restrictions.includes(c));
  });
  if (!type) return filtered;
  return filtered.slice(0, limit);
}

/**
 * Returns 1 suggestion for each of the four meal types, after filtering
 * by restrictions. Useful for the home/nutrition tab where we only want
 * a quick at-a-glance day plan.
 */
export function getDailyMealPlan(
  restrictions: DietaryRestriction[] = [],
): Record<MealType, MealSuggestion | null> {
  const types: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const result = {} as Record<MealType, MealSuggestion | null>;
  for (const t of types) {
    const candidates = getMealSuggestions({ restrictions, type: t, limit: 1 });
    result[t] = candidates[0] ?? null;
  }
  return result;
}

/**
 * Score a single meal against the set of ingredient ids the user actually
 * has on hand. Higher score = more matches with the fridge. Meals that do
 * not declare any ingredient ids score 0 — they are still eligible, just
 * not preferred when fridge data is available.
 */
export function scoreMealAgainstFridge(
  meal: MealSuggestion,
  available: ReadonlySet<IngredientId>,
): number {
  if (!meal.ingredientIds || meal.ingredientIds.length === 0) return 0;
  let matches = 0;
  for (const id of meal.ingredientIds) {
    if (available.has(id)) matches += 1;
  }
  return matches;
}

export interface FridgeAwareSuggestionsQuery extends SuggestionsQuery {
  /** Internal ingredient ids the user has confirmed are in their fridge. */
  ingredientIds: IngredientId[];
}

/**
 * Like {@link getMealSuggestions} but biases the result toward meals that
 * use ingredients the user has confirmed. Filtering by restrictions still
 * applies — fridge data can never override a dietary conflict. Meals are
 * sorted by descending fridge match count, then by their original catalog
 * order so results are stable.
 */
export function getFridgeAwareSuggestions(
  query: FridgeAwareSuggestionsQuery,
): MealSuggestion[] {
  const available = new Set<IngredientId>(query.ingredientIds);
  const filtered = MEAL_CATALOG.filter((m) => {
    if (query.type && m.type !== query.type) return false;
    return !m.conflictsWith.some((c) => (query.restrictions ?? []).includes(c));
  });

  const scored = filtered
    .map((meal, index) => ({
      meal,
      index,
      score: scoreMealAgainstFridge(meal, available),
    }))
    // Stable sort: by score desc, then by original catalog order.
    .sort((a, b) => (b.score - a.score) || (a.index - b.index));

  if (!query.type) return scored.map((s) => s.meal);
  return scored.slice(0, query.limit ?? 3).map((s) => s.meal);
}

/**
 * Daily plan version of {@link getFridgeAwareSuggestions}. Each meal type
 * returns the single best-scoring suggestion that does not conflict with
 * the user's restrictions. When no ingredient ids are provided, this
 * behaves identically to {@link getDailyMealPlan} (catalog order wins).
 */
export function getDailyMealPlanWithFridge(
  ingredientIds: IngredientId[],
  restrictions: DietaryRestriction[] = [],
): Record<MealType, MealSuggestion | null> {
  const types: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const result = {} as Record<MealType, MealSuggestion | null>;
  for (const t of types) {
    const candidates = getFridgeAwareSuggestions({
      restrictions,
      type: t,
      limit: 1,
      ingredientIds,
    });
    result[t] = candidates[0] ?? null;
  }
  return result;
}
