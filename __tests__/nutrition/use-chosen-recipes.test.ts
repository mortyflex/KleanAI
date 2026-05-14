import { buildChosenRecipeSnapshot } from '../../src/features/nutrition/hooks/useChosenRecipes';
import type {
  AIGeneratedRecipe,
  InternalRecipe,
} from '../../src/types/recipe.types';

const aiRecipe: AIGeneratedRecipe = {
  id: 'ai:breakfast:0:abc',
  source: 'ai',
  mealType: 'breakfast',
  title: 'Yogurt & berries bowl',
  description: 'Creamy, quick, high-protein.',
  ingredientLabels: ['200 g greek yogurt', '80 g berries'],
  prepTimeMinutes: 5,
  difficulty: 'easy',
  estimatedCalories: 240,
  estimatedProteinG: 20,
  estimatedCarbsG: 22,
  estimatedFatG: 6,
  steps: ['Mix everything.'],
  tags: ['high_protein', 'quick'],
};

const internalRecipe: InternalRecipe = {
  id: 'chicken_rice_lunch',
  source: 'internal',
  mealType: 'lunch',
  titleKey: 'nutrition.recipes.items.chicken_rice_lunch.title',
  descriptionKey: 'nutrition.recipes.items.chicken_rice_lunch.description',
  ingredientIds: ['chicken_breast', 'brown_rice'],
  prepTimeMinutes: 22,
  difficulty: 'easy',
  estimatedCalories: 580,
  estimatedProteinG: 44,
  estimatedCarbsG: 62,
  estimatedFatG: 14,
  stepKeys: [],
  tags: ['high_protein'],
  compatibleGoals: ['recomposition'],
  dietaryRestrictionsCompatibility: [],
};

const resolveLabel = (key: string) => `resolved:${key}`;

describe('buildChosenRecipeSnapshot — fridge fingerprint', () => {
  it('stores the fridge fingerprint on an AI snapshot', () => {
    const snapshot = buildChosenRecipeSnapshot(aiRecipe, resolveLabel, 'fp-123');
    expect(snapshot.source).toBe('ai');
    expect(snapshot.fridgeFingerprint).toBe('fp-123');
  });

  it('stores the fridge fingerprint on an internal snapshot', () => {
    const snapshot = buildChosenRecipeSnapshot(
      internalRecipe,
      resolveLabel,
      'fp-456',
    );
    expect(snapshot.source).toBe('internal');
    expect(snapshot.title).toBe(
      'resolved:nutrition.recipes.items.chicken_rice_lunch.title',
    );
    expect(snapshot.fridgeFingerprint).toBe('fp-456');
  });

  it('leaves the fingerprint undefined when none is provided', () => {
    const snapshot = buildChosenRecipeSnapshot(aiRecipe, resolveLabel);
    expect(snapshot.fridgeFingerprint).toBeUndefined();
  });
});
