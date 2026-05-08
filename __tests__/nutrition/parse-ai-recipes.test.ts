import { parseAIRecipesResponse } from '../../src/features/nutrition/utils/parse-ai-recipes';

const validRecipe = {
  title: 'Chicken & quinoa bowl',
  description: 'A quick bowl combining chicken with quinoa and steamed greens.',
  ingredientLabels: ['Chicken breast', 'Quinoa', 'Spinach'],
  steps: ['Cook the quinoa', 'Grill the chicken', 'Combine and serve'],
  prepTimeMinutes: 25,
  difficulty: 'easy' as const,
  estimatedCalories: 540,
  estimatedProteinG: 42,
  estimatedCarbsG: 50,
  estimatedFatG: 16,
  tags: ['high_protein', 'quick'],
};

describe('parseAIRecipesResponse — happy path', () => {
  it('accepts a valid object payload', () => {
    const result = parseAIRecipesResponse({
      schemaVersion: '1',
      recipes: [validRecipe],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.recipes).toHaveLength(1);
      expect(result.data.recipes[0].title).toBe('Chicken & quinoa bowl');
    }
  });

  it('accepts a valid JSON string payload', () => {
    const result = parseAIRecipesResponse(
      JSON.stringify({ schemaVersion: '1', recipes: [validRecipe] }),
    );
    expect(result.ok).toBe(true);
  });

  it('preserves modelNotes', () => {
    const result = parseAIRecipesResponse({
      schemaVersion: '1',
      recipes: [validRecipe],
      modelNotes: 'mock',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.modelNotes).toBe('mock');
  });
});

describe('parseAIRecipesResponse — invalid inputs', () => {
  it('rejects a non-JSON string as invalid_json', () => {
    const result = parseAIRecipesResponse('not-json{');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_json');
  });

  it('rejects an unknown schemaVersion', () => {
    const result = parseAIRecipesResponse({
      schemaVersion: '2',
      recipes: [validRecipe],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_schema');
  });

  it('rejects a recipe with missing required fields', () => {
    const { steps: _omitted, ...rest } = validRecipe;
    const result = parseAIRecipesResponse({
      schemaVersion: '1',
      recipes: [rest],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_schema');
  });

  it('rejects out-of-range calorie values', () => {
    const result = parseAIRecipesResponse({
      schemaVersion: '1',
      recipes: [{ ...validRecipe, estimatedCalories: 99999 }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an unknown difficulty value', () => {
    const result = parseAIRecipesResponse({
      schemaVersion: '1',
      recipes: [{ ...validRecipe, difficulty: 'expert' }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects null and undefined gracefully', () => {
    expect(parseAIRecipesResponse(null).ok).toBe(false);
    expect(parseAIRecipesResponse(undefined).ok).toBe(false);
  });
});
