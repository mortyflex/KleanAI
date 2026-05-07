import { z } from 'zod';
import type {
  GymVisionResponseRaw,
  DetectedEquipmentRaw,
} from '../../../types/ai.types';

/**
 * Strict JSON schema for the Gym Vision response. AI output is never trusted
 * directly — every payload goes through this validator first. Anything that
 * fails parsing is treated as "AI failed" and the UI falls back to a graceful
 * empty state.
 */
export const detectedEquipmentSchema = z.object({
  label: z.string().min(1),
  confidence: z.number().min(0).max(1),
  aliases: z.array(z.string().min(1)).optional(),
  visibleConstraints: z.array(z.string().min(1)).optional(),
  suggestedInternalId: z.string().min(1).optional(),
});

export const gymVisionResponseSchema = z.object({
  schemaVersion: z.literal('1'),
  detected: z.array(detectedEquipmentSchema),
  modelNotes: z.string().optional(),
});

export interface ParseSuccess {
  ok: true;
  data: GymVisionResponseRaw;
}

export interface ParseFailure {
  ok: false;
  reason: 'invalid_json' | 'invalid_schema';
  details?: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

/**
 * Parses an AI response that may arrive either as a JSON string (real
 * Gemini call) or already as an object (mock provider, tests). Returns a
 * tagged union — callers should not throw on AI errors, they should render
 * a graceful empty state instead.
 */
export function parseGymVisionResponse(input: unknown): ParseResult {
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

  const parsed = gymVisionResponseSchema.safeParse(candidate);
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

export type { DetectedEquipmentRaw };
