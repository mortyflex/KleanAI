import type { FridgeVisionResponseRaw } from '../../types/ai.types';

/**
 * Builds a deterministic mock fridge response in the user's language. Used
 * by `MockAIProvider.analyzeFridgeImages` so the dev/test flow exercises the
 * same locale-aware path as the real Gemini edge function.
 *
 * The labels intentionally include a low-confidence entry and an
 * above-threshold-but-unmapped one so the threshold + partition logic
 * exercise their full surface.
 */
export function buildMockFridgeResponse(
  locale?: string,
): FridgeVisionResponseRaw {
  const isFr = (locale ?? 'en').toLowerCase().startsWith('fr');

  return {
    schemaVersion: '1',
    detected: [
      {
        label: isFr ? 'Blanc de poulet' : 'Chicken breast',
        confidence: 0.93,
        category: 'protein_meat',
        aliases: isFr ? ['poulet'] : ['chicken'],
        quantity: { amount: 2, unit: 'piece' },
        suggestedInternalId: 'chicken_breast',
      },
      {
        label: isFr ? 'Yaourt grec' : 'Greek yogurt',
        confidence: 0.9,
        category: 'protein_dairy',
        aliases: isFr ? ['yaourt'] : ['greek yoghurt'],
        quantity: { amount: 500, unit: 'g' },
        suggestedInternalId: 'greek_yogurt',
      },
      {
        label: isFr ? 'Œufs' : 'Eggs',
        confidence: 0.88,
        category: 'protein_egg',
        aliases: isFr ? ['oeufs'] : ['egg'],
        quantity: { amount: 6, unit: 'piece' },
        suggestedInternalId: 'eggs',
      },
      {
        label: isFr ? 'Épinards' : 'Spinach',
        confidence: 0.84,
        category: 'vegetable',
        aliases: isFr ? ['epinards'] : ['baby spinach'],
        suggestedInternalId: 'spinach',
      },
      {
        label: isFr ? 'Riz complet' : 'Brown rice',
        confidence: 0.82,
        category: 'carb_grain',
        aliases: isFr ? ['riz brun'] : ['rice'],
        suggestedInternalId: 'brown_rice',
      },
      {
        label: isFr ? "Huile d'olive" : 'Olive oil',
        confidence: 0.79,
        category: 'fat_oil',
        aliases: isFr ? ['huile'] : ['olive'],
        suggestedInternalId: 'olive_oil',
      },
      {
        label: isFr ? 'Bananes' : 'Bananas',
        confidence: 0.74,
        category: 'fruit',
        aliases: isFr ? ['banane'] : ['banana'],
        quantity: { amount: 3, unit: 'piece' },
        suggestedInternalId: 'banana',
      },
      // Below the default 0.6 threshold — should be filtered out.
      {
        label: isFr ? 'Sauce mystère' : 'Mystery sauce',
        confidence: 0.41,
        uncertaintyNote: isFr
          ? 'Étiquette partiellement masquée.'
          : 'Unclear label, partially obscured.',
      },
      // Above the threshold but absent from the catalog — surfaces as an
      // "unmapped" item so the user can confirm it for the AI recipe generator.
      {
        label: isFr ? 'Ketchup' : 'Ketchup',
        confidence: 0.78,
        category: 'condiment',
        aliases: isFr ? ['sauce ketchup'] : ['tomato ketchup'],
      },
    ],
    modelNotes: 'Mock response — no real model was called.',
  };
}

/**
 * Backward-compat default — used by existing tests that import the static
 * fixture. Defaults to English to preserve the previous test contracts.
 */
export const MOCK_FRIDGE_VISION_RESPONSE: FridgeVisionResponseRaw =
  buildMockFridgeResponse('en');
