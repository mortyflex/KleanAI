import {
  getDailyMealPlanWithFridge,
  getFridgeAwareSuggestions,
  scoreMealAgainstFridge,
  MEAL_CATALOG,
} from '../../src/features/nutrition/utils/meal-suggestions';

describe('scoreMealAgainstFridge', () => {
  const chickenRiceBowl = MEAL_CATALOG.find((m) => m.id === 'chicken_rice_bowl')!;
  const tofuStirFry = MEAL_CATALOG.find((m) => m.id === 'tofu_stir_fry')!;

  it('returns 0 when the meal has no ingredient ids declared', () => {
    const meal = { ...chickenRiceBowl, ingredientIds: undefined };
    expect(
      scoreMealAgainstFridge(meal, new Set(['chicken_breast'])),
    ).toBe(0);
  });

  it('counts the number of meal ingredients found in the fridge', () => {
    expect(
      scoreMealAgainstFridge(
        chickenRiceBowl,
        new Set(['chicken_breast', 'brown_rice']),
      ),
    ).toBe(2);
  });

  it('returns 0 when no overlap exists', () => {
    expect(
      scoreMealAgainstFridge(tofuStirFry, new Set(['salmon', 'apple'])),
    ).toBe(0);
  });
});

describe('getFridgeAwareSuggestions', () => {
  it('biases the order toward meals that match the fridge', () => {
    const result = getFridgeAwareSuggestions({
      ingredientIds: ['salmon', 'sweet_potato'],
      type: 'lunch',
      limit: 4,
    });
    expect(result[0].id).toBe('salmon_sweet_potato');
  });

  it('still applies dietary restrictions over fridge matches', () => {
    // User is vegan but has chicken in the fridge — chicken_rice_bowl must
    // not surface because it conflicts with the vegan restriction.
    const result = getFridgeAwareSuggestions({
      ingredientIds: ['chicken_breast', 'brown_rice', 'broccoli'],
      restrictions: ['vegan'],
      type: 'lunch',
      limit: 4,
    });
    expect(result.find((m) => m.id === 'chicken_rice_bowl')).toBeUndefined();
  });

  it('falls back to catalog order when no fridge data is provided', () => {
    const result = getFridgeAwareSuggestions({
      ingredientIds: [],
      type: 'lunch',
      limit: 4,
    });
    // First catalog lunch entry is chicken_rice_bowl.
    expect(result[0].id).toBe('chicken_rice_bowl');
  });

  it('without a type filter returns all eligible meals sorted by score then catalog order', () => {
    const result = getFridgeAwareSuggestions({
      ingredientIds: ['eggs', 'avocado'],
    });
    // eggs_avocado_toast scores 2 and should outrank meals that score 0.
    expect(result[0].id).toBe('eggs_avocado_toast');
  });
});

describe('getDailyMealPlanWithFridge', () => {
  it('picks the best-scoring meal per type', () => {
    const plan = getDailyMealPlanWithFridge([
      'salmon',
      'sweet_potato',
      'spinach',
      'eggs',
      'avocado',
    ]);
    expect(plan.lunch?.id).toBe('salmon_sweet_potato');
    expect(plan.breakfast?.id).toBe('eggs_avocado_toast');
  });

  it('falls back to catalog order for meal types with no overlap', () => {
    const plan = getDailyMealPlanWithFridge(['salmon']);
    // No overlap for breakfast — falls back to first compatible catalog entry.
    expect(plan.breakfast?.id).toBe('oatmeal_berries');
  });

  it('respects dietary restrictions when picking', () => {
    const plan = getDailyMealPlanWithFridge(
      ['chicken_breast', 'lentils', 'quinoa'],
      ['vegan'],
    );
    // The chicken bowl scores higher but is filtered out by the vegan
    // restriction, so the best vegan-compatible match wins instead.
    expect(plan.lunch?.id).toBe('lentil_quinoa_salad');
  });

  it('with empty ingredient list behaves like the standard daily plan', () => {
    const plan = getDailyMealPlanWithFridge([]);
    expect(plan.breakfast?.id).toBe('oatmeal_berries');
    expect(plan.lunch?.id).toBe('chicken_rice_bowl');
  });
});

describe('MEAL_CATALOG — ingredient ids invariant', () => {
  it('every declared ingredient id is a non-empty string', () => {
    for (const meal of MEAL_CATALOG) {
      if (!meal.ingredientIds) continue;
      for (const id of meal.ingredientIds) {
        expect(id.length).toBeGreaterThan(0);
      }
    }
  });
});
