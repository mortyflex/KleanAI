import type { Equipment } from '../../../types/workout.types';
import type {
  DetectedEquipmentRaw,
  DetectedEquipment,
} from '../../../types/ai.types';
import { EQUIPMENT_CATALOG, getAliasIndex, normalizeLabel } from '../data/equipment-catalog';

/**
 * Default minimum confidence below which a detection is ignored. Mirrors the
 * "we don't trust the AI blindly" rule from the ai-vision skill — a separate
 * confirmation screen still lets the user accept low-confidence items if
 * they want to.
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;

const VALID_INTERNAL_IDS: ReadonlySet<Equipment> = new Set(
  EQUIPMENT_CATALOG.map((e) => e.internalId),
);

/**
 * Maps a single raw detection to one of our internal equipment categories.
 * Returns `null` when no confident mapping can be made — callers must drop
 * those rather than render unknown equipment.
 *
 * Resolution order:
 *   1. Trust `suggestedInternalId` only when it is a known internal id.
 *   2. Match the primary label against the alias index.
 *   3. Match each alias against the alias index.
 */
export function mapToInternalEquipment(
  raw: DetectedEquipmentRaw,
): Equipment | null {
  if (raw.suggestedInternalId && VALID_INTERNAL_IDS.has(raw.suggestedInternalId as Equipment)) {
    return raw.suggestedInternalId as Equipment;
  }

  const aliasIndex = getAliasIndex();

  const fromLabel = aliasIndex.get(normalizeLabel(raw.label));
  if (fromLabel) return fromLabel;

  if (raw.aliases) {
    for (const alias of raw.aliases) {
      const hit = aliasIndex.get(normalizeLabel(alias));
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
export function mapDetections(
  detections: DetectedEquipmentRaw[],
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD,
): DetectedEquipment[] {
  const byId = new Map<Equipment, DetectedEquipment>();

  for (const raw of detections) {
    if (raw.confidence < threshold) continue;
    const internalId = mapToInternalEquipment(raw);
    if (!internalId) continue;

    const candidate: DetectedEquipment = {
      internalId,
      rawLabel: raw.label,
      confidence: raw.confidence,
      visibleConstraints: raw.visibleConstraints,
    };

    const existing = byId.get(internalId);
    if (!existing || candidate.confidence > existing.confidence) {
      byId.set(internalId, candidate);
    }
  }

  return [...byId.values()].sort((a, b) => b.confidence - a.confidence);
}
