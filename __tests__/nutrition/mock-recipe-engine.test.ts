import { buildMockRecipeResponse } from '../../src/lib/ai/mock-recipe-suggestions';
import type { AIRecipeRequest } from '../../src/types/ai.types';

const baseReq = (
  override: Partial<AIRecipeRequest> = {},
): AIRecipeRequest => ({
  promptVersion: 'recipe-suggestions/v1',
  mappedIngredientIds: [],
  mappedIngredientLabels: [],
  unmappedIngredientLabels: [],
  goal: 'maintain',
  restrictions: [],
  mealType: 'lunch',
  desiredCount: 1,
  language: 'en',
  ...override,
});

describe('buildMockRecipeResponse — culinary pattern engine', () => {
  it('returns a savory bowl when protein + carb + veg are available', () => {
    const res = buildMockRecipeResponse(
      baseReq({
        mappedIngredientIds: ['chicken_breast', 'brown_rice', 'broccoli'],
        mappedIngredientLabels: ['Chicken breast', 'Brown rice', 'Broccoli'],
      }),
    );
    expect(res.recipes).toHaveLength(1);
    const recipe = res.recipes[0];
    expect(recipe.title.toLowerCase()).toMatch(/chicken|bowl/);
    // Localized labels are used in the steps and ingredient list — never raw ids.
    const haystack = [
      recipe.title,
      recipe.description,
      ...recipe.ingredientLabels,
      ...recipe.steps,
    ].join(' ');
    // No raw catalog id (always snake_case with underscore) leaks into UI text.
    expect(haystack).not.toMatch(/chicken_breast|brown_rice/);
    expect(haystack).toMatch(/Chicken breast/);
  });

  it('returns nothing when ingredients cannot combine sensibly (only yogurt)', () => {
    const res = buildMockRecipeResponse(
      baseReq({
        mappedIngredientIds: ['greek_yogurt'],
        mappedIngredientLabels: ['Greek yogurt'],
      }),
    );
    expect(res.recipes).toHaveLength(0);
  });

  it('uses unmapped sauce-like labels as accents — never as primary ingredients', () => {
    const res = buildMockRecipeResponse(
      baseReq({
        mappedIngredientIds: ['chicken_breast', 'brown_rice', 'broccoli'],
        mappedIngredientLabels: ['Chicken breast', 'Brown rice', 'Broccoli'],
        unmappedIngredientLabels: ['Ketchup'],
      }),
    );
    expect(res.recipes).toHaveLength(1);
    const recipe = res.recipes[0];
    const labels = recipe.ingredientLabels.join(', ');
    // Ketchup appears (accent) but doesn't dominate the recipe title.
    expect(labels).toMatch(/Ketchup/);
    expect(recipe.title).not.toMatch(/Ketchup/i);
  });

  it('returns nothing when only unmapped sauces are confirmed (no real food)', () => {
    const res = buildMockRecipeResponse(
      baseReq({
        unmappedIngredientLabels: ['Ketchup', 'Vinaigre balsamique'],
      }),
    );
    expect(res.recipes).toHaveLength(0);
  });

  it('returns a yogurt bowl for breakfast when dairy + fruit are available', () => {
    const res = buildMockRecipeResponse(
      baseReq({
        mealType: 'breakfast',
        mappedIngredientIds: ['greek_yogurt', 'berries'],
        mappedIngredientLabels: ['Greek yogurt', 'Berries'],
      }),
    );
    expect(res.recipes).toHaveLength(1);
    const recipe = res.recipes[0];
    expect(recipe.title.toLowerCase()).toMatch(/yogurt|berries|bowl/);
    expect(recipe.steps.join(' ')).not.toMatch(/greek_yogurt/);
  });

  it('writes recipe text in French when language is fr', () => {
    const res = buildMockRecipeResponse(
      baseReq({
        mealType: 'breakfast',
        mappedIngredientIds: ['greek_yogurt', 'berries'],
        mappedIngredientLabels: ['Yaourt grec', 'Fruits rouges'],
        language: 'fr',
      }),
    );
    expect(res.recipes).toHaveLength(1);
    const recipe = res.recipes[0];
    // Some clearly-French copy should appear in either the steps or description.
    const haystack = [
      recipe.description,
      ...recipe.steps,
    ].join(' ').toLowerCase();
    expect(haystack).toMatch(/(garnis|verse|sers|cuis|frais)/);
  });

  it('returns nothing for snack when only oats are present', () => {
    const res = buildMockRecipeResponse(
      baseReq({
        mealType: 'snack',
        mappedIngredientIds: ['oats'],
        mappedIngredientLabels: ['Oats'],
      }),
    );
    expect(res.recipes).toHaveLength(0);
  });
});
