# Nutrition feature

This folder owns the daily nutrition plan, the meal-suggestion engine,
the lightweight per-meal consumption tracker, and (Phase 12.3+) the
hybrid recipe engine that powers Fridge Vision-aware recipe
recommendations and the premium Nutrition Today screen.

## Phase 12.3 — Hybrid recipe engine

### High-level flow

1. The user **scans their fridge** (`/vision/fridge`). Gemini returns
   detections; the parser splits them into `mapped` / `unmapped`. The user
   confirms which items they actually have.
2. After saving, the screen offers **"Pick a recipe now"** which navigates
   to the meal-type chooser (`/recipes/meal-choice`).
3. On the chooser, the user picks **breakfast / lunch / dinner / snack**
   (or "plan my full day"), which navigates to the recipe list.
4. The list (`/recipes/list?mealType=lunch`) renders **up to 3 cards** for
   the requested meal type. The cards blend our internal catalog with
   AI-generated recipes (only when internal matches don't fill the limit).
5. Tapping **View recipe** opens `/recipes/detail?...` with steps,
   ingredients, optional ingredients, and a "Why it fits" section. Tapping
   **Choose** persists the snapshot for today via `useChosenRecipes` and
   redirects to the Nutrition Today tab, where the meal slot is now filled.
6. The Nutrition Today screen surfaces the chosen recipe in its slot card
   alongside the kcal/protein estimates and the "Change" / "Adapt with my
   fridge" CTAs.

### Internal recipe catalog

`src/features/nutrition/data/recipe-catalog.ts` is a curated list of
~45 recipes across the four meal slots, the four supported goals, and
all the dietary restrictions we recognise.

#### Adding a new internal recipe

1. Append a new entry to `RECIPE_CATALOG`. Required fields are documented
   on the `InternalRecipe` interface in
   `src/types/recipe.types.ts`. Use `compatibleWith()` to express the
   restriction whitelist (omit the conflicts).
2. Add the corresponding i18n keys under
   `nutrition.recipes.items.<id>` in **both**
   `src/locales/en/common.json` and `src/locales/fr/common.json`. The
   `stepKey()` helper in the catalog file derives the step keys for you,
   so just add `steps.1`, `steps.2`, … entries matching the count you
   passed.
3. The scoring engine picks the recipe up automatically — no further
   wiring is needed.

Things to keep in mind:

- Stick to ingredient ids that exist in the
  `vision/data/ingredient-catalog.ts`. Use `optionalIngredientIds` for
  helpful-but-not-required items (e.g. olive oil, herbs) so they don't
  pollute the "missing ingredients" list shown on cards.
- The nutritional fields (`estimatedCalories`, `estimatedProteinG`, etc.)
  are estimates; the UI labels them with the `~` prefix and a disclaimer.
  Aim for sane averages, not medical precision.
- Keep `prepTimeMinutes <= 35` for "main" recipes and `<= 5` for `no_cook`
  snacks.

### Deterministic scoring

`src/features/nutrition/utils/recipe-engine.ts` exposes the pure scoring
functions used everywhere else:

- `scoreRecipeAgainstFridge(recipe, ctx)` — base score: required
  ingredient matches, optional bonuses, missing penalty, goal alignment,
  simplicity bonus, calorie-target proximity.
- `filterRecipesByRestrictions(recipes, restrictions)` — hard exclusion
  applied **before** scoring. Restrictions always win over fridge matches.
- `rankRecipesForGoal(opts)` / `getRecipesForMealType(mealType, opts)` /
  `getFridgeAwareRecipes(opts)` — convenience wrappers.
- `getFullDayRecipePlan(opts)` — picks one recipe per meal slot, biased
  by per-slot kcal targets when `targetDailyKcal` is provided.

The cap is `MAX_RECIPES_PER_MEAL_TYPE = 3` — never exceeded.

### Hybrid AI fallback

`src/features/nutrition/services/recipe-suggestion.service.ts` wraps the
internal engine. When fewer than 3 internal recipes match the requested
mealType, it asks the active `AIProvider` for the missing slots:

1. The provider must implement the optional `generateRecipeSuggestions`
   method (the `MockAIProvider` does; the real `EdgeFunctionAIProvider`
   does not yet, so the service falls back to internal-only when running
   in `EXPO_PUBLIC_AI_PROVIDER=edge-function` mode).
2. The AI response is validated with Zod
   (`utils/parse-ai-recipes.ts`). Anything that fails parsing produces
   `{ ok: false, reason: 'invalid_schema' }` — the UI then renders the
   internal-only matches.
3. After parsing, `filterAIRecipes` re-applies the restriction filter
   defensively. The AI is **never** the source of truth for restrictions
   or other safety rules.
4. Surviving AI recipes are tagged with `source: 'ai'` and rendered with
   a discreet "AI suggested" badge.

### Estimates & disclaimers

Every kcal / protein number rendered in the UI is prefixed with `~` and
accompanied by a caption disclaimer (`recipes.estimates.disclaimer`).
Klean AI is **not** a medical/nutrition tool — the engine exists to
suggest realistic options, not to compute exact macros.

### What stays local

For Phase 12.3 the following live in AsyncStorage only — the server
sync of recipe choices lands later, alongside the broader nutrition
read-sync work:

- `@klean_confirmed_fridge.unmappedLabels` — confirmed unmapped items.
- `@klean_chosen_recipes_<YYYY-MM-DD>` — per-day per-mealType chosen
  recipe snapshots (`ChosenRecipeSnapshot`). One file per day so the
  per-day rollover is automatic.
- AI logs (`recordAILog`) — still in-memory only.

### Manual testing the full flow

1. `npx expo start --clear`.
2. Open the Nutrition tab. Tap **Scan my fridge** (or any meal slot —
   "Adapt with my fridge" routes to the same screen if the fridge is
   empty).
3. Pick a real photo (or use the dev mock CTA in `__DEV__`). Tap
   **Detect ingredients**.
4. Confirm at least one mapped item and one unmapped item. Save.
5. The success screen now offers **Pick a recipe now** — tap it.
6. Pick a meal type. The list screen shows up to 3 recipes, biased by
   the fridge.
7. Tap a recipe card's **View recipe** → detail screen. Tap **Choose**.
8. You land back on Nutrition Today with the chosen recipe surfacing in
   the meal slot. Tap **I ate this** to verify the kcal/protein bars
   update.
9. Tap **Change** on the same slot → recipe list reopens for the same
   meal type so you can swap. Tap **Plan my full day** from the meal
   chooser to verify the four-recipe planner.

### What's still mocked

- `MockAIProvider.generateRecipeSuggestions` returns deterministic stub
  recipes — enough to exercise the hybrid path in dev. No real Gemini
  call is ever made by `npm test`.
- The real Gemini implementation of `generateRecipeSuggestions` (an Edge
  Function similar to `analyze-fridge-images`) lands in a later phase.
