import type {
  IngredientQuantityUnit,
  RecipeIngredientQuantity,
} from '../../../types/recipe.types';

const UNIT_KEY: Record<IngredientQuantityUnit, string> = {
  g: 'recipes.units.g',
  ml: 'recipes.units.ml',
  piece: 'recipes.units.piece',
  tbsp: 'recipes.units.tbsp',
  tsp: 'recipes.units.tsp',
  slice: 'recipes.units.slice',
  cup: 'recipes.units.cup',
  pinch: 'recipes.units.pinch',
};

/**
 * Builds a localized quantity string like "50 g", "1 piece", "1 c. à
 * soupe". Uses i18next's count plural rules so FR and EN both render
 * grammatically.
 *
 * `t` is intentionally typed loosely so this helper stays callable from any
 * component without importing the full i18next type surface.
 */
export function formatQuantity(
  quantity: RecipeIngredientQuantity,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const key = UNIT_KEY[quantity.unit];
  return t(key, { count: quantity.amount, amount: quantity.amount });
}
