import type {
  AIProvider,
  AIRequestImage,
  DetectedIngredient,
  UnmappedIngredient,
} from '../../../types/ai.types';
import { getAIProvider } from '../../../lib/ai';
import { recordAILog, summarizeDetected } from '../../../lib/ai/logs';
import { parseFridgeVisionResponse } from '../utils/parse-fridge-vision';
import {
  DEFAULT_FRIDGE_CONFIDENCE_THRESHOLD,
  partitionIngredientDetections,
} from '../utils/ingredient-mapping';

export const FRIDGE_VISION_PROMPT_VERSION = 'fridge-vision/v1';

export type FridgeVisionFailureReason =
  | 'invalid_json'
  | 'invalid_schema'
  | 'provider_error';

export interface FridgeVisionSuccess {
  ok: true;
  detected: DetectedIngredient[];
  /**
   * Detections above the confidence threshold but unknown to the internal
   * catalog. Surfaced so the user can confirm them and so the AI recipe
   * generator can take them into account.
   */
  unmapped: UnmappedIngredient[];
  rawCount: number;
}

export interface FridgeVisionFailure {
  ok: false;
  reason: FridgeVisionFailureReason;
  details?: string;
}

export type FridgeVisionResult = FridgeVisionSuccess | FridgeVisionFailure;

export interface AnalyzeFridgeOptions {
  images: AIRequestImage[];
  provider?: AIProvider;
  confidenceThreshold?: number;
  /**
   * Forwarded to the AI provider so Gemini returns labels in the user's
   * language. Defaults to undefined → provider falls back to English.
   */
  locale?: string;
}

/**
 * Single entry-point used by the UI: ask the active AI provider, validate
 * the response, map to internal ingredient ids, and record an AI log entry.
 *
 * Never throws — returns a discriminated result so the UI can render a
 * graceful failure state.
 */
export async function analyzeFridgeImages(
  opts: AnalyzeFridgeOptions,
): Promise<FridgeVisionResult> {
  const provider = opts.provider ?? getAIProvider();
  const threshold = opts.confidenceThreshold ?? DEFAULT_FRIDGE_CONFIDENCE_THRESHOLD;
  const startedAt = Date.now();

  let raw: unknown;
  try {
    raw = await provider.analyzeFridgeImages({
      images: opts.images,
      promptVersion: FRIDGE_VISION_PROMPT_VERSION,
      locale: opts.locale,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown provider error';
    recordAILog({
      feature: 'fridge_vision',
      providerId: provider.id,
      modelId: provider.modelId,
      promptVersion: FRIDGE_VISION_PROMPT_VERSION,
      latencyMs: Date.now() - startedAt,
      imageCount: opts.images.length,
      outputSummary: 'provider_error',
      succeeded: false,
      errorMessage: message,
    });
    return { ok: false, reason: 'provider_error', details: message };
  }

  const parseResult = parseFridgeVisionResponse(raw);
  if (!parseResult.ok) {
    recordAILog({
      feature: 'fridge_vision',
      providerId: provider.id,
      modelId: provider.modelId,
      promptVersion: FRIDGE_VISION_PROMPT_VERSION,
      latencyMs: Date.now() - startedAt,
      imageCount: opts.images.length,
      outputSummary: parseResult.reason,
      succeeded: false,
      errorMessage: parseResult.details,
    });
    return { ok: false, reason: parseResult.reason, details: parseResult.details };
  }

  const partition = partitionIngredientDetections(
    parseResult.data.detected,
    threshold,
  );

  recordAILog({
    feature: 'fridge_vision',
    providerId: provider.id,
    modelId: provider.modelId,
    promptVersion: FRIDGE_VISION_PROMPT_VERSION,
    latencyMs: Date.now() - startedAt,
    imageCount: opts.images.length,
    outputSummary: summarizeDetected(
      parseResult.data.detected.length,
      partition.mapped.length,
    ),
    succeeded: true,
  });

  return {
    ok: true,
    detected: partition.mapped,
    unmapped: partition.unmapped,
    rawCount: parseResult.data.detected.length,
  };
}
