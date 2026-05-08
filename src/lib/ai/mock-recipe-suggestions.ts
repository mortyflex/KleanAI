import type {
  AIRecipeRequest,
  AIRecipesResponseRaw,
} from '../../types/ai.types';

/**
 * Deterministic mock for `generateRecipeSuggestions`. Used by `MockAIProvider`
 * and by tests that exercise the hybrid path without hitting Gemini.
 *
 * The mock returns one or two simple recipes shaped around the requested
 * meal type and goal — enough to exercise the validation + restriction
 * filter paths.
 */
export function buildMockRecipeResponse(
  req: AIRecipeRequest,
): AIRecipesResponseRaw {
  const { mealType, goal, desiredCount } = req;
  const isFr = (req.language ?? 'en').toLowerCase().startsWith('fr');

  const titlesByMeal: Record<typeof mealType, string> = isFr
    ? {
        breakfast: 'Bol express protéiné',
        lunch: 'Bol fusion frigo',
        dinner: 'Assiette du soir simple',
        snack: 'Mini en-cas malin',
      }
    : {
        breakfast: 'Express protein bowl',
        lunch: 'Fridge fusion bowl',
        dinner: 'Simple evening plate',
        snack: 'Smart mini snack',
      };

  const description = isFr
    ? "Idée rapide pensée à partir de ce que tu as confirmé dans ton frigo."
    : 'A quick idea built from what you just confirmed in your fridge.';

  const baseIngredients = [
    ...req.mappedIngredientIds.slice(0, 3),
    ...req.unmappedIngredientLabels.slice(0, 2),
  ];

  const steps = isFr
    ? [
        "Rassemble les ingrédients confirmés dans ton frigo.",
        'Combine-les chaud ou froid selon ton envie.',
        'Assaisonne légèrement et savoure.',
      ]
    : [
        'Gather the ingredients you confirmed in your fridge.',
        'Combine them hot or cold depending on your mood.',
        'Season lightly and enjoy.',
      ];

  const baseKcal = mealType === 'snack' ? 220 : mealType === 'breakfast' ? 380 : 500;
  const kcal = goal === 'gain_muscle' ? baseKcal + 80 : baseKcal;
  const proteinG =
    goal === 'gain_muscle'
      ? Math.round(kcal * 0.27 / 4)
      : Math.round(kcal * 0.22 / 4);

  const recipes = Array.from({ length: Math.min(desiredCount, 2) }, (_, i) => ({
    title: `${titlesByMeal[mealType]} #${i + 1}`,
    description,
    ingredientLabels:
      baseIngredients.length > 0
        ? baseIngredients
        : isFr
          ? ['ingrédient au choix']
          : ['ingredient of your choice'],
    steps,
    prepTimeMinutes: mealType === 'snack' ? 3 : 12,
    difficulty: 'easy' as const,
    estimatedCalories: kcal,
    estimatedProteinG: proteinG,
    estimatedCarbsG: Math.round((kcal * 0.45) / 4),
    estimatedFatG: Math.round((kcal * 0.3) / 9),
    tags:
      goal === 'gain_muscle'
        ? ['high_protein', 'mass_gain', 'quick']
        : goal === 'lose_weight'
          ? ['low_calorie', 'high_protein', 'quick']
          : ['quick', 'high_protein'],
  }));

  return {
    schemaVersion: '1',
    recipes,
    modelNotes: 'mock recipe response — no real model call',
  };
}
