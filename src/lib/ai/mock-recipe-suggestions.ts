import type {
  AIRecipeRequest,
  AIRecipesResponseRaw,
  IngredientId,
} from '../../types/ai.types';

/**
 * Client-side pattern engine used as a stand-in for the real Gemini recipe
 * generation Edge Function. Unlike a naive template that piles every
 * available ingredient into a single bowl, this engine:
 *
 *   1. classifies the user's confirmed mapped ingredients into culinary
 *      roles (protein / carb / veg / fruit / dairy / fat / nuts / eggs),
 *   2. classifies their unmapped ingredients heuristically as
 *      sauce/condiment when the label hints at one,
 *   3. matches the available roles against a small set of curated
 *      culinary "patterns" appropriate for the requested meal type,
 *   4. returns a recipe ONLY when a pattern's required slots are filled
 *      with sensible items — otherwise an empty `recipes: []` is returned
 *      so the UI shows the "AI suggestions unavailable" hint instead of a
 *      nonsense bowl.
 *
 * The output is fully localized in the user's language (FR / EN). It
 * never echoes raw catalog ids like `greek_yogurt` into user-facing copy.
 */

// ── Roles ────────────────────────────────────────────────────────────────

type CulinaryRole =
  | 'protein_meat'
  | 'protein_fish'
  | 'protein_egg'
  | 'protein_dairy'
  | 'protein_plant'
  | 'carb_grain'
  | 'carb_starchy'
  | 'veg'
  | 'fruit'
  | 'fat'
  | 'nuts'
  | 'oats';

const ROLE_BY_ID: Record<string, CulinaryRole> = {
  chicken_breast: 'protein_meat',
  turkey: 'protein_meat',
  beef: 'protein_meat',
  salmon: 'protein_fish',
  tuna: 'protein_fish',
  eggs: 'protein_egg',
  greek_yogurt: 'protein_dairy',
  cottage_cheese: 'protein_dairy',
  tofu: 'protein_plant',
  lentils: 'protein_plant',
  chickpeas: 'protein_plant',
  brown_rice: 'carb_grain',
  quinoa: 'carb_grain',
  oats: 'oats',
  sweet_potato: 'carb_starchy',
  spinach: 'veg',
  broccoli: 'veg',
  tomato: 'veg',
  bell_pepper: 'veg',
  banana: 'fruit',
  apple: 'fruit',
  berries: 'fruit',
  olive_oil: 'fat',
  almonds: 'nuts',
  avocado: 'fat',
};

interface ClassifiedIngredient {
  id: IngredientId;
  label: string;
  role: CulinaryRole;
}

function classifyMapped(
  ids: IngredientId[],
  labels: string[],
): ClassifiedIngredient[] {
  const out: ClassifiedIngredient[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const role = ROLE_BY_ID[id];
    if (!role) continue;
    out.push({
      id,
      label: labels[i] ?? titleCase(id.replace(/_/g, ' ')),
      role,
    });
  }
  return out;
}

// ── Unmapped: only used as accents (sauce/spice) when the label hints at it ──

const SAUCE_HINTS = [
  'sauce',
  'ketchup',
  'mayo',
  'moutarde',
  'mustard',
  'vinaigre',
  'vinegar',
  'soy',
  'soja',
  'sriracha',
  'harissa',
  'pesto',
  'tahini',
  'hummus',
  'salsa',
];

const SPICE_HINTS = [
  'pepper',
  'poivre',
  'salt',
  'sel',
  'paprika',
  'cumin',
  'curry',
  'cinnamon',
  'cannelle',
  'ginger',
  'gingembre',
  'garlic',
  'ail',
  'oregano',
  'origan',
  'basil',
  'basilic',
  'thyme',
  'thym',
];

interface ClassifiedAccent {
  label: string;
  kind: 'sauce' | 'spice';
}

