import type { Recipe } from '../../../types/recipe.types';
import type { MealType } from './meal-suggestions';

/**
 * Tiny in-memory cache of the last recipe list rendered for a meal type.
 * The detail screen looks recipes up here by id — without it, AI-generated
 * recipes (which get a new id each fetch) couldn't be re-resolved when the
 * user taps "View recipe".
 *
 * The cache is intentionally process-local and ephemeral. It does NOT
 * survive a process restart, which is fine: the user would be on the list
 * screen first.
 */
const cache = new Map<MealType, Recipe[]>();

export function rememberRecipes(mealType: MealType, recipes: Recipe[]): void {
  cache.set(mealType, recipes);
}

export function getRememberedRecipe(
  mealType: MealType,
  recipeId: string,
): Recipe | null {
  const list = cache.get(mealType) ?? [];
  return (
    list.find((r) => {
      if (r.source === 'internal') return `internal:${r.id}` === recipeId;
      return r.id === recipeId;
    }) ?? null
  );
}

export function clearRememberedRecipes(): void {
  cache.clear();
}
