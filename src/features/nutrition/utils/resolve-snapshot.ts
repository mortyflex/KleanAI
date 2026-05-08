import type { ChosenRecipeSnapshot } from '../../../types/recipe.types';
import { RECIPE_BY_ID } from '../data/recipe-catalog';

/**
 * Returns a snapshot whose user-facing strings (title, description) are
 * **always** resolved with the current i18n language.
 *
 * Why: snapshots get persisted in AsyncStorage with whatever string
 * `t(titleKey)` returned at the time the user picked the recipe. Switching
 * language later would otherwise leave the previously-resolved string
 * stale. For internal recipes we re-resolve from the catalog every render;
 * for AI recipes the title/description are intrinsic to the AI output and
 * stay as-is.
 */
export function resolveSnapshotForDisplay(
  snapshot: ChosenRecipeSnapshot,
  resolveLabel: (key: string) => string,
): ChosenRecipeSnapshot {
  if (snapshot.source !== 'internal') return snapshot;
  const internalId = snapshot.recipeId.replace(/^internal:/, '');
  const recipe = RECIPE_BY_ID.get(internalId);
  if (!recipe) return snapshot;
  return {
    ...snapshot,
    title: resolveLabel(recipe.titleKey),
    description: resolveLabel(recipe.descriptionKey),
  };
}
