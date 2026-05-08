import { useCallback, useEffect, useState } from 'react';
import type {
  ChosenRecipeSnapshot,
  Recipe,
} from '../../../types/recipe.types';
import {
  clearChosenRecipe,
  getChosenRecipes,
  setChosenRecipe,
  type ChosenRecipesMap,
} from '../store/chosen-recipes-storage';
import type { MealType } from '../utils/meal-suggestions';

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
      setChosen(map);
    } finally {
      setIsLoading(false);
    }
  }, [logDate]);

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
