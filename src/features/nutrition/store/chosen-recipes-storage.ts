import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChosenRecipeSnapshot } from '../../../types/recipe.types';
import type { MealType } from '../utils/meal-suggestions';

/**
 * Per-day map of chosen recipes — one entry per meal slot. Stored locally
 * only for now; the server sync of chosen recipes lands in a later phase
 * alongside the rest of the nutrition read-sync work (see MEMORY).
 */
export type ChosenRecipesMap = Partial<Record<MealType, ChosenRecipeSnapshot>>;

const dayKey = (logDate: string) => `@klean_chosen_recipes_${logDate}`;

export async function getChosenRecipes(
  logDate: string,
): Promise<ChosenRecipesMap> {
  const raw = await AsyncStorage.getItem(dayKey(logDate));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as ChosenRecipesMap;
  } catch {
    return {};
  }
}

export async function saveChosenRecipes(
  logDate: string,
  map: ChosenRecipesMap,
): Promise<void> {
  await AsyncStorage.setItem(dayKey(logDate), JSON.stringify(map));
}

export async function setChosenRecipe(
  logDate: string,
  mealType: MealType,
  snapshot: ChosenRecipeSnapshot,
): Promise<ChosenRecipesMap> {
  const current = await getChosenRecipes(logDate);
  const next: ChosenRecipesMap = { ...current, [mealType]: snapshot };
  await saveChosenRecipes(logDate, next);
  return next;
}

export async function clearChosenRecipe(
  logDate: string,
  mealType: MealType,
): Promise<ChosenRecipesMap> {
  const current = await getChosenRecipes(logDate);
  if (!current[mealType]) return current;
  const { [mealType]: _removed, ...rest } = current;
  await saveChosenRecipes(logDate, rest);
  return rest;
}

export async function clearChosenRecipesForDay(
  logDate: string,
): Promise<void> {
  await AsyncStorage.removeItem(dayKey(logDate));
}
