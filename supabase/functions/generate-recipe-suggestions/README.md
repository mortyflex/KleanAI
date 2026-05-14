# `generate-recipe-suggestions` — Supabase Edge Function

## What it does

Takes a structured request describing the user's confirmed fridge
(mapped catalog ids + their localized labels + free-text unmapped labels),
their goal, dietary restrictions, meal type and target macros, and asks
Google Gemini to compose **culinary-sensible** recipes that only use the
provided ingredients (plus universal pantry items: salt, pepper, water).

Returns a strict JSON object matching `AIRecipesResponseRaw` in
`src/types/ai.types.ts`. The client (`EdgeFunctionAIProvider`) calls this
endpoint when `EXPO_PUBLIC_AI_PROVIDER=edge-function`.

## Why we need this server-side

The Gemini API key (`GEMINI_API_KEY`) lives in Supabase secrets and never
ships in the Expo bundle. Same pattern as `analyze-fridge-images`.

## Prompt design (summary)

The prompt enforces four hard constraints:

1. **Ingredient closure** — never invent items outside the provided lists.
2. **Restriction safety** — never produce a recipe that violates any
   declared dietary restriction (vegan, vegetarian, gluten_free, etc.).
3. **Culinary coherence** — recipes must taste sensible. If the user only
   has incompatible items (e.g. yogurt + soy sauce), return an empty list.
4. **Realistic quantities + macros** — every ingredient line includes a
   per-portion quantity (e.g. `150 g chicken breast`); macros must be
   coherent with those quantities, not random numbers.

Output is in the user's language (FR / EN). Tags come from a closed set.

## Configuring `GEMINI_API_KEY`

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set GEMINI_API_KEY=AIzaSy...
# Optional: pin a specific model
supabase secrets set GEMINI_MODEL=gemini-flash-latest
```

## Deploying

```bash
supabase functions deploy generate-recipe-suggestions
```

## Local invocation (debug)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/generate-recipe-suggestions" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "content-type: application/json" \
  -d '{
        "promptVersion":"recipe-suggestions/v1",
        "mappedIngredientIds":["chicken_breast","brown_rice","broccoli"],
        "mappedIngredientLabels":["Chicken breast","Brown rice","Broccoli"],
        "unmappedIngredientLabels":["Ketchup"],
        "goal":"recomposition",
        "restrictions":[],
        "mealType":"lunch",
        "desiredCount":1,
        "language":"fr"
      }'
```

## Failure handling on the client

The `EdgeFunctionAIProvider.generateRecipeSuggestions` falls back to the
client-side culinary-pattern engine (`src/lib/ai/mock-recipe-suggestions.ts`)
when:

- this Edge Function is not deployed yet,
- the Edge Function returns a non-2xx response,
- the network is down.

The client engine respects the same hard rules (ingredient closure,
restriction safety, culinary coherence, quantities) so the user always
sees safe output, even if degraded compared to a real Gemini call.
