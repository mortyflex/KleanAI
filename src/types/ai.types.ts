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

/**
 * Coarse ingredient categories the rest of the nutrition engine reasons
 * about. Mapping the noisy AI labels onto a small finite set lets meal
 * suggestion logic stay simple and deterministic.
 */
export type IngredientCategory =
  | 'protein_meat'
  | 'protein_fish'
  | 'protein_egg'
  | 'protein_dairy'
  | 'protein_plant'
  | 'carb_grain'
  | 'carb_starchy'
  | 'vegetable'
  | 'fruit'
  | 'fat_oil'
  | 'condiment'
  | 'beverage'
  | 'other';

/** Supported quantity hints the AI may emit. Free-form values are ignored. */
export type IngredientQuantityUnit =
  | 'piece'
  | 'pack'
  | 'bottle'
  | 'jar'
  | 'g'
  | 'ml'
  | 'unknown';

/**
 * Raw fridge ingredient shape Gemini (or any provider) is asked to return.
 * Validated by Zod before use — never trusted as-is.
 */
export interface DetectedIngredientRaw {
  label: string;
  confidence: number;
  category?: IngredientCategory;
  aliases?: string[];
  /** Approximate count or volume — optional and treated as a hint only. */
  quantity?: {
    amount: number;
    unit: IngredientQuantityUnit;
  };
  /** Free-form note about why this detection might be wrong. */
  uncertaintyNote?: string;
  /** AI's guess at the internal id — must still be validated. */
  suggestedInternalId?: string;
}

export interface FridgeVisionResponseRaw {
  schemaVersion: '1';
  detected: DetectedIngredientRaw[];
  modelNotes?: string;
}

export interface FridgeVisionRequest {
  images: AIRequestImage[];
  promptVersion: string;
}

/**
 * A stable internal ingredient id. The catalog living next to the fridge
 * vision feature owns the canonical list.
 */
export type IngredientId = string;

/** Ingredient item after validation + internal mapping. Safe to render. */
export interface DetectedIngredient {
  /** Stable internal id used by the meal suggestion engine. */
  internalId: IngredientId;
  /** Coarse category the meal suggestion engine reasons about. */
  category: IngredientCategory;
  /** Original AI label, kept for transparency in the confirmation screen. */
  rawLabel: string;
  /** 0..1 — already passed the threshold by the time it reaches the UI. */
  confidence: number;
  quantity?: {
    amount: number;
    unit: IngredientQuantityUnit;
  };
  uncertaintyNote?: string;
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
  analyzeFridgeImages(req: FridgeVisionRequest): Promise<FridgeVisionResponseRaw>;
}
