// deno-lint-ignore-file
// @ts-nocheck — runs in the Supabase Deno Edge runtime, excluded from `tsc` and `jest`.
//
// Endpoint: POST /functions/v1/generate-recipe-suggestions
//
// Asks Google Gemini to generate culinary-sensible recipes from the user's
// confirmed fridge ingredients (mapped catalog ids + their localized labels +
// any free-text unmapped labels). Returns a strict JSON payload that matches
// `AIRecipesResponseRaw` in src/types/ai.types.ts.
//
// Safety / quality contract enforced by the prompt:
//   - The model must NEVER invent ingredients outside the provided list
//     (only universal pantry items: salt, pepper, water).
//   - The model must respect ALL declared dietary restrictions.
//   - The model must return zero recipes when no sensible combination
//     exists — better an empty list than a nonsense bowl.
//   - Output is in the user's language (FR / EN).

const SCHEMA_VERSION = "1";
const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_ENDPOINT = (model: string, apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

const ALLOWED_GOALS = new Set([
  "lose_weight",
  "gain_muscle",
  "maintain",
  "recomposition",
]);
const ALLOWED_MEAL_TYPES = new Set(["breakfast", "lunch", "dinner", "snack"]);
const ALLOWED_TAGS = new Set([
  "high_protein",
  "quick",
  "low_calorie",
  "mass_gain",
  "recomposition",
  "vegetarian",
  "budget",
  "no_cook",
]);

interface RecipeRequest {
  promptVersion: string;
  mappedIngredientIds: string[];
  mappedIngredientLabels: string[];
  unmappedIngredientLabels: string[];
  goal: "lose_weight" | "gain_muscle" | "maintain" | "recomposition";
  restrictions: string[];
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  desiredCount: number;
  targetKcal?: number;
  targetProteinG?: number;
  language?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function validatePayload(
  raw: unknown,
): { ok: true; payload: RecipeRequest } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "Body must be a JSON object." };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.promptVersion !== "string") {
    return { ok: false, reason: "Missing promptVersion." };
  }
  if (
    !isStringArray(obj.mappedIngredientIds) ||
    !isStringArray(obj.mappedIngredientLabels) ||
    obj.mappedIngredientIds.length !== obj.mappedIngredientLabels.length
  ) {
    return {
      ok: false,
      reason:
        "mappedIngredientIds and mappedIngredientLabels must be parallel string arrays.",
    };
  }
  if (!isStringArray(obj.unmappedIngredientLabels)) {
    return { ok: false, reason: "unmappedIngredientLabels must be a string array." };
  }
  if (typeof obj.goal !== "string" || !ALLOWED_GOALS.has(obj.goal)) {
    return { ok: false, reason: "Invalid goal." };
  }
  if (!isStringArray(obj.restrictions)) {
    return { ok: false, reason: "restrictions must be a string array." };
  }
  if (typeof obj.mealType !== "string" || !ALLOWED_MEAL_TYPES.has(obj.mealType)) {
    return { ok: false, reason: "Invalid mealType." };
  }
  if (
    typeof obj.desiredCount !== "number" ||
    obj.desiredCount < 1 ||
    obj.desiredCount > 5
  ) {
    return { ok: false, reason: "desiredCount must be 1-5." };
  }
  return {
    ok: true,
    payload: obj as RecipeRequest,
  };
}

function buildPrompt(req: RecipeRequest): string {
  const isFr = (req.language ?? "en").toLowerCase().startsWith("fr");
  const langName = isFr ? "French (français)" : "English";

  const mappedList = req.mappedIngredientLabels.length
    ? req.mappedIngredientLabels.map((l) => `- ${l}`).join("\n")
    : "(none)";
  const unmappedList = req.unmappedIngredientLabels.length
    ? req.unmappedIngredientLabels.map((l) => `- ${l}`).join("\n")
    : "(none)";
  const restrictionsList = req.restrictions.length
    ? req.restrictions.join(", ")
    : "(none)";

  return `You are a friendly, expert cook helping a user of a fitness nutrition app.

GOAL CONTEXT
- Meal type: ${req.mealType}
- User goal: ${req.goal}
- Dietary restrictions (HARD constraints — never violate): ${restrictionsList}
${req.targetKcal ? `- Approximate target calories: ${req.targetKcal} kcal\n` : ""}${
    req.targetProteinG ? `- Approximate target protein: ${req.targetProteinG} g\n` : ""
  }- Desired number of recipes: ${req.desiredCount}
- Output language: ${langName}

CONFIRMED INGREDIENTS FROM THE USER'S FRIDGE (use ONLY these + universal pantry: salt, pepper, water)
${mappedList}

OTHER ITEMS THE USER CONFIRMED (free-text — most are sauces / spices / condiments)
${unmappedList}

HARD RULES
1. Never invent ingredients outside the lists above (universal pantry — salt, pepper, water — is allowed).
2. Never violate any dietary restriction. If "vegan" is listed, no animal products at all (no eggs, no dairy, no honey, no meat/fish). Same logic for vegetarian / gluten_free / lactose_free / halal / kosher.
3. Recipes must make CULINARY sense. Do not pair ingredients that taste bad together (e.g. yogurt + soy sauce + asparagus). If you cannot build a sensible recipe with what the user has, return an empty "recipes" array.
4. Each recipe must include realistic per-ingredient quantities written inside the ingredient labels (e.g. "150 g chicken breast", "1 tbsp olive oil", "2 eggs"). Use the user's language for unit names.
5. Steps must be short, actionable, in the user's language.
6. Calorie / macro estimates must be coherent with the quantities you choose — not random numbers.
7. Tags must come from this closed set: high_protein, quick, low_calorie, mass_gain, recomposition, vegetarian, budget, no_cook.

RESPONSE FORMAT (strict JSON, no markdown fences, no prose around it)
{
  "schemaVersion": "1",
  "recipes": [
    {
      "title": "string",
      "description": "string (1-2 sentences)",
      "ingredientLabels": ["150 g ...", "..."],
      "steps": ["short imperative step", "..."],
      "prepTimeMinutes": 0,
      "difficulty": "easy",
      "estimatedCalories": 0,
      "estimatedProteinG": 0,
      "estimatedCarbsG": 0,
      "estimatedFatG": 0,
      "tags": ["..."]
    }
  ],
  "modelNotes": "optional"
}

If no sensible recipe is possible with the available ingredients, return:
{ "schemaVersion": "1", "recipes": [], "modelNotes": "no sensible combination" }
`;
}

