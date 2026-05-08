import { RECIPE_CATALOG } from '../../src/features/nutrition/data/recipe-catalog';
import {
  filterRecipesByRestrictions,
  getFullDayRecipePlan,
  getRecipesForMealType,
  MAX_RECIPES_PER_MEAL_TYPE,
  rankRecipesForGoal,
  scoreRecipeAgainstFridge,
} from '../../src/features/nutrition/utils/recipe-engine';

describe('scoreRecipeAgainstFridge — required + optional ingredients', () => {
  const chickenRice = RECIPE_CATALOG.find(
    (r) => r.id === 'chicken_rice_lunch',
  )!;

  it('rewards recipes whose required ingredients are in the fridge', () => {
    const fullMatch = scoreRecipeAgainstFridge(chickenRice, {
      available: new Set(['chicken_breast', 'brown_rice', 'broccoli']),
      unmappedCategories: new Set(),
    });
    const noMatch = scoreRecipeAgainstFridge(chickenRice, {
      available: new Set(['apple']),
      unmappedCategories: new Set(),
    });
    expect(fullMatch.score).toBeGreaterThan(noMatch.score);
    expect(fullMatch.matchedIngredientIds.length).toBe(3);
    expect(fullMatch.missingIngredientIds.length).toBe(0);
  });

  it('counts optional ingredients as a small bonus, never as missing', () => {
    const withOptional = scoreRecipeAgainstFridge(chickenRice, {
      available: new Set([
        'chicken_breast',
        'brown_rice',
        'broccoli',
        'olive_oil',
      ]),
      unmappedCategories: new Set(),
    });
    const withoutOptional = scoreRecipeAgainstFridge(chickenRice, {
      available: new Set(['chicken_breast', 'brown_rice', 'broccoli']),
      unmappedCategories: new Set(),
    });
    expect(withOptional.score).toBeGreaterThan(withoutOptional.score);
    // Optional ingredients are not surfaced as "missing".
    expect(withOptional.missingIngredientIds).toEqual([]);
  });

  it('flags recipes as a good fridge match above a 60% threshold', () => {
    const result = scoreRecipeAgainstFridge(chickenRice, {
      available: new Set(['chicken_breast', 'brown_rice']),
      unmappedCategories: new Set(),
    });
    expect(result.goodFridgeMatch).toBe(true);
  });

  it('does NOT flag a good fridge match when most ingredients are missing', () => {
    const result = scoreRecipeAgainstFridge(chickenRice, {
      available: new Set(['chicken_breast']),
      unmappedCategories: new Set(),
    });
    expect(result.goodFridgeMatch).toBe(false);
  });
});

describe('filterRecipesByRestrictions — hard exclusion', () => {
  it('excludes any recipe whose compatibility list omits a user restriction', () => {
    const result = filterRecipesByRestrictions(RECIPE_CATALOG, ['vegan']);
    for (const recipe of result) {
      expect(recipe.dietaryRestrictionsCompatibility).toContain('vegan');
    }
    // Sanity — at least one chicken recipe should be filtered out.
    expect(result.find((r) => r.id === 'chicken_rice_lunch')).toBeUndefined();
  });

  it('returns the full list when the user has no restrictions', () => {
    const result = filterRecipesByRestrictions(RECIPE_CATALOG, []);
    expect(result.length).toBe(RECIPE_CATALOG.length);
  });

  it('combines multiple restrictions', () => {
    const result = filterRecipesByRestrictions(RECIPE_CATALOG, [
      'vegan',
      'gluten_free',
    ]);
    for (const recipe of result) {
      expect(recipe.dietaryRestrictionsCompatibility).toContain('vegan');
      expect(recipe.dietaryRestrictionsCompatibility).toContain('gluten_free');
    }
  });
});

describe('rankRecipesForGoal — goal alignment', () => {
  it('biases weight_loss toward low-calorie / lighter recipes', () => {
    const result = rankRecipesForGoal({
      ingredientIds: [],
      goal: 'lose_weight',
      mealType: 'lunch',
      limit: 5,
    });
    const top = result[0]?.recipe;
    expect(top).toBeDefined();
    if (top && top.source === 'internal') {
      expect(top.estimatedCalories).toBeLessThanOrEqual(540);
    }
  });

  it('biases gain_muscle toward higher-calorie / mass_gain-tagged recipes', () => {
    const result = rankRecipesForGoal({
      ingredientIds: [],
      goal: 'gain_muscle',
      mealType: 'lunch',
      limit: 5,
    });
    const top = result[0]?.recipe;
    expect(top).toBeDefined();
    if (top && top.source === 'internal') {
      // The top muscle-gain pick should be one of the higher-calorie lunches
      // and should never be tagged low_calorie.
      expect(top.tags.includes('low_calorie')).toBe(false);
    }
  });

  it('caps the result to MAX_RECIPES_PER_MEAL_TYPE by default', () => {
    const result = rankRecipesForGoal({
      ingredientIds: [],
      goal: 'maintain',
      mealType: 'lunch',
    });
    expect(result.length).toBeLessThanOrEqual(MAX_RECIPES_PER_MEAL_TYPE);
  });
});

describe('getRecipesForMealType — per-mealType cap', () => {
  it('returns at most 3 results for any meal type', () => {
    for (const mealType of ['breakfast', 'lunch', 'dinner', 'snack'] as const) {
      const matches = getRecipesForMealType(mealType, {
        ingredientIds: [],
        goal: 'maintain',
      });
      expect(matches.length).toBeLessThanOrEqual(MAX_RECIPES_PER_MEAL_TYPE);
    }
  });

  it('does NOT return any recipe that violates a dietary restriction', () => {
    const matches = getRecipesForMealType('lunch', {
      ingredientIds: ['chicken_breast', 'brown_rice'],
      restrictions: ['vegan'],
      goal: 'maintain',
    });
    for (const match of matches) {
      if (match.recipe.source === 'internal') {
        expect(match.recipe.dietaryRestrictionsCompatibility).toContain('vegan');
      }
    }
  });
});

describe('getFullDayRecipePlan — one slot per meal type', () => {
  it('returns one recipe match for each of the four slots', () => {
    const plan = getFullDayRecipePlan({
      ingredientIds: ['eggs', 'chicken_breast', 'brown_rice', 'broccoli'],
      goal: 'maintain',
      restrictions: [],
      targetDailyKcal: 2200,
    });
    expect(plan.breakfast?.recipe).toBeDefined();
    expect(plan.lunch?.recipe).toBeDefined();
    expect(plan.dinner?.recipe).toBeDefined();
    expect(plan.snack?.recipe).toBeDefined();
  });

  it('respects vegan restriction across every slot', () => {
    const plan = getFullDayRecipePlan({
      ingredientIds: ['chicken_breast'],
      goal: 'maintain',
      restrictions: ['vegan'],
    });
    for (const slot of ['breakfast', 'lunch', 'dinner', 'snack'] as const) {
      const recipe = plan[slot]?.recipe;
      if (recipe && recipe.source === 'internal') {
        expect(recipe.dietaryRestrictionsCompatibility).toContain('vegan');
      }
    }
  });
});