function titleCase(input: string): string {
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function classifyUnmapped(rawLabels: string[]): ClassifiedAccent[] {
  const out: ClassifiedAccent[] = [];
  for (const raw of rawLabels) {
    const lc = raw.toLowerCase();
    const isSauce = SAUCE_HINTS.some((h) => lc.includes(h));
    const isSpice = !isSauce && SPICE_HINTS.some((h) => lc.includes(h));
    if (!isSauce && !isSpice) continue;
    out.push({ label: titleCase(raw), kind: isSauce ? 'sauce' : 'spice' });
  }
  return out;
}

// ── Patterns ─────────────────────────────────────────────────────────────

type MealType = AIRecipeRequest['mealType'];

interface PatternResult {
  title: string;
  description: string;
  steps: string[];
  ingredientLabels: string[];
  estimatedCalories: number;
  estimatedProteinG: number;
  estimatedCarbsG: number;
  estimatedFatG: number;
  prepTimeMinutes: number;
  difficulty: 'easy' | 'medium';
  tags: string[];
}

interface PatternContext {
  isFr: boolean;
  mealType: MealType;
  goal: AIRecipeRequest['goal'];
  mapped: ClassifiedIngredient[];
  accents: ClassifiedAccent[];
}

function pick(role: CulinaryRole, mapped: ClassifiedIngredient[]) {
  return mapped.find((m) => m.role === role);
}

function pickAny(roles: CulinaryRole[], mapped: ClassifiedIngredient[]) {
  for (const r of roles) {
    const hit = mapped.find((m) => m.role === r);
    if (hit) return hit;
  }
  return undefined;
}

function pickProtein(mapped: ClassifiedIngredient[]) {
  return pickAny(
    [
      'protein_meat',
      'protein_fish',
      'protein_egg',
      'protein_plant',
      'protein_dairy',
    ],
    mapped,
  );
}

const goalTags = (goal: AIRecipeRequest['goal']): string[] => {
  switch (goal) {
    case 'gain_muscle':
      return ['high_protein', 'mass_gain'];
    case 'lose_weight':
      return ['low_calorie', 'high_protein'];
    case 'recomposition':
      return ['high_protein', 'recomposition'];
    default:
      return ['high_protein'];
  }
};

// Pattern: SAVORY BOWL — needs protein + (carb OR carb_starchy) + veg.
function patternSavoryBowl(ctx: PatternContext): PatternResult | null {
  const protein = pickProtein(ctx.mapped);
  const carb = pickAny(['carb_grain', 'carb_starchy'], ctx.mapped);
  const veg = pick('veg', ctx.mapped);
  if (!protein || !carb || !veg) return null;
  const fat = pick('fat', ctx.mapped);
  const accent = ctx.accents[0];

  const title = ctx.isFr
    ? `Bol ${protein.label.toLowerCase()} & ${carb.label.toLowerCase()}`
    : `${titleCase(protein.label)} & ${carb.label} bowl`;

  const description = ctx.isFr
    ? `Une assiette équilibrée avec ${protein.label.toLowerCase()}, ${carb.label.toLowerCase()} et ${veg.label.toLowerCase()}${accent ? `, relevée par ${accent.label.toLowerCase()}` : ''}.`
    : `A balanced plate of ${protein.label.toLowerCase()}, ${carb.label.toLowerCase()} and ${veg.label.toLowerCase()}${accent ? `, lifted with ${accent.label.toLowerCase()}` : ''}.`;

  const steps = ctx.isFr
    ? [
        `Cuis ${carb.label.toLowerCase()} jusqu'à tendreté.`,
        `Cuis ${protein.label.toLowerCase()} à la poêle, à feu moyen, jusqu'à cuisson complète.`,
        `Pendant ce temps, prépare ${veg.label.toLowerCase()} (vapeur ou poêle).`,
        `Dresse l'ensemble dans un bol${fat ? ` avec ${fat.label.toLowerCase()}` : ''}${accent ? ` et ajoute ${accent.label.toLowerCase()}` : ''}.`,
      ]
    : [
        `Cook the ${carb.label.toLowerCase()} until tender.`,
        `Pan-cook the ${protein.label.toLowerCase()} over medium heat until done.`,
        `Meanwhile prepare the ${veg.label.toLowerCase()} (steam or sauté).`,
        `Plate everything in a bowl${fat ? ` with ${fat.label.toLowerCase()}` : ''}${accent ? ` and add ${accent.label.toLowerCase()}` : ''}.`,
      ];

  const labels = [
    ctx.isFr ? `150 g · ${protein.label}` : `150 g · ${protein.label}`,
    ctx.isFr ? `80 g · ${carb.label}` : `80 g · ${carb.label}`,
    ctx.isFr ? `150 g · ${veg.label}` : `150 g · ${veg.label}`,
    ...(fat
      ? [ctx.isFr ? `1 c. à soupe · ${fat.label}` : `1 tbsp · ${fat.label}`]
      : []),
    ...(accent ? [accent.label] : []),
  ];

  const baseKcal = ctx.goal === 'gain_muscle' ? 600 : 500;
  return {
    title,
    description,
    steps,
    ingredientLabels: labels,
    estimatedCalories: baseKcal + (accent ? 80 : 0),
    estimatedProteinG: ctx.goal === 'gain_muscle' ? 42 : 36,
    estimatedCarbsG: 55,
    estimatedFatG: 18 + (accent ? 4 : 0),
    prepTimeMinutes: 22,
    difficulty: 'easy',
    tags: ['quick', ...goalTags(ctx.goal)],
  };
}

// Pattern: PROTEIN PLATE — protein + veg, no carb required.
function patternProteinPlate(ctx: PatternContext): PatternResult | null {
  const protein = pickProtein(ctx.mapped);
  const veg = pick('veg', ctx.mapped);
  if (!protein || !veg) return null;
  const fat = pick('fat', ctx.mapped);
  const accent = ctx.accents[0];

  const title = ctx.isFr
    ? `Assiette ${protein.label.toLowerCase()} & ${veg.label.toLowerCase()}`
    : `${titleCase(protein.label)} & ${veg.label} plate`;

  const description = ctx.isFr
    ? `Une assiette protéinée et légère : ${protein.label.toLowerCase()} avec ${veg.label.toLowerCase()}.`
    : `A protein-rich, light plate of ${protein.label.toLowerCase()} with ${veg.label.toLowerCase()}.`;

  const steps = ctx.isFr
    ? [
        `Cuis ${protein.label.toLowerCase()} jusqu'à cuisson juste.`,
        `Cuis ${veg.label.toLowerCase()} à la vapeur ou à la poêle.`,
        `Sers ensemble${fat ? ` avec un filet de ${fat.label.toLowerCase()}` : ''}${accent ? ` et un peu de ${accent.label.toLowerCase()}` : ''}.`,
      ]
    : [
        `Cook the ${protein.label.toLowerCase()} until just done.`,
        `Steam or sauté the ${veg.label.toLowerCase()}.`,
        `Plate together${fat ? ` with a drizzle of ${fat.label.toLowerCase()}` : ''}${accent ? ` and a touch of ${accent.label.toLowerCase()}` : ''}.`,
      ];

  return {
    title,
    description,
    steps,
    ingredientLabels: [
      `150 g · ${protein.label}`,
      `150 g · ${veg.label}`,
      ...(fat
        ? [ctx.isFr ? `1 c. à soupe · ${fat.label}` : `1 tbsp · ${fat.label}`]
        : []),
      ...(accent ? [accent.label] : []),
    ],
    estimatedCalories: 380 + (accent ? 60 : 0),
    estimatedProteinG: 38,
    estimatedCarbsG: 14,
    estimatedFatG: 18,
    prepTimeMinutes: 18,
    difficulty: 'easy',
    tags: ['low_calorie', 'high_protein', ...goalTags(ctx.goal).slice(1)],
  };
}

// Pattern: OMELETTE — eggs + veg.
function patternOmelette(ctx: PatternContext): PatternResult | null {
  const eggs = pick('protein_egg', ctx.mapped);
  const veg = pick('veg', ctx.mapped);
  if (!eggs || !veg) return null;
  const fat = pick('fat', ctx.mapped);
  const dairy = pick('protein_dairy', ctx.mapped);
  const accent = ctx.accents.find((a) => a.kind === 'spice');

  const title = ctx.isFr
    ? `Omelette ${veg.label.toLowerCase()}${dairy ? ` & ${dairy.label.toLowerCase()}` : ''}`
    : `${veg.label} omelette${dairy ? ` with ${dairy.label.toLowerCase()}` : ''}`;

  const description = ctx.isFr
    ? `Une omelette moelleuse aux ${veg.label.toLowerCase()}${dairy ? ` et un peu de ${dairy.label.toLowerCase()}` : ''}.`
    : `A fluffy omelette with ${veg.label.toLowerCase()}${dairy ? ` and a touch of ${dairy.label.toLowerCase()}` : ''}.`;

  const steps = ctx.isFr
    ? [
        `Bats les œufs avec une pincée de sel${accent ? ` et un peu de ${accent.label.toLowerCase()}` : ''}.`,
        `Fais revenir ${veg.label.toLowerCase()} dans${fat ? ` ${fat.label.toLowerCase()}` : ' un peu de matière grasse'}.`,
        `Verse les œufs et cuis à feu doux jusqu'à prise${dairy ? ` ; parsème ${dairy.label.toLowerCase()} avant de plier` : ''}.`,
      ]
    : [
        `Whisk the eggs with a pinch of salt${accent ? ` and a touch of ${accent.label.toLowerCase()}` : ''}.`,
        `Sauté the ${veg.label.toLowerCase()} in${fat ? ` ${fat.label.toLowerCase()}` : ' a little fat'}.`,
        `Pour in the eggs and cook gently until set${dairy ? `; sprinkle ${dairy.label.toLowerCase()} before folding` : ''}.`,
      ];

  return {
    title,
    description,
    steps,
    ingredientLabels: [
      ctx.isFr ? `3 pièces · ${eggs.label}` : `3 pieces · ${eggs.label}`,
      `80 g · ${veg.label}`,
      ...(dairy ? [`50 g · ${dairy.label}`] : []),
      ...(fat
        ? [ctx.isFr ? `1 c. à soupe · ${fat.label}` : `1 tbsp · ${fat.label}`]
        : []),
      ...(accent ? [accent.label] : []),
    ],
    estimatedCalories: 360 + (dairy ? 80 : 0),
    estimatedProteinG: 26 + (dairy ? 6 : 0),
    estimatedCarbsG: 8,
    estimatedFatG: 24,
    prepTimeMinutes: 10,
    difficulty: 'easy',
    tags: ['quick', 'high_protein'],
  };
}

// Pattern: PORRIDGE — oats + (fruit OR dairy).
function patternPorridge(ctx: PatternContext): PatternResult | null {
  const oats = pick('oats', ctx.mapped);
  const fruit = pick('fruit', ctx.mapped);
  const dairy = pick('protein_dairy', ctx.mapped);
  if (!oats || (!fruit && !dairy)) return null;
  const nuts = pick('nuts', ctx.mapped);

  const topping = fruit ?? dairy!;
  const title = ctx.isFr
    ? `Porridge à ${topping.label.toLowerCase()}`
    : `${titleCase(topping.label)} porridge`;
  const description = ctx.isFr
    ? `Un porridge réconfortant aux ${oats.label.toLowerCase()}${dairy ? ` et ${dairy.label.toLowerCase()}` : ''}${fruit ? `, garni de ${fruit.label.toLowerCase()}` : ''}.`
    : `A comforting ${oats.label.toLowerCase()} porridge${dairy ? ` made with ${dairy.label.toLowerCase()}` : ''}${fruit ? `, topped with ${fruit.label.toLowerCase()}` : ''}.`;

  const steps = ctx.isFr
    ? [
        `Cuis ${oats.label.toLowerCase()} dans${dairy ? ` ${dairy.label.toLowerCase()} (ou un peu d’eau)` : ' un peu de lait ou d’eau'} jusqu’à obtenir une texture crémeuse.`,
        fruit
          ? `Garnis de ${fruit.label.toLowerCase()}${nuts ? ` et ${nuts.label.toLowerCase()}` : ''}.`
          : `Sers chaud${nuts ? ` avec ${nuts.label.toLowerCase()}` : ''}.`,
      ]
    : [
        `Cook the ${oats.label.toLowerCase()} in${dairy ? ` ${dairy.label.toLowerCase()} (or a little water)` : ' some milk or water'} until creamy.`,
        fruit
          ? `Top with ${fruit.label.toLowerCase()}${nuts ? ` and ${nuts.label.toLowerCase()}` : ''}.`
          : `Serve warm${nuts ? ` with ${nuts.label.toLowerCase()}` : ''}.`,
      ];

  return {
    title,
    description,
    steps,
    ingredientLabels: [
      `50 g · ${oats.label}`,
      ...(dairy ? [`150 g · ${dairy.label}`] : []),
      ...(fruit ? [`80 g · ${fruit.label}`] : []),
      ...(nuts ? [`15 g · ${nuts.label}`] : []),
    ],
    estimatedCalories: 360 + (nuts ? 60 : 0) + (dairy ? 80 : 0),
    estimatedProteinG: 14 + (dairy ? 12 : 0),
    estimatedCarbsG: 50,
    estimatedFatG: 8 + (nuts ? 8 : 0),
    prepTimeMinutes: 8,
    difficulty: 'easy',
    tags: ['quick', 'budget'],
  };
}

// Pattern: YOGURT BOWL — dairy (yogurt/cottage) + fruit.
function patternYogurtBowl(ctx: PatternContext): PatternResult | null {
  const dairy = pick('protein_dairy', ctx.mapped);
  const fruit = pick('fruit', ctx.mapped);
  if (!dairy || !fruit) return null;
  const nuts = pick('nuts', ctx.mapped);
  const oats = pick('oats', ctx.mapped);

  const title = ctx.isFr
    ? `Bol ${dairy.label.toLowerCase()} & ${fruit.label.toLowerCase()}`
    : `${titleCase(dairy.label)} & ${fruit.label} bowl`;
  const description = ctx.isFr
    ? `Un bol frais et protéiné, sans cuisson, avec ${dairy.label.toLowerCase()} et ${fruit.label.toLowerCase()}.`
    : `A fresh, no-cook protein bowl with ${dairy.label.toLowerCase()} and ${fruit.label.toLowerCase()}.`;

  const steps = ctx.isFr
    ? [
        `Verse ${dairy.label.toLowerCase()} dans un bol.`,
        `Garnis de ${fruit.label.toLowerCase()}${oats ? `, ${oats.label.toLowerCase()}` : ''}${nuts ? ` et ${nuts.label.toLowerCase()}` : ''}.`,
      ]
    : [
        `Spoon ${dairy.label.toLowerCase()} into a bowl.`,
        `Top with ${fruit.label.toLowerCase()}${oats ? `, ${oats.label.toLowerCase()}` : ''}${nuts ? ` and ${nuts.label.toLowerCase()}` : ''}.`,
      ];

  return {
    title,
    description,
    steps,
    ingredientLabels: [
      `200 g · ${dairy.label}`,
      `80 g · ${fruit.label}`,
      ...(oats ? [`30 g · ${oats.label}`] : []),
      ...(nuts ? [`15 g · ${nuts.label}`] : []),
    ],
    estimatedCalories: 280 + (oats ? 110 : 0) + (nuts ? 90 : 0),
    estimatedProteinG: 22,
    estimatedCarbsG: 30,
    estimatedFatG: 6 + (nuts ? 8 : 0),
    prepTimeMinutes: 4,
    difficulty: 'easy',
    tags: ['no_cook', 'quick', 'high_protein'],
  };
}

// Pattern: FRUIT & NUTS — snack.
function patternFruitNuts(ctx: PatternContext): PatternResult | null {
  const fruit = pick('fruit', ctx.mapped);
  const nuts = pick('nuts', ctx.mapped);
  if (!fruit || !nuts) return null;
  const title = ctx.isFr
    ? `${titleCase(fruit.label)} & ${nuts.label.toLowerCase()}`
    : `${titleCase(fruit.label)} & ${nuts.label.toLowerCase()}`;
  return {
    title,
    description: ctx.isFr
      ? `Un en-cas simple et rassasiant.`
      : `A simple, satisfying snack.`,
    steps: ctx.isFr
      ? [
          `Coupe ${fruit.label.toLowerCase()} en morceaux.`,
          `Sers avec une poignée de ${nuts.label.toLowerCase()}.`,
        ]
      : [
          `Slice the ${fruit.label.toLowerCase()}.`,
          `Pair with a small handful of ${nuts.label.toLowerCase()}.`,
        ],
    ingredientLabels: [`1 · ${fruit.label}`, `20 g · ${nuts.label}`],
    estimatedCalories: 220,
    estimatedProteinG: 6,
    estimatedCarbsG: 24,
    estimatedFatG: 12,
    prepTimeMinutes: 2,
    difficulty: 'easy',
    tags: ['no_cook', 'quick', 'budget'],
  };
}

// Pattern: SOLO EGGS — snack only.
function patternSoloEggs(ctx: PatternContext): PatternResult | null {
  const eggs = pick('protein_egg', ctx.mapped);
  if (!eggs) return null;
  return {
    title: ctx.isFr ? 'Œufs durs' : 'Hard-boiled eggs',
    description: ctx.isFr
      ? 'Pure protéine, prête en quelques minutes.'
      : 'Pure protein, ready in a few minutes.',
    steps: ctx.isFr
      ? [`Cuis ${eggs.label.toLowerCase()} 9 minutes.`, 'Refroidis, écale, sale.']
      : [`Boil the ${eggs.label.toLowerCase()} for 9 minutes.`, 'Cool, peel, salt.'],
    ingredientLabels: [
      ctx.isFr ? `2 pièces · ${eggs.label}` : `2 pieces · ${eggs.label}`,
    ],
    estimatedCalories: 160,
    estimatedProteinG: 13,
    estimatedCarbsG: 1,
    estimatedFatG: 11,
    prepTimeMinutes: 12,
    difficulty: 'easy',
    tags: ['high_protein', 'low_calorie', 'budget'],
  };
}

// ── Pattern selection per meal type ──────────────────────────────────────

const PATTERNS_BY_MEAL: Record<
  MealType,
  ((ctx: PatternContext) => PatternResult | null)[]
> = {
  breakfast: [patternPorridge, patternYogurtBowl, patternOmelette, patternProteinPlate],
  lunch: [patternSavoryBowl, patternProteinPlate, patternOmelette],
  dinner: [patternSavoryBowl, patternProteinPlate, patternOmelette],
  snack: [patternFruitNuts, patternYogurtBowl, patternSoloEggs],
};

/**
 * Returns up to `desiredCount` recipes that actually make culinary sense
 * for the user's confirmed fridge. Empty array when no pattern matches —
 * the caller surfaces a "we couldn't suggest a recipe with what you have"
 * hint instead of an unappetising mash-up.
 */
export function buildMockRecipeResponse(
  req: AIRecipeRequest,
): AIRecipesResponseRaw {
  const isFr = (req.language ?? 'en').toLowerCase().startsWith('fr');
  const mapped = classifyMapped(
    req.mappedIngredientIds,
    req.mappedIngredientLabels,
  );
  const accents = classifyUnmapped(req.unmappedIngredientLabels);

  const ctx: PatternContext = {
    isFr,
    mealType: req.mealType,
    goal: req.goal,
    mapped,
    accents,
  };

  const results: PatternResult[] = [];
  const seenTitles = new Set<string>();
  for (const pattern of PATTERNS_BY_MEAL[req.mealType]) {
    if (results.length >= req.desiredCount) break;
    const r = pattern(ctx);
    if (!r) continue;
    if (seenTitles.has(r.title)) continue;
    seenTitles.add(r.title);
    results.push(r);
  }

  return {
    schemaVersion: '1',
    recipes: results.map((r) => ({
      title: r.title,
      description: r.description,
      ingredientLabels: r.ingredientLabels,
      steps: r.steps,
      prepTimeMinutes: r.prepTimeMinutes,
      difficulty: r.difficulty,
      estimatedCalories: r.estimatedCalories,
      estimatedProteinG: r.estimatedProteinG,
      estimatedCarbsG: r.estimatedCarbsG,
      estimatedFatG: r.estimatedFatG,
      tags: r.tags,
    })),
    modelNotes: 'client-side pattern engine — fallback when the Gemini recipe edge function is unreachable',
  };
}
