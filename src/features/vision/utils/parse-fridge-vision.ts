import { z } from 'zod';
import type {
  FridgeVisionResponseRaw,
  DetectedIngredientRaw,
} from '../../../types/ai.types';

/**
 * Strict JSON schema for the Fridge Vision response. AI output is never
 * trusted directly — every payload goes through this validator first.
 * Anything that fails parsing is treated as "AI failed" and the UI falls
 * back to a graceful empty state.
 */
const ingredientCategorySchema = z.enum([
  'protein_meat',
  'protein_fish',
  'protein_egg',
  'protein_dairy',
  'protein_plant',
  'carb_grain',
  'carb_starchy',
  'vegetable',
  'fruit',
  'fat_oil',
  'condiment',
  'beverage',
  'other',
]);

const ingredientQuantityUnitSchema = z.enum([
  'piece',
  'pack',
  'bottle',
  'jar',
  'g',
  'ml',
  'unknown',
]);

export const detectedIngredientSchema = z.object({
  label: z.string().min(1),
  confidence: z.number().min(0).max(1),
  category: ingredientCategorySchema.optional(),
  aliases: z.array(z.string().min(1)).optional(),
  quantity: z
    .object({
      amount: z.number().nonnegative(),
      unit: ingredientQuantityUnitSchema,
    })
    .optional(),
  uncertaintyNote: z.string().min(1).optional(),
  suggestedInternalId: z.string().min(1).optional(),
});

export const fridgeVisionResponseSchema = z.object({
  schemaVersion: z.literal('1'),
  detected: z.array(detectedIngredientSchema),
  modelNotes: z.string().optional(),
});

export interface FridgeParseSuccess {
  ok: true;
  data: FridgeVisionResponseRaw;
}

export interface FridgeParseFailure {
  ok: false;
  reason: 'invalid_json' | 'invalid_schema';
  details?: string;
}

export type FridgeParseResult = FridgeParseSuccess | FridgeParseFailure;

/**
 * Parses an AI response that may arrive either as a JSON string (real
 * Gemini call) or already as an object (mock provider, tests). Returns a
 * tagged union — callers should not throw on AI errors, they should render
 * a graceful empty state instead.
 */
export function parseFridgeVisionResponse(input: unknown): FridgeParseResult {
  let candidate: unknown = input;

  if (typeof input === 'string') {
    try {
      candidate = JSON.parse(input);
    } catch (err) {
      return {
        ok: false,
        reason: 'invalid_json',
        details: err instanceof Error ? err.message : 'unknown JSON error',
      };
    }
  }

  const parsed = fridgeVisionResponseSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'invalid_schema',
      details: parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; '),
    };
  }

  return { ok: true, data: parsed.data };
}

export type { DetectedIngredientRaw };
