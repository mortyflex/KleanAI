import type {
  AIProvider,
  AIRequestImage,
  DetectedEquipment,
} from '../../../types/ai.types';
import { getAIProvider } from '../../../lib/ai';
import { recordAILog, summarizeDetected } from '../../../lib/ai/logs';
import { parseGymVisionResponse } from '../utils/parse-gym-vision';
import { DEFAULT_CONFIDENCE_THRESHOLD, mapDetections } from '../utils/equipment-mapping';

export const GYM_VISION_PROMPT_VERSION = 'gym-vision/v1';

export type GymVisionFailureReason =
  | 'invalid_json'
  | 'invalid_schema'
  | 'provider_error';

export interface GymVisionSuccess {
  ok: true;
  detected: DetectedEquipment[];
  rawCount: number;
}

export interface GymVisionFailure {
  ok: false;
  reason: GymVisionFailureReason;
  details?: string;
}

export type GymVisionResult = GymVisionSuccess | GymVisionFailure;

export interface AnalyzeGymOptions {
  images: AIRequestImage[];
  provider?: AIProvider;
  confidenceThreshold?: number;
}

/**
 * Single entry-point used by the UI: ask the active AI provider, validate
 * the response, map to internal equipment ids, and record an AI log entry.
 *
 * Never throws — returns a discriminated result so the UI can render a
 * graceful failure state.
 */
export async function analyzeGymImages(
  opts: AnalyzeGymOptions,
): Promise<GymVisionResult> {
  const provider = opts.provider ?? getAIProvider();
  const threshold = opts.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const startedAt = Date.now();

  let raw: unknown;
  try {
    raw = await provider.analyzeGymImages({
      images: opts.images,
      promptVersion: GYM_VISION_PROMPT_VERSION,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown provider error';
    recordAILog({
      feature: 'gym_vision',
      providerId: provider.id,
      modelId: provider.modelId,
      promptVersion: GYM_VISION_PROMPT_VERSION,
      latencyMs: Date.now() - startedAt,
      imageCount: opts.images.length,
      outputSummary: 'provider_error',
      succeeded: false,
      errorMessage: message,
    });
    return { ok: false, reason: 'provider_error', details: message };
  }

  const parseResult = parseGymVisionResponse(raw);
  if (!parseResult.ok) {
    recordAILog({
      feature: 'gym_vision',
      providerId: provider.id,
      modelId: provider.modelId,
      promptVersion: GYM_VISION_PROMPT_VERSION,
      latencyMs: Date.now() - startedAt,
      imageCount: opts.images.length,
      outputSummary: parseResult.reason,
      succeeded: false,
      errorMessage: parseResult.details,
    });
    return { ok: false, reason: parseResult.reason, details: parseResult.details };
  }

  const detected = mapDetections(parseResult.data.detected, threshold);

  recordAILog({
    feature: 'gym_vision',
    providerId: provider.id,
    modelId: provider.modelId,
    promptVersion: GYM_VISION_PROMPT_VERSION,
    latencyMs: Date.now() - startedAt,
    imageCount: opts.images.length,
    outputSummary: summarizeDetected(parseResult.data.detected.length, detected.length),
    succeeded: true,
  });

  return { ok: true, detected, rawCount: parseResult.data.detected.length };
}
