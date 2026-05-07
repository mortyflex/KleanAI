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
  /** Restrictions this meal is COMPATIBLE with (i.e. user can eat it). */
  compatibleWith: DietaryRestriction[];
  /** Restrictions this meal CONFLICTS with (i.e. should be hidden). */
  conflictsWith: DietaryRestriction[];
  emoji: string;
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
    compatibleWith: omit(ALL_RESTRICTIONS, ['gluten_free']),
    conflictsWith: ['gluten_free'],
    emoji: '🥣',
  },
  {
    id: 'greek_yogurt_bowl',
    type: 'breakfast',
    titleKey: 'nutrition.suggestions.meals.greek_yogurt_bowl.title',
    bodyKey: 'nutrition.suggestions.meals.greek_yogurt_bowl.body',
    approxKcal: 320,
    approxProteinG: 24,
    compatibleWith: omit(ALL_RESTRICTIONS, ['vegan', 'lactose_free']),
    conflictsWith: ['vegan', 'lactose_free'],
    emoji: '🥛',
  },
  {
    id: 'tofu_scramble',
    type: 'breakfast',
    titleKey: 'nutrition.suggestions.meals.tofu_scramble.title',
    bodyKey: 'nutrition.suggestions.meals.tofu_scramble.body',
    approxKcal: 360,
    approxProteinG: 22,
    compatibleWith: ALL_RESTRICTIONS,
    conflictsWith: [],
    emoji: '🍳',
  },
  {
    id: 'eggs_avocado_toast',
    type: 'breakfast',
    titleKey: 'nutrition.suggestions.meals.eggs_avocado_toast.title',
    bodyKey: 'nutrition.suggestions.meals.eggs_avocado_toast.body',
    approxKcal: 420,
    approxProteinG: 22,
    compatibleWith: omit(ALL_RESTRICTIONS, ['vegan', 'gluten_free']),
    conflictsWith: ['vegan', 'gluten_free'],
    emoji: '🥑',
  },

  // ── Lunch ────────────────────────────────────────────────────────────────
  {
    id: 'chicken_rice_bowl',
    type: 'lunch',
    titleKey: 'nutrition.suggestions.meals.chicken_rice_bowl.title',
    bodyKey: 'nutrition.suggestions.meals.chicken_rice_bowl.body',
    approxKcal: 580,
    approxProteinG: 42,
    compatibleWith: omit(ALL_RESTRICTIONS, ['vegetarian', 'vegan']),
    conflictsWith: ['vegetarian', 'vegan'],
    emoji: '🍗',
  },
  {
    id: 'lentil_quinoa_salad',
    type: 'lunch',
    titleKey: 'nutrition.suggestions.meals.lentil_quinoa_salad.title',
    bodyKey: 'nutrition.suggestions.meals.lentil_quinoa_salad.body',
    approxKcal: 480,
    approxProteinG: 24,
    compatibleWith: ALL_RESTRICTIONS,
    conflictsWith: [],
    emoji: '🥗',
  },
  {
    id: 'salmon_sweet_potato',
    type: 'lunch',
    titleKey: 'nutrition.suggestions.meals.salmon_sweet_potato.title',
    bodyKey: 'nutrition.suggestions.meals.salmon_sweet_potato.body',
    approxKcal: 560,
    approxProteinG: 38,
    compatibleWith: omit(ALL_RESTRICTIONS, ['vegetarian', 'vegan']),
    conflictsWith: ['vegetarian', 'vegan'],
    emoji: '🐟',
  },
  {
    id: 'tofu_stir_fry',
    type: 'lunch',
    titleKey: 'nutrition.suggestions.meals.tofu_stir_fry.title',
    bodyKey: 'nutrition.suggestions.meals.tofu_stir_fry.body',
    approxKcal: 510,
    approxProteinG: 28,
    compatibleWith: ALL_RESTRICTIONS,
    conflictsWith: [],
    emoji: '🥢',
  },

  // ── Dinner ───────────────────────────────────────────────────────────────
  {
    id: 'turkey_meatballs',
    type: 'dinner',
    titleKey: 'nutrition.suggestions.meals.turkey_meatballs.title',
    bodyKey: 'nutrition.suggestions.meals.turkey_meatballs.body',
    approxKcal: 540,
    approxProteinG: 40,
    compatibleWith: omit(ALL_RESTRICTIONS, ['vegetarian', 'vegan']),
    conflictsWith: ['vegetarian', 'vegan'],
    emoji: '🍝',
  },
  {
    id: 'chickpea_curry',
    type: 'dinner',
    titleKey: 'nutrition.suggestions.meals.chickpea_curry.title',
    bodyKey: 'nutrition.suggestions.meals.chickpea_curry.body',
    approxKcal: 520,
    approxProteinG: 22,
    compatibleWith: ALL_RESTRICTIONS,
    conflictsWith: [],
    emoji: '🍛',
  },
  {
    id: 'grilled_chicken_veg',
    type: 'dinner',
    titleKey: 'nutrition.suggestions.meals.grilled_chicken_veg.title',
    bodyKey: 'nutrition.suggestions.meals.grilled_chicken_veg.body',
    approxKcal: 500,
    approxProteinG: 44,
    compatibleWith: omit(ALL_RESTRICTIONS, ['vegetarian', 'vegan']),
    conflictsWith: ['vegetarian', 'vegan'],
    emoji: '🍽️',
  },

  // ── Snack ────────────────────────────────────────────────────────────────
  {
    id: 'fruit_almonds',
    type: 'snack',
    titleKey: 'nutrition.suggestions.meals.fruit_almonds.title',
    bodyKey: 'nutrition.suggestions.meals.fruit_almonds.body',
    approxKcal: 220,
    approxProteinG: 6,
    compatibleWith: ALL_RESTRICTIONS,
    conflictsWith: [],
    emoji: '🍎',
  },
  {
    id: 'cottage_cheese_fruit',
    type: 'snack',
    titleKey: 'nutrition.suggestions.meals.cottage_cheese_fruit.title',
    bodyKey: 'nutrition.suggestions.meals.cottage_cheese_fruit.body',
    approxKcal: 200,
    approxProteinG: 18,
    compatibleWith: omit(ALL_RESTRICTIONS, ['vegan', 'lactose_free']),
    conflictsWith: ['vegan', 'lactose_free'],
    emoji: '🥄',
  },
  {
    id: 'edamame',
    type: 'snack',
    titleKey: 'nutrition.suggestions.meals.edamame.title',
    bodyKey: 'nutrition.suggestions.meals.edamame.body',
    approxKcal: 180,
    approxProteinG: 16,
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
