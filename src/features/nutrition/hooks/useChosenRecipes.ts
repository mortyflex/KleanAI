import { useCallback, useEffect, useState } from 'react';
import type {
  ChosenRecipeSnapshot,
  Recipe,
} from '../../../types/recipe.types';
import {
  clearChosenRecipe,
  getChosenRecipes,
  saveChosenRecipes,
  setChosenRecipe,
  type ChosenRecipesMap,
} from '../store/chosen-recipes-storage';
import { RECIPE_BY_ID } from '../data/recipe-catalog';
import type { MealType } from '../utils/meal-suggestions';

/**
 * Self-healing migration for snapshots stored before the i18n key prefix fix.
 * If the persisted title/description still looks like a translation key
 * (e.g. `nutrition.recipes.items.X.title`), we re-resolve it against the
 * catalog using the up-to-date keys. Internal snapshots whose recipe id no
 * longer exists are dropped — falling back to the suggestion is safer than
 * showing a raw key.
 */
function looksLikeUnresolvedKey(value: string): boolean {
  return (
    value.startsWith('nutrition.recipes.items.') ||
    value.startsWith('recipes.items.')
  );
}

function migrateSnapshot(
  snapshot: ChosenRecipeSnapshot,
  resolveLabel: (key: string) => string,
): ChosenRecipeSnapshot | null {
  if (snapshot.source !== 'internal') return snapshot;
  if (
    !looksLikeUnresolvedKey(snapshot.title) &&
    !looksLikeUnresolvedKey(snapshot.description)
  ) {
    return snapshot;
  }
  const internalId = snapshot.recipeId.replace(/^internal:/, '');
  const recipe = RECIPE_BY_ID.get(internalId);
  if (!recipe) return null;
  return {
    ...snapshot,
    title: resolveLabel(recipe.titleKey),
    description: resolveLabel(recipe.descriptionKey),
  };
}

function migrateChosenMap(
  map: ChosenRecipesMap,
  resolveLabel: (key: string) => string,
): { migrated: ChosenRecipesMap; changed: boolean } {
  let changed = false;
  const migrated: ChosenRecipesMap = {};
  for (const [slot, snapshot] of Object.entries(map) as [
    MealType,
    ChosenRecipeSnapshot,
  ][]) {
    if (!snapshot) continue;
    const next = migrateSnapshot(snapshot, resolveLabel);
    if (!next) {
      changed = true;
      continue;
    }
    if (next !== snapshot) changed = true;
    migrated[slot] = next;
  }
  return { migrated, changed };
}

export interface UseChosenRecipesResult {
  chosen: ChosenRecipesMap;
  isLoading: boolean;
  /** Set the chosen recipe for a meal slot. */
  choose: (mealType: MealType, recipe: Recipe) => Promise<void>;
  /** Remove the chosen recipe for a meal slot — falls back to the suggestion. */
  unchoose: (mealType: MealType) => Promise<void>;
  reload: () => Promise<void>;
}

/** Builds a `ChosenRecipeSnapshot` from a `Recipe` — the snapshot is what we
 * persist so the user's choice survives a recipe-catalog rename. */
export function buildChosenRecipeSnapshot(
  recipe: Recipe,
  resolveLabel: (key: string) => string,
): ChosenRecipeSnapshot {
  if (recipe.source === 'internal') {
    return {
      recipeId: `internal:${recipe.id}`,
      source: 'internal',
      mealType: recipe.mealType,
      title: resolveLabel(recipe.titleKey),
      description: resolveLabel(recipe.descriptionKey),
      estimatedCalories: recipe.estimatedCalories,
      estimatedProteinG: recipe.estimatedProteinG,
      estimatedCarbsG: recipe.estimatedCarbsG,
      estimatedFatG: recipe.estimatedFatG,
      prepTimeMinutes: recipe.prepTimeMinutes,
      tags: recipe.tags,
      chosenAt: new Date().toISOString(),
    };
  }
  return {
    recipeId: recipe.id,
    source: 'ai',
    mealType: recipe.mealType,
    title: recipe.title,
    description: recipe.description,
    estimatedCalories: recipe.estimatedCalories,
    estimatedProteinG: recipe.estimatedProteinG,
    estimatedCarbsG: recipe.estimatedCarbsG,
    estimatedFatG: recipe.estimatedFatG,
    prepTimeMinutes: recipe.prepTimeMinutes,
    tags: recipe.tags,
    chosenAt: new Date().toISOString(),
  };
}

export function useChosenRecipes(
  logDate: string,
  resolveLabel: (key: string) => string,
): UseChosenRecipesResult {
  const [chosen, setChosen] = useState<ChosenRecipesMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const map = await getChosenRecipes(logDate);
      const { migrated, changed } = migrateChosenMap(map, resolveLabel);
      setChosen(migrated);
      if (changed) {
        // Persist the migration so the next mount gets clean data without
        // re-running the regex check.
        saveChosenRecipes(logDate, migrated).catch(() => {});
      }
    } finally {
      setIsLoading(false);
    }
  }, [logDate, resolveLabel]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const choose = useCallback(
    async (mealType: MealType, recipe: Recipe) => {
      const snapshot = buildChosenRecipeSnapshot(recipe, resolveLabel);
      const next = await setChosenRecipe(logDate, mealType, snapshot);
      setChosen(next);
    },
    [logDate, resolveLabel],
  );

  const unchoose = useCallback(
    async (mealType: MealType) => {
      const next = await clearChosenRecipe(logDate, mealType);
      setChosen(next);
    },
    [logDate],
  );

  return { chosen, isLoading, choose, unchoose, reload };
}
