import type { IngredientId } from '../../../types/ai.types';

/**
 * Stable, order-independent fingerprint of a confirmed fridge.
 *
 * Two fridges with the same mapped ids and the same free-text unmapped
 * labels — regardless of the order they were detected/confirmed in — produce
 * the same fingerprint. It is used in two places:
 *
 *   1. As part of the recipe-cache key, so a fridge change naturally misses
 *      the cache and triggers a fresh generation.
 *   2. Stored on each `ChosenRecipeSnapshot` so the Nutrition screen can flag
 *      an AI recipe as "may no longer match your fridge" once the user
 *      re-scans (the live fingerprint no longer equals the stored one).
 *
 * Pure and deterministic — no `Date`, no storage, no i18n.
 */
export function buildFridgeFingerprint(
  ingredientIds: readonly IngredientId[] = [],
  unmappedLabels: readonly string[] = [],
): string {
  const ids = [...ingredientIds].map((id) => id.trim()).sort();
  const labels = [...unmappedLabels]
    .map((label) => label.trim().toLowerCase())
    .filter((label) => label.length > 0)
    .sort();
  // The `|` separator can never appear inside an ingredient id, and the `#`
  // keeps the two sections unambiguous even when one of them is empty.
  return `ids:${ids.join('|')}#unmapped:${labels.join('|')}`;
}
