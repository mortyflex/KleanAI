import {
  MEAL_CATALOG,
  getDailyMealPlan,
  getMealSuggestions,
} from '../../src/features/nutrition/utils/meal-suggestions';

describe('getMealSuggestions — filtering', () => {
  it('returns the full catalog for a user with no restrictions and no type filter', () => {
    expect(getMealSuggestions()).toHaveLength(MEAL_CATALOG.length);
  });

  it('hides meals that conflict with the user\'s dietary restrictions', () => {
    const vegan = getMealSuggestions({ restrictions: ['vegan'] });
    expect(vegan.every((m) => !m.conflictsWith.includes('vegan'))).toBe(true);
    expect(
      vegan.find((m) => m.id === 'chicken_rice_bowl'),
    ).toBeUndefined();
  });

  it('keeps vegan-compatible meals visible for vegan users', () => {
    const vegan = getMealSuggestions({ restrictions: ['vegan'] });
    expect(vegan.find((m) => m.id === 'tofu_scramble')).toBeDefined();
    expect(vegan.find((m) => m.id === 'lentil_quinoa_salad')).toBeDefined();
    expect(vegan.find((m) => m.id === 'fruit_almonds')).toBeDefined();
  });

  it('combines multiple restrictions with AND semantics', () => {
    const veganGF = getMealSuggestions({ restrictions: ['vegan', 'gluten_free'] });
    for (const meal of veganGF) {
      expect(meal.conflictsWith).not.toContain('vegan');
      expect(meal.conflictsWith).not.toContain('gluten_free');
    }
    expect(veganGF.find((m) => m.id === 'oatmeal_berries')).toBeUndefined();
    expect(veganGF.find((m) => m.id === 'eggs_avocado_toast')).toBeUndefined();
  });

  it('respects the meal type filter', () => {
    const breakfast = getMealSuggestions({ type: 'breakfast' });
    expect(breakfast.every((m) => m.type === 'breakfast')).toBe(true);
  });

  it('respects the limit when filtering by type', () => {
    const breakfast = getMealSuggestions({ type: 'breakfast', limit: 2 });
    expect(breakfast.length).toBeLessThanOrEqual(2);
  });

  it('hides lactose-containing meals for lactose_free users', () => {
    const lactoseFree = getMealSuggestions({ restrictions: ['lactose_free'] });
    expect(
      lactoseFree.find((m) => m.id === 'greek_yogurt_bowl'),
    ).toBeUndefined();
    expect(
      lactoseFree.find((m) => m.id === 'cottage_cheese_fruit'),
    ).toBeUndefined();
  });
});

describe('getDailyMealPlan', () => {
  it('returns one suggestion for each of the four meal types', () => {
    const plan = getDailyMealPlan();
    expect(plan.breakfast).not.toBeNull();
    expect(plan.lunch).not.toBeNull();
    expect(plan.dinner).not.toBeNull();
    expect(plan.snack).not.toBeNull();
  });

  it('returns null for a meal type when restrictions exclude every option', () => {
    // None of our breakfasts are gluten_free + vegan + lactose_free at once
    // EXCEPT tofu_scramble. So the daily plan should still return tofu_scramble
    // for breakfast even with restrictive combos.
    const plan = getDailyMealPlan(['vegan', 'gluten_free', 'lactose_free']);
    expect(plan.breakfast?.id).toBe('tofu_scramble');
    expect(plan.lunch?.id).toBe('lentil_quinoa_salad');
    expect(plan.dinner?.id).toBe('chickpea_curry');
  });

  it('falls back to the first compatible suggestion deterministically', () => {
    const a = getDailyMealPlan(['vegetarian']);
    const b = getDailyMealPlan(['vegetarian']);
    expect(a.breakfast?.id).toBe(b.breakfast?.id);
    expect(a.lunch?.id).toBe(b.lunch?.id);
    expect(a.dinner?.id).toBe(b.dinner?.id);
  });
});

describe('MEAL_CATALOG — invariants', () => {
  it('every meal has a translation key for title and body', () => {
    for (const m of MEAL_CATALOG) {
      expect(m.titleKey).toMatch(/^nutrition\.suggestions\.meals\./);
      expect(m.bodyKey).toMatch(/^nutrition\.suggestions\.meals\./);
    }
  });

  it('every meal has positive kcal and non-negative macros', () => {
    for (const m of MEAL_CATALOG) {
      expect(m.approxKcal).toBeGreaterThan(0);
      expect(m.approxProteinG).toBeGreaterThanOrEqual(0);
      expect(m.approxCarbsG).toBeGreaterThanOrEqual(0);
      expect(m.approxFatG).toBeGreaterThanOrEqual(0);
    }
  });
});
