import type { Equipment } from '../../../types/workout.types';

/**
 * Internal gym equipment catalog. Each entry is a piece of gear the workout
 * engine knows how to plan around, mapped to one of the broader `Equipment`
 * categories used by exercises in `src/features/workout/data/exercises.ts`.
 *
 * `aliases` are normalized lowercase strings the AI vision provider may
 * emit. Matching is case-insensitive and handles both English and French
 * synonyms — the user can also confirm/correct in the UI.
 */
export interface EquipmentCatalogEntry {
  internalId: Equipment;
  /** i18n key for the human-readable label of this internal category. */
  labelKey: string;
  /** Lowercase aliases — must already be lowercase, no leading/trailing spaces. */
  aliases: string[];
}

export const EQUIPMENT_CATALOG: EquipmentCatalogEntry[] = [
  {
    internalId: 'barbell',
    labelKey: 'vision.equipment.barbell',
    aliases: [
      'barbell',
      'barbell rack',
      'squat rack',
      'power rack',
      'bench press',
      'olympic bar',
      'barre',
      'rack à squat',
    ],
  },
  {
    internalId: 'dumbbell',
    labelKey: 'vision.equipment.dumbbell',
    aliases: [
      'dumbbell',
      'dumbbells',
      'adjustable dumbbells',
      'hex dumbbells',
      'haltère',
      'haltères',
    ],
  },
  {
    internalId: 'cable',
    labelKey: 'vision.equipment.cable',
    aliases: [
      'cable',
      'cable machine',
      'cable crossover',
      'cable column',
      'pulley',
      'lat pulldown',
      'poulie',
      'machine à poulie',
    ],
  },
  {
    internalId: 'machine',
    labelKey: 'vision.equipment.machine',
    aliases: [
      'machine',
      'leg press',
      'leg press machine',
      'horizontal leg press',
      'leg curl',
      'leg curl machine',
      'chest press machine',
      'shoulder press machine',
      'smith machine',
      'machine guidée',
      'presse à cuisses',
    ],
  },
  {
    internalId: 'pull_up_bar',
    labelKey: 'vision.equipment.pull_up_bar',
    aliases: [
      'pull-up bar',
      'pull up bar',
      'chin-up bar',
      'chin up bar',
      'barre de traction',
    ],
  },
  {
    internalId: 'resistance_band',
    labelKey: 'vision.equipment.resistance_band',
    aliases: [
      'resistance band',
      'resistance bands',
      'mini band',
      'élastique',
      'bande élastique',
    ],
  },
  {
    internalId: 'bodyweight',
    labelKey: 'vision.equipment.bodyweight',
    aliases: ['mat', 'yoga mat', 'tapis', 'bodyweight'],
  },
];

/** Normalizes a free-text label so alias matching is robust. */
export function normalizeLabel(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Returns all aliases keyed by the internal equipment id (lowercased). */
export function getAliasIndex(): Map<string, Equipment> {
  const index = new Map<string, Equipment>();
  for (const entry of EQUIPMENT_CATALOG) {
    for (const alias of entry.aliases) {
      index.set(normalizeLabel(alias), entry.internalId);
    }
  }
  return index;
}
