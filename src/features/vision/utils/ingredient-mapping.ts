import type {
  DetectedIngredientRaw,
  DetectedIngredient,
  IngredientId,
} from '../../../types/ai.types';
import {
  INGREDIENT_CATALOG,
  getIngredientAliasIndex,
  getIngredientEntry,
  isKnownIngredientId,
  normalizeIngredientLabel,
} from '../data/ingredient-catalog';

/**
 * Default minimum confidence below which a detection is ignored. Mirrors the
 * "we don't trust the AI blindly" rule from the ai-vision skill — a separate
 * confirmation screen still lets the user accept low-confidence items if
 * they want to.
 */
export const DEFAULT_FRIDGE_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Maps a single raw detection to one of our internal ingredient ids.
 * Returns `null` when no confident mapping can be made — callers must drop
 * those rather than render unknown ingredients.
 *
 * Resolution order:
 *   1. Trust `suggestedInternalId` only when it is a known internal id.
 *   2. Match the primary label against the alias index.
 *   3. Match each alias against the alias index.
 */
export function mapToInternalIngredient(
  raw: DetectedIngredientRaw,
): IngredientId | null {
  if (raw.suggestedInternalId && isKnownIngredientId(raw.suggestedInternalId)) {
    return raw.suggestedInternalId;
  }

  const aliasIndex = getIngredientAliasIndex();

  const fromLabel = aliasIndex.get(normalizeIngredientLabel(raw.label));
  if (fromLabel) return fromLabel;

  if (raw.aliases) {
    for (const alias of raw.aliases) {
      const hit = aliasIndex.get(normalizeIngredientLabel(alias));
      if (hit) return hit;
    }
  }

  return null;
}

/**
 * Filters + maps a list of raw detections to confirmed-shape items. Anything
 * below the confidence threshold or without a known internal mapping is
 * dropped. The same internal id can appear at most once (we keep the highest
 * confidence detection so the UI is not noisy).
 */
export function mapIngredientDetections(
  detections: DetectedIngredientRaw[],
  threshold: number = DEFAULT_FRIDGE_CONFIDENCE_THRESHOLD,
): DetectedIngredient[] {
  const byId = new Map<IngredientId, DetectedIngredient>();

  for (const raw of detections) {
    if (raw.confidence < threshold) continue;
    const internalId = mapToInternalIngredient(raw);
    if (!internalId) continue;

    const entry = getIngredientEntry(internalId);
    if (!entry) continue;

    const candidate: DetectedIngredient = {
      internalId,
      // Prefer the AI-supplied category when it is one of our known values;
      // otherwise fall back to the catalog category so downstream filters
      // still work.
      category: raw.category ?? entry.category,
      rawLabel: raw.label,
      confidence: raw.confidence,
      quantity: raw.quantity,
      uncertaintyNote: raw.uncertaintyNote,
    };

    const existing = byId.get(internalId);
    if (!existing || candidate.confidence > existing.confidence) {
      byId.set(internalId, candidate);
    }
  }

  return [...byId.values()].sort((a, b) => b.confidence - a.confidence);
}

/** Convenience: list every internal id known to the catalog. */
export function listAllIngredientIds(): IngredientId[] {
  return INGREDIENT_CATALOG.map((e) => e.internalId);
}
