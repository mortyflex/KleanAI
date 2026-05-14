import type { GymVisionResponseRaw } from '../../types/ai.types';

/**
 * Deterministic mock response for the Gym Vision feature. Used until a real
 * Gemini key is wired up — keeps the rest of the pipeline (parser, mapper,
 * confirmation UI, workout filtering) testable without any network call.
 *
 * The labels intentionally include a low-confidence entry and an unmappable
 * one so the threshold + mapping logic exercise their full surface.
 */
export const MOCK_GYM_VISION_RESPONSE: GymVisionResponseRaw = {
  schemaVersion: '1',
  detected: [
    {
      label: 'Barbell rack',
      confidence: 0.94,
      aliases: ['squat rack', 'power rack'],
      suggestedInternalId: 'barbell',
    },
    {
      label: 'Adjustable dumbbells',
      confidence: 0.91,
      aliases: ['dumbbells', 'haltères'],
      suggestedInternalId: 'dumbbell',
    },
    {
      label: 'Cable crossover',
      confidence: 0.87,
      aliases: ['cable machine', 'pulley'],
      suggestedInternalId: 'cable',
    },
    {
      label: 'Leg press machine',
      confidence: 0.82,
      aliases: ['horizontal leg press'],
      suggestedInternalId: 'machine',
    },
    {
      label: 'Pull-up bar',
      confidence: 0.78,
      aliases: ['chin-up bar'],
      suggestedInternalId: 'pull_up_bar',
    },
    // Below the default 0.6 threshold — should be filtered out.
    {
      label: 'Foam roller',
      confidence: 0.42,
    },
    // Unknown-to-us label without a suggested mapping — must be dropped.
    {
      label: 'Decorative plant',
      confidence: 0.99,
    },
  ],
  modelNotes: 'Mock response — no real model was called.',
};