function extractJsonText(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return text.trim();
}

function sanitizeResponse(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (obj.schemaVersion !== SCHEMA_VERSION) return null;
  const recipes = Array.isArray(obj.recipes) ? obj.recipes : [];

  const cleaned = recipes
    .map((r) => {
      if (!r || typeof r !== "object") return null;
      const recipe = r as Record<string, unknown>;
      const tags = Array.isArray(recipe.tags)
        ? (recipe.tags as unknown[]).filter(
            (t): t is string => typeof t === "string" && ALLOWED_TAGS.has(t),
          )
        : [];
      return {
        title: String(recipe.title ?? ""),
        description: String(recipe.description ?? ""),
        ingredientLabels: Array.isArray(recipe.ingredientLabels)
          ? (recipe.ingredientLabels as unknown[]).map((s) => String(s))
          : [],
        steps: Array.isArray(recipe.steps)
          ? (recipe.steps as unknown[]).map((s) => String(s))
          : [],
        prepTimeMinutes: Number(recipe.prepTimeMinutes ?? 0),
        difficulty: recipe.difficulty === "medium" ? "medium" : "easy",
        estimatedCalories: Number(recipe.estimatedCalories ?? 0),
        estimatedProteinG: Number(recipe.estimatedProteinG ?? 0),
        estimatedCarbsG: Number(recipe.estimatedCarbsG ?? 0),
        estimatedFatG: Number(recipe.estimatedFatG ?? 0),
        tags,
      };
    })
    .filter(Boolean);

  return {
    schemaVersion: SCHEMA_VERSION,
    recipes: cleaned,
    modelNotes:
      typeof obj.modelNotes === "string" ? obj.modelNotes : undefined,
  };
}

async function callGemini(
  apiKey: string,
  prompt: string,
): Promise<{ ok: true; text: string } | { ok: false; reason: string; status: number }> {
  const model = Deno.env.get("GEMINI_MODEL") || DEFAULT_GEMINI_MODEL;
  const url = GEMINI_ENDPOINT(model, apiKey);
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      response_mime_type: "application/json",
    },
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      ok: false,
      reason: `network error: ${(err as Error).message}`,
      status: 502,
    };
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return {
      ok: false,
      reason: `gemini upstream error ${response.status}: ${detail.slice(0, 200)}`,
      status: 502,
    };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { ok: false, reason: "gemini returned non-JSON", status: 502 };
  }

  const text =
    (json as any)?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (typeof text !== "string" || text.length === 0) {
    return { ok: false, reason: "gemini response missing text", status: 502 };
  }
  return { ok: true, text };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonResponse(
      {
        error: "missing_key",
        message: "GEMINI_API_KEY secret is not configured.",
      },
      500,
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  const validation = validatePayload(raw);
  if (!validation.ok) {
    return jsonResponse(
      { error: "invalid_payload", message: validation.reason },
      400,
    );
  }

  const prompt = buildPrompt(validation.payload);
  const gemini = await callGemini(apiKey, prompt);
  if (!gemini.ok) {
    return jsonResponse(
      { error: "gemini_failed", message: gemini.reason },
      gemini.status,
    );
  }

  const text = extractJsonText(gemini.text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return jsonResponse({ error: "model_invalid_json" }, 502);
  }
  const sanitized = sanitizeResponse(parsed);
  if (!sanitized) {
    return jsonResponse({ error: "model_invalid_schema" }, 502);
  }
  return jsonResponse(sanitized);
});
