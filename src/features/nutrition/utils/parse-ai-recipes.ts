import { z } from 'zod';
import type { AIRecipesResponseRaw } from '../../../types/ai.types';

/**
 * Strict JSON schema for the AI recipe response. Anything that fails parsing
 * is treated as "AI failed" so the hybrid service falls back to internal
 * recipes only.
 */
const aiRecipeSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(2).max(400),
  ingredientLabels: z.array(z.string().min(1)).min(1).max(20),
  steps: z.array(z.string().min(1)).min(1).max(12),
  prepTimeMinutes: z.number().int().nonnegative().max(180),
  difficulty: z.enum(['easy', 'medium']),
  estimatedCalories: z.number().int().min(50).max(2000),
  estimatedProteinG: z.number().int().min(0).max(200),
  estimatedCarbsG: z.number().int().min(0).max(300),
  estimatedFatG: z.number().int().min(0).max(150),
  tags: z.array(z.string().min(1)).optional(),
});

export const aiRecipesResponseSchema = z.object({
  schemaVersion: z.literal('1'),
  recipes: z.array(aiRecipeSchema).max(6),
  modelNotes: z.string().optional(),
});

export interface AIRecipesParseSuccess {
  ok: true;
  data: AIRecipesResponseRaw;
}

export interface AIRecipesParseFailure {
  ok: false;
  reason: 'invalid_json' | 'invalid_schema';
  details?: string;
}

export type AIRecipesParseResult =
  | AIRecipesParseSuccess
  | AIRecipesParseFailure;

export function parseAIRecipesResponse(input: unknown): AIRecipesParseResult {
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

  const parsed = aiRecipesResponseSchema.safeParse(candidate);
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
