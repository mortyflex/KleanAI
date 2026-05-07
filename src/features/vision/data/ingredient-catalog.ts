import type {
  IngredientCategory,
  IngredientId,
} from '../../../types/ai.types';
import type { DietaryRestriction } from '../../../types/profile.types';

/**
 * Internal ingredient catalog. Each entry is a piece of food the meal
 * suggestion engine knows how to plan around. Entries are intentionally a
 * small, curated set — Open Food Facts integration is out of scope for this
 * phase.
 *
 * `aliases` are normalized lowercase strings the AI vision provider may
 * emit. Matching is case-insensitive and handles English + French synonyms.
 *
 * `conflictsWith` lists the dietary restrictions the ingredient is
 * incompatible with so the confirmation UI can flag them up front, even
 * before meal suggestions are filtered.
 */
export interface IngredientCatalogEntry {
  internalId: IngredientId;
  /** i18n key for the human-readable ingredient name. */
  labelKey: string;
  category: IngredientCategory;
  /** Lowercase aliases — must already be lowercase, no leading/trailing spaces. */
  aliases: string[];
  conflictsWith: DietaryRestriction[];
}

export const INGREDIENT_CATALOG: IngredientCatalogEntry[] = [
  // ── Proteins: meat ───────────────────────────────────────────────────────
  {
    internalId: 'chicken_breast',
    labelKey: 'vision.ingredients.chicken_breast',
    category: 'protein_meat',
    aliases: ['chicken', 'chicken breast', 'poulet', 'blanc de poulet'],
    conflictsWith: ['vegetarian', 'vegan'],
  },
  {
    internalId: 'turkey',
    labelKey: 'vision.ingredients.turkey',
    category: 'protein_meat',
    aliases: ['turkey', 'ground turkey', 'dinde', 'escalope de dinde'],
    conflictsWith: ['vegetarian', 'vegan'],
  },
  {
    internalId: 'beef',
    labelKey: 'vision.ingredients.beef',
    category: 'protein_meat',
    aliases: ['beef', 'ground beef', 'steak', 'boeuf', 'bœuf', 'haché'],
    conflictsWith: ['vegetarian', 'vegan'],
  },

  // ── Proteins: fish ───────────────────────────────────────────────────────
  {
    internalId: 'salmon',
    labelKey: 'vision.ingredients.salmon',
    category: 'protein_fish',
    aliases: ['salmon', 'saumon', 'salmon fillet'],
    conflictsWith: ['vegetarian', 'vegan'],
  },
  {
    internalId: 'tuna',
    labelKey: 'vision.ingredients.tuna',
    category: 'protein_fish',
    aliases: ['tuna', 'canned tuna', 'thon'],
    conflictsWith: ['vegetarian', 'vegan'],
  },

  // ── Proteins: eggs / dairy ──────────────────────────────────────────────
  {
    internalId: 'eggs',
    labelKey: 'vision.ingredients.eggs',
    category: 'protein_egg',
    aliases: ['eggs', 'egg', 'oeufs', 'œufs', 'oeuf', 'œuf'],
    conflictsWith: ['vegan'],
  },
  {
    internalId: 'greek_yogurt',
    labelKey: 'vision.ingredients.greek_yogurt',
    category: 'protein_dairy',
    aliases: [
      'greek yogurt',
      'greek yoghurt',
      'yaourt grec',
      'yogurt',
    ],
    conflictsWith: ['vegan', 'lactose_free'],
  },
  {
    internalId: 'cottage_cheese',
    labelKey: 'vision.ingredients.cottage_cheese',
    category: 'protein_dairy',
    aliases: ['cottage cheese', 'fromage blanc'],
    conflictsWith: ['vegan', 'lactose_free'],
  },

  // ── Proteins: plant ─────────────────────────────────────────────────────
  {
    internalId: 'tofu',
    labelKey: 'vision.ingredients.tofu',
    category: 'protein_plant',
    aliases: ['tofu', 'firm tofu'],
    conflictsWith: [],
  },
  {
    internalId: 'lentils',
    labelKey: 'vision.ingredients.lentils',
    category: 'protein_plant',
    aliases: ['lentils', 'lentilles', 'red lentils', 'green lentils'],
    conflictsWith: [],
  },
  {
    internalId: 'chickpeas',
    labelKey: 'vision.ingredients.chickpeas',
    category: 'protein_plant',
    aliases: ['chickpeas', 'pois chiches', 'garbanzo beans'],
    conflictsWith: [],
  },

  // ── Carbs: grains / starchy ─────────────────────────────────────────────
  {
    internalId: 'brown_rice',
    labelKey: 'vision.ingredients.brown_rice',
    category: 'carb_grain',
    aliases: ['brown rice', 'rice', 'riz', 'riz complet'],
    conflictsWith: [],
  },
  {
    internalId: 'quinoa',
    labelKey: 'vision.ingredients.quinoa',
    category: 'carb_grain',
    aliases: ['quinoa'],
    conflictsWith: [],
  },
  {
    internalId: 'oats',
    labelKey: 'vision.ingredients.oats',
    category: 'carb_grain',
    aliases: ['oats', 'rolled oats', 'flocons d’avoine', "flocons d'avoine"],
    conflictsWith: ['gluten_free'],
  },
  {
    internalId: 'sweet_potato',
    labelKey: 'vision.ingredients.sweet_potato',
    category: 'carb_starchy',
    aliases: ['sweet potato', 'patate douce'],
    conflictsWith: [],
  },

  // ── Vegetables ──────────────────────────────────────────────────────────
  {
    internalId: 'spinach',
    labelKey: 'vision.ingredients.spinach',
    category: 'vegetable',
    aliases: ['spinach', 'baby spinach', 'épinards', 'epinards'],
    conflictsWith: [],
  },
  {
    internalId: 'broccoli',
    labelKey: 'vision.ingredients.broccoli',
    category: 'vegetable',
    aliases: ['broccoli', 'brocoli'],
    conflictsWith: [],
  },
  {
    internalId: 'tomato',
    labelKey: 'vision.ingredients.tomato',
    category: 'vegetable',
    aliases: ['tomato', 'tomatoes', 'tomate', 'tomates'],
    conflictsWith: [],
  },
  {
    internalId: 'bell_pepper',
    labelKey: 'vision.ingredients.bell_pepper',
    category: 'vegetable',
    aliases: ['bell pepper', 'pepper', 'poivron'],
    conflictsWith: [],
  },

  // ── Fruits ──────────────────────────────────────────────────────────────
  {
    internalId: 'banana',
    labelKey: 'vision.ingredients.banana',
    category: 'fruit',
    aliases: ['banana', 'bananas', 'banane', 'bananes'],
    conflictsWith: [],
  },
  {
    internalId: 'apple',
    labelKey: 'vision.ingredients.apple',
    category: 'fruit',
    aliases: ['apple', 'apples', 'pomme', 'pommes'],
    conflictsWith: [],
  },
  {
    internalId: 'berries',
    labelKey: 'vision.ingredients.berries',
    category: 'fruit',
    aliases: [
      'berries',
      'blueberries',
      'strawberries',
      'fruits rouges',
      'baies',
    ],
    conflictsWith: [],
  },

  // ── Fats ────────────────────────────────────────────────────────────────
  {
    internalId: 'olive_oil',
    labelKey: 'vision.ingredients.olive_oil',
    category: 'fat_oil',
    aliases: ['olive oil', "huile d'olive", 'huile d olive'],
    conflictsWith: [],
  },
  {
    internalId: 'almonds',
    labelKey: 'vision.ingredients.almonds',
    category: 'fat_oil',
    aliases: ['almonds', 'amandes'],
    conflictsWith: [],
  },
  {
    internalId: 'avocado',
    labelKey: 'vision.ingredients.avocado',
    category: 'fat_oil',
    aliases: ['avocado', 'avocat'],
    conflictsWith: [],
  },
];

const VALID_INTERNAL_IDS: ReadonlySet<IngredientId> = new Set(
  INGREDIENT_CATALOG.map((e) => e.internalId),
);

const CATALOG_BY_ID: ReadonlyMap<IngredientId, IngredientCatalogEntry> =
  new Map(INGREDIENT_CATALOG.map((e) => [e.internalId, e]));

/** Normalizes a free-text label so alias matching is robust. */
export function normalizeIngredientLabel(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Returns all aliases keyed by internal ingredient id (lowercased). */
export function getIngredientAliasIndex(): Map<string, IngredientId> {
  const index = new Map<string, IngredientId>();
  for (const entry of INGREDIENT_CATALOG) {
    for (const alias of entry.aliases) {
      index.set(normalizeIngredientLabel(alias), entry.internalId);
    }
  }
  return index;
}

export function isKnownIngredientId(id: string): id is IngredientId {
  return VALID_INTERNAL_IDS.has(id);
}

export function getIngredientEntry(
  id: IngredientId,
): IngredientCatalogEntry | null {
  return CATALOG_BY_ID.get(id) ?? null;
}
