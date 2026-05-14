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
  /**
   * BCP-47 / ISO language tag (e.g. `"fr"`, `"en"`). Forwarded to the edge
   * function so Gemini returns labels in the user's language. The internal
   * catalog has bilingual aliases, so French labels still map to the same
   * `IngredientId` as their English counterparts.
   */
  locale?: string;
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

/**
 * Detection that survived the confidence threshold but does NOT match any
 * entry in the internal ingredient catalog. We keep these so the AI recipe
 * generator can still take them into account when the user confirms them.
 *
 * Nutritional precision is intentionally lower than for `DetectedIngredient`
 * — the UI labels them as "estimated".
 */
export interface UnmappedIngredient {
  /** Stable id derived from the normalized label — safe to use as a React key. */
  unmappedId: string;
  /** Original AI label, surfaced to the user as-is. */
  rawLabel: string;
  /** Coarse category the AI guessed — never trusted for filtering, only displayed. */
  category?: IngredientCategory;
  confidence: number;
  quantity?: {
    amount: number;
    unit: IngredientQuantityUnit;
  };
  uncertaintyNote?: string;
}

export interface AILogEntry {
  id: string;
  feature: 'gym_vision' | 'fridge_vision' | 'recipe_generation';
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

/**
 * Request shape for AI-generated complementary recipes. The internal recipe
 * engine fills in slots first; only the gap (max 3 - internal hits) is asked
 * of the AI provider.
 */
export interface AIRecipeRequest {
  promptVersion: string;
  /**
   * Internal ingredient ids the user has confirmed — already mapped to the
   * catalog so they can be resolved to localized names by the provider.
   */
  mappedIngredientIds: IngredientId[];
  /**
   * Localized display labels for the mapped ingredients. Same length and
   * order as `mappedIngredientIds`. Sent so the generator (template or LLM)
   * can write the recipe in the user's language without leaking raw ids
   * like `greek_yogurt` into the UI.
   */
  mappedIngredientLabels: string[];
  /** Free-text labels the user confirmed but that aren't in our catalog. */
  unmappedIngredientLabels: string[];
  goal: 'lose_weight' | 'gain_muscle' | 'maintain' | 'recomposition';
  restrictions: string[];
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  /** Number of recipes the caller wants — generator may return fewer. */
  desiredCount: number;
  targetKcal?: number;
  targetProteinG?: number;
  /** ISO language tag (e.g. "fr", "en") — generator returns text in this language. */
  language?: string;
}

/**
 * Raw recipe shape returned by the AI. Validated by Zod before use; never
 * trusted as-is. The hybrid service applies the deterministic restriction
 * filter on top before surfacing items to the UI.
 */
export interface AIRecipeRaw {
  title: string;
  description: string;
  ingredientLabels: string[];
  steps: string[];
  prepTimeMinutes: number;
  difficulty: 'easy' | 'medium';
  estimatedCalories: number;
  estimatedProteinG: number;
  estimatedCarbsG: number;
  estimatedFatG: number;
  tags?: string[];
}

export interface AIRecipesResponseRaw {
  schemaVersion: '1';
  recipes: AIRecipeRaw[];
  modelNotes?: string;
}

export interface AIProvider {
  readonly id: AIProviderId;
  readonly modelId: string;
  analyzeGymImages(req: GymVisionRequest): Promise<GymVisionResponseRaw>;
  analyzeFridgeImages(req: FridgeVisionRequest): Promise<FridgeVisionResponseRaw>;
  /**
   * Optional — providers that don't implement recipe generation cause the
   * hybrid service to fall back to internal-only suggestions, which is also
   * the desired behavior in CI / tests by default.
   */
  generateRecipeSuggestions?(req: AIRecipeRequest): Promise<AIRecipesResponseRaw>;
}
