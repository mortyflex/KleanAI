import type { FridgeVisionResponseRaw } from '../../types/ai.types';

/**
 * Deterministic mock response for the Fridge Vision feature. Used until a
 * real Gemini key is wired up — keeps the rest of the pipeline (parser,
 * mapper, confirmation UI, meal suggestion adaptation) testable without any
 * network call.
 *
 * The labels intentionally include a low-confidence entry and an unmappable
 * one so the threshold + mapping logic exercise their full surface.
 */
export const MOCK_FRIDGE_VISION_RESPONSE: FridgeVisionResponseRaw = {
  schemaVersion: '1',
  detected: [
    {
      label: 'Chicken breast',
      confidence: 0.93,
      category: 'protein_meat',
      aliases: ['poulet', 'chicken'],
      quantity: { amount: 2, unit: 'piece' },
      suggestedInternalId: 'chicken_breast',
    },
    {
      label: 'Greek yogurt',
      confidence: 0.9,
      category: 'protein_dairy',
      aliases: ['yaourt grec'],
      quantity: { amount: 500, unit: 'g' },
      suggestedInternalId: 'greek_yogurt',
    },
    {
      label: 'Eggs',
      confidence: 0.88,
      category: 'protein_egg',
      aliases: ['oeufs', 'œufs'],
      quantity: { amount: 6, unit: 'piece' },
      suggestedInternalId: 'eggs',
    },
    {
      label: 'Spinach',
      confidence: 0.84,
      category: 'vegetable',
      aliases: ['épinards'],
      suggestedInternalId: 'spinach',
    },
    {
      label: 'Brown rice',
      confidence: 0.82,
      category: 'carb_grain',
      aliases: ['riz complet'],
      suggestedInternalId: 'brown_rice',
    },
    {
      label: 'Olive oil',
      confidence: 0.79,
      category: 'fat_oil',
      aliases: ["huile d'olive"],
      suggestedInternalId: 'olive_oil',
    },
    {
      label: 'Bananas',
      confidence: 0.74,
      category: 'fruit',
      aliases: ['bananes'],
      quantity: { amount: 3, unit: 'piece' },
      suggestedInternalId: 'banana',
    },
    // Below the default 0.6 threshold — should be filtered out.
    {
      label: 'Mystery sauce',
      confidence: 0.41,
      uncertaintyNote: 'Unclear label, partially obscured.',
    },
    // Above the threshold but absent from the catalog — surfaces as an
    // "unmapped" item so the user can confirm it for the AI recipe generator.
    {
      label: 'Ketchup',
      confidence: 0.78,
      category: 'condiment',
      aliases: ['sauce ketchup'],
    },
  ],
  modelNotes: 'Mock response — no real model was called.',
};
