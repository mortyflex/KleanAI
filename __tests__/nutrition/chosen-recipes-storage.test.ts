import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearChosenRecipe,
  clearChosenRecipesForDay,
  getChosenRecipes,
  setChosenRecipe,
} from '../../src/features/nutrition/store/chosen-recipes-storage';
import type { ChosenRecipeSnapshot } from '../../src/types/recipe.types';

const snapshot: ChosenRecipeSnapshot = {
  recipeId: 'internal:chicken_rice_lunch',
  source: 'internal',
  mealType: 'lunch',
  title: 'Chicken & brown rice bowl',
  description: 'Grilled chicken with rice',
  estimatedCalories: 580,
  estimatedProteinG: 44,
  estimatedCarbsG: 62,
  estimatedFatG: 14,
  prepTimeMinutes: 22,
  tags: ['high_protein'],
  chosenAt: '2026-05-08T10:00:00Z',
};

describe('chosen-recipes-storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns an empty map when nothing is saved', async () => {
    expect(await getChosenRecipes('2026-05-08')).toEqual({});
  });

  it('persists a chosen recipe per meal type', async () => {
    await setChosenRecipe('2026-05-08', 'lunch', snapshot);
    const stored = await getChosenRecipes('2026-05-08');
    expect(stored.lunch?.title).toBe('Chicken & brown rice bowl');
  });

  it('overrides an existing chosen recipe for the same slot', async () => {
    await setChosenRecipe('2026-05-08', 'lunch', snapshot);
    await setChosenRecipe('2026-05-08', 'lunch', {
      ...snapshot,
      title: 'New pick',
    });
    const stored = await getChosenRecipes('2026-05-08');
    expect(stored.lunch?.title).toBe('New pick');
  });

  it('clearChosenRecipe removes a single slot only', async () => {
    await setChosenRecipe('2026-05-08', 'lunch', snapshot);
    await setChosenRecipe('2026-05-08', 'dinner', {
      ...snapshot,
      mealType: 'dinner',
      recipeId: 'internal:turkey_meatballs_dinner',
      title: 'Turkey meatballs',
    });
    await clearChosenRecipe('2026-05-08', 'lunch');
    const stored = await getChosenRecipes('2026-05-08');
    expect(stored.lunch).toBeUndefined();
    expect(stored.dinner?.title).toBe('Turkey meatballs');
  });

  it('clearChosenRecipesForDay removes everything for the day', async () => {
    await setChosenRecipe('2026-05-08', 'lunch', snapshot);
    await clearChosenRecipesForDay('2026-05-08');
    expect(await getChosenRecipes('2026-05-08')).toEqual({});
  });

  it('day rollover keeps yesterday choices isolated', async () => {
    await setChosenRecipe('2026-05-08', 'lunch', snapshot);
    expect(await getChosenRecipes('2026-05-09')).toEqual({});
  });
});
