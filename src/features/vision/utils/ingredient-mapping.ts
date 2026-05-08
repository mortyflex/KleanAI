import type {
  DetectedIngredientRaw,
  DetectedIngredient,
  IngredientId,
  UnmappedIngredient,
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

export interface FridgeMappingResult {
  /** Detections that resolved to a known internal ingredient id. */
  mapped: DetectedIngredient[];
  /** Detections above the confidence threshold but unknown to the catalog. */
  unmapped: UnmappedIngredient[];
}

/**
 * Builds a stable `unmappedId` for a free-form AI label so we can use it as a
 * React key, dedupe entries, and round-trip the user's selection through the
 * confirmation reducer without depending on object identity.
 */
export function buildUnmappedId(label: string): string {
  const normalized = normalizeIngredientLabel(label);
  const slug = normalized.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `unmapped:${slug || 'item'}`;
}

/**
 * Same input as {@link mapIngredientDetections}, but returns BOTH the mapped
 * detections (existing behavior) and the unmapped ones — detections that
 * passed the confidence threshold but did not resolve to any catalog entry.
 *
 * Unmapped items are useful inputs for the AI recipe generator: even without
 * precise nutrition data, knowing the user has e.g. "ketchup" or "harissa"
 * lets the generator suggest more realistic recipes. Filtering rules
 * (restrictions, etc.) still happen downstream, deterministically.
 */
export function partitionIngredientDetections(
  detections: DetectedIngredientRaw[],
  threshold: number = DEFAULT_FRIDGE_CONFIDENCE_THRESHOLD,
): FridgeMappingResult {
  const mapped = mapIngredientDetections(detections, threshold);
  const mappedRawLabels = new Set(mapped.map((m) => m.rawLabel));

  const unmappedById = new Map<string, UnmappedIngredient>();

  for (const raw of detections) {
    if (raw.confidence < threshold) continue;
    if (mappedRawLabels.has(raw.label)) continue;
    if (mapToInternalIngredient(raw)) continue;

    const unmappedId = buildUnmappedId(raw.label);
    const candidate: UnmappedIngredient = {
      unmappedId,
      rawLabel: raw.label,
      category: raw.category,
      confidence: raw.confidence,
      quantity: raw.quantity,
      uncertaintyNote: raw.uncertaintyNote,
    };

    const existing = unmappedById.get(unmappedId);
    if (!existing || candidate.confidence > existing.confidence) {
      unmappedById.set(unmappedId, candidate);
    }
  }

  const unmapped = [...unmappedById.values()].sort(
    (a, b) => b.confidence - a.confidence,
  );

  return { mapped, unmapped };
}
