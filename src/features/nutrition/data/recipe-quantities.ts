import type { IngredientId } from '../../../types/ai.types';
import type { RecipeIngredientQuantity } from '../../../types/recipe.types';

export type RecipeQuantitiesMap = Partial<
  Record<IngredientId, RecipeIngredientQuantity>
>;

/**
 * Approximate quantities per ingredient for each internal recipe. These are
 * sane averages — a single serving size for a person of typical adult weight.
 * They are intentionally NOT medically validated and are surfaced in the UI
 * with the "~" prefix and the "estimates" disclaimer.
 *
 * Adding quantities for a new recipe: register an entry keyed by the recipe
 * id; quantities are looked up at render time so missing entries simply
 * fall back to ingredient-only display.
 */
export const RECIPE_QUANTITIES: Record<string, RecipeQuantitiesMap> = {
  // ─── BREAKFAST ─────────────────────────────────────────────────────────
  oatmeal_berries_breakfast: {
    oats: { amount: 50, unit: 'g' },
    berries: { amount: 80, unit: 'g' },
    banana: { amount: 1, unit: 'piece' },
    almonds: { amount: 15, unit: 'g' },
  },
  greek_yogurt_protein_bowl: {
    greek_yogurt: { amount: 200, unit: 'g' },
    berries: { amount: 80, unit: 'g' },
    almonds: { amount: 15, unit: 'g' },
    oats: { amount: 30, unit: 'g' },
    banana: { amount: 1, unit: 'piece' },
  },
  tofu_veg_scramble: {
    tofu: { amount: 150, unit: 'g' },
    spinach: { amount: 50, unit: 'g' },
    tomato: { amount: 1, unit: 'piece' },
    bell_pepper: { amount: 1, unit: 'piece' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  eggs_avocado_breakfast: {
    eggs: { amount: 2, unit: 'piece' },
    avocado: { amount: 1, unit: 'piece' },
    olive_oil: { amount: 1, unit: 'tsp' },
  },
  scrambled_eggs_spinach: {
    eggs: { amount: 3, unit: 'piece' },
    spinach: { amount: 50, unit: 'g' },
    olive_oil: { amount: 1, unit: 'tsp' },
    tomato: { amount: 1, unit: 'piece' },
  },
  cottage_oats_pancakes: {
    cottage_cheese: { amount: 150, unit: 'g' },
    oats: { amount: 50, unit: 'g' },
    eggs: { amount: 2, unit: 'piece' },
    berries: { amount: 60, unit: 'g' },
    banana: { amount: 1, unit: 'piece' },
  },
  banana_oats_protein: {
    oats: { amount: 60, unit: 'g' },
    banana: { amount: 1, unit: 'piece' },
    greek_yogurt: { amount: 150, unit: 'g' },
    almonds: { amount: 15, unit: 'g' },
  },
  no_cook_fruit_bowl: {
    apple: { amount: 1, unit: 'piece' },
    banana: { amount: 1, unit: 'piece' },
    berries: { amount: 80, unit: 'g' },
    almonds: { amount: 15, unit: 'g' },
  },
  avocado_toast_classic: {
    avocado: { amount: 1, unit: 'piece' },
    olive_oil: { amount: 1, unit: 'tsp' },
    tomato: { amount: 1, unit: 'piece' },
  },
  salmon_avocado_breakfast: {
    salmon: { amount: 100, unit: 'g' },
    avocado: { amount: 1, unit: 'piece' },
    eggs: { amount: 2, unit: 'piece' },
  },
  eggs_brown_rice_breakfast: {
    eggs: { amount: 2, unit: 'piece' },
    brown_rice: { amount: 80, unit: 'g' },
    spinach: { amount: 50, unit: 'g' },
    olive_oil: { amount: 1, unit: 'tsp' },
  },

  // ─── LUNCH ─────────────────────────────────────────────────────────────
  chicken_rice_lunch: {
    chicken_breast: { amount: 150, unit: 'g' },
    brown_rice: { amount: 80, unit: 'g' },
    broccoli: { amount: 150, unit: 'g' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  lentil_quinoa_lunch: {
    lentils: { amount: 80, unit: 'g' },
    quinoa: { amount: 70, unit: 'g' },
    tomato: { amount: 1, unit: 'piece' },
    olive_oil: { amount: 1, unit: 'tbsp' },
    spinach: { amount: 50, unit: 'g' },
  },
  salmon_sweet_potato_lunch: {
    salmon: { amount: 150, unit: 'g' },
    sweet_potato: { amount: 200, unit: 'g' },
    spinach: { amount: 50, unit: 'g' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  tofu_stir_fry_lunch: {
    tofu: { amount: 150, unit: 'g' },
    brown_rice: { amount: 80, unit: 'g' },
    bell_pepper: { amount: 1, unit: 'piece' },
    broccoli: { amount: 150, unit: 'g' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  tuna_quinoa_bowl: {
    tuna: { amount: 120, unit: 'g' },
    quinoa: { amount: 70, unit: 'g' },
    tomato: { amount: 1, unit: 'piece' },
    bell_pepper: { amount: 1, unit: 'piece' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  chicken_quinoa_lunch: {
    chicken_breast: { amount: 150, unit: 'g' },
    quinoa: { amount: 70, unit: 'g' },
    broccoli: { amount: 150, unit: 'g' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  chickpea_buddha_bowl: {
    chickpeas: { amount: 150, unit: 'g' },
    sweet_potato: { amount: 200, unit: 'g' },
    spinach: { amount: 50, unit: 'g' },
    avocado: { amount: 1, unit: 'piece' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  beef_rice_lunch: {
    beef: { amount: 150, unit: 'g' },
    brown_rice: { amount: 80, unit: 'g' },
    broccoli: { amount: 150, unit: 'g' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  turkey_veg_wrap: {
    turkey: { amount: 120, unit: 'g' },
    tomato: { amount: 1, unit: 'piece' },
    bell_pepper: { amount: 1, unit: 'piece' },
    avocado: { amount: 1, unit: 'piece' },
    spinach: { amount: 30, unit: 'g' },
  },
  veggie_quinoa_bowl_lunch: {
    quinoa: { amount: 80, unit: 'g' },
    chickpeas: { amount: 120, unit: 'g' },
    spinach: { amount: 50, unit: 'g' },
    tomato: { amount: 1, unit: 'piece' },
    olive_oil: { amount: 1, unit: 'tbsp' },
    avocado: { amount: 1, unit: 'piece' },
  },

  // ─── DINNER ────────────────────────────────────────────────────────────
  turkey_meatballs_dinner: {
    turkey: { amount: 150, unit: 'g' },
    tomato: { amount: 2, unit: 'piece' },
    olive_oil: { amount: 1, unit: 'tbsp' },
    spinach: { amount: 50, unit: 'g' },
  },
  chickpea_curry_dinner: {
    chickpeas: { amount: 150, unit: 'g' },
    spinach: { amount: 50, unit: 'g' },
    brown_rice: { amount: 80, unit: 'g' },
    tomato: { amount: 2, unit: 'piece' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  grilled_chicken_veg_dinner: {
    chicken_breast: { amount: 150, unit: 'g' },
    broccoli: { amount: 150, unit: 'g' },
    olive_oil: { amount: 1, unit: 'tbsp' },
    bell_pepper: { amount: 1, unit: 'piece' },
  },
  baked_salmon_broccoli_dinner: {
    salmon: { amount: 150, unit: 'g' },
    broccoli: { amount: 150, unit: 'g' },
    sweet_potato: { amount: 200, unit: 'g' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  beef_sweet_potato_dinner: {
    beef: { amount: 150, unit: 'g' },
    sweet_potato: { amount: 200, unit: 'g' },
    spinach: { amount: 50, unit: 'g' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  tofu_curry_dinner: {
    tofu: { amount: 150, unit: 'g' },
    spinach: { amount: 50, unit: 'g' },
    tomato: { amount: 2, unit: 'piece' },
    brown_rice: { amount: 80, unit: 'g' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  eggs_veg_dinner_bowl: {
    eggs: { amount: 2, unit: 'piece' },
    brown_rice: { amount: 80, unit: 'g' },
    spinach: { amount: 50, unit: 'g' },
    avocado: { amount: 1, unit: 'piece' },
    olive_oil: { amount: 1, unit: 'tsp' },
  },
  salmon_quinoa_dinner: {
    salmon: { amount: 150, unit: 'g' },
    quinoa: { amount: 70, unit: 'g' },
    broccoli: { amount: 150, unit: 'g' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  lentil_stew_dinner: {
    lentils: { amount: 100, unit: 'g' },
    sweet_potato: { amount: 200, unit: 'g' },
    spinach: { amount: 50, unit: 'g' },
    tomato: { amount: 2, unit: 'piece' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  chicken_sweet_potato_dinner: {
    chicken_breast: { amount: 150, unit: 'g' },
    sweet_potato: { amount: 200, unit: 'g' },
    broccoli: { amount: 150, unit: 'g' },
    olive_oil: { amount: 1, unit: 'tbsp' },
  },
  tuna_pasta_dinner: {
    tuna: { amount: 120, unit: 'g' },
    tomato: { amount: 2, unit: 'piece' },
    olive_oil: { amount: 1, unit: 'tbsp' },
    spinach: { amount: 30, unit: 'g' },
  },

  // ─── SNACK ─────────────────────────────────────────────────────────────
  fruit_almonds_snack: {
    apple: { amount: 1, unit: 'piece' },
    almonds: { amount: 20, unit: 'g' },
    banana: { amount: 1, unit: 'piece' },
  },
  cottage_cheese_fruit_snack: {
    cottage_cheese: { amount: 150, unit: 'g' },
    banana: { amount: 1, unit: 'piece' },
    berries: { amount: 60, unit: 'g' },
    almonds: { amount: 10, unit: 'g' },
  },
  edamame_snack: {},
  banana_almond_butter_snack: {
    banana: { amount: 1, unit: 'piece' },
    almonds: { amount: 20, unit: 'g' },
  },
  greek_yogurt_berries_snack: {
    greek_yogurt: { amount: 150, unit: 'g' },
    berries: { amount: 60, unit: 'g' },
    almonds: { amount: 10, unit: 'g' },
    oats: { amount: 20, unit: 'g' },
  },
  hard_boiled_eggs_snack: {
    eggs: { amount: 2, unit: 'piece' },
  },
  tuna_crackers_snack: {
    tuna: { amount: 120, unit: 'g' },
    olive_oil: { amount: 1, unit: 'tsp' },
  },
  cottage_oats_snack: {
    cottage_cheese: { amount: 150, unit: 'g' },
    oats: { amount: 30, unit: 'g' },
    berries: { amount: 50, unit: 'g' },
  },
  avocado_egg_snack: {
    avocado: { amount: 1, unit: 'piece' },
    eggs: { amount: 1, unit: 'piece' },
  },
  apple_almond_butter_snack: {
    apple: { amount: 1, unit: 'piece' },
    almonds: { amount: 20, unit: 'g' },
  },
};

/**
 * Returns the quantity associated with a (recipeId, ingredientId) pair, or
 * null when no quantity is registered. Callers use this to render
 * "50 g flocons d'avoine" instead of just "Flocons d'avoine".
 */
export function getRecipeIngredientQuantity(
  recipeId: string,
  ingredientId: IngredientId,
) {
  return RECIPE_QUANTITIES[recipeId]?.[ingredientId] ?? null;
}
