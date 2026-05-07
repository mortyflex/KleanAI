import type { Equipment } from './workout.types';

export type AIProviderId = 'mock' | 'gemini';

export interface AIRequestImage {
  /** base64 payload or local URI placeholder. Mock provider ignores. */
  uri: string;
  mimeType?: string;
}

export interface GymVisionRequest {
  images: AIRequestImage[];
  promptVersion: string;
}

/**
 * Raw structured response shape Gemini (or any provider) is asked to return.
 * Validated by Zod before use — never trusted as-is.
 */
export interface DetectedEquipmentRaw {
  label: string;
  confidence: number;
  aliases?: string[];
  visibleConstraints?: string[];
  suggestedInternalId?: string;
}

export interface GymVisionResponseRaw {
  schemaVersion: '1';
  detected: DetectedEquipmentRaw[];
  modelNotes?: string;
}

/** Equipment item after validation + internal mapping. Safe to render. */
export interface DetectedEquipment {
  /** Stable internal id used by the workout engine. */
  internalId: Equipment;
  /** Original AI label, kept for transparency in the confirmation screen. */
  rawLabel: string;
  /** 0..1 — already passed the threshold by the time it reaches the UI. */
  confidence: number;
  visibleConstraints?: string[];
}

export interface AILogEntry {
  id: string;
  feature: 'gym_vision' | 'fridge_vision';
  providerId: AIProviderId;
  modelId: string;
  promptVersion: string;
  latencyMs: number;
  imageCount: number;
  outputSummary: string;
  succeeded: boolean;
  errorMessage?: string;
  createdAt: string;
}

export interface AIProvider {
  readonly id: AIProviderId;
  readonly modelId: string;
  analyzeGymImages(req: GymVisionRequest): Promise<GymVisionResponseRaw>;
}
