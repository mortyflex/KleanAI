// deno-lint-ignore-file
// @ts-nocheck — this file runs in the Supabase Deno Edge runtime, not in the
// app's TypeScript project. It is excluded from `tsc` and `jest`.
//
// Endpoint: POST /functions/v1/analyze-fridge-images
//
// Forwards a fridge/pantry photo to Google Gemini, asks for a strict JSON
// payload that matches `FridgeVisionResponseRaw` in src/types/ai.types.ts,
// validates a few invariants, and returns it as-is. Never returns model
// errors verbatim — the app keeps a graceful failure path.

const SCHEMA_VERSION = "1";
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MAX_PAYLOAD_BYTES = 12 * 1024 * 1024; // 12 MB (base64 of ~9MB image)

// Default model can be overridden by `GEMINI_MODEL` Supabase secret without
// redeploying code — useful when Google rotates / retires older variants.
const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_ENDPOINT = (model: string, apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

function buildPrompt(locale?: string): string {
  const isFr = (locale ?? "en").toLowerCase().startsWith("fr");
  const langName = isFr ? "French (français)" : "English";
  // The internal ingredient catalog has bilingual aliases (e.g. "blanc de
  // poulet" matches the same id as "chicken breast"), so asking Gemini to
  // respond in the user's language does NOT break the downstream mapping.
  return `You are a vision assistant for a fitness nutrition app.
Analyze the provided photo of a fridge or pantry. Detect ONLY foods that are
clearly visible or strongly probable. Never invent ingredients. Never list
non-food items.

LANGUAGE
Write every "label" and every "alias" in ${langName}. Do NOT mix languages.
Examples for French: "blanc de poulet", "yaourt grec", "fruits rouges",
"huile d'olive". Examples for English: "chicken breast", "greek yogurt",
"berries", "olive oil".

For each detected food, return:
- label: short ${langName} label, no brand names
- confidence: number between 0 and 1
- category: one of protein_meat, protein_fish, protein_egg, protein_dairy,
  protein_plant, carb_grain, carb_starchy, vegetable, fruit, fat_oil,
  condiment, beverage, other
- aliases: optional alternative names in ${langName}, lowercase
- quantity: optional, with amount (number) and unit (one of piece, pack,
  bottle, jar, g, ml, unknown). Omit if not visible.
- uncertaintyNote: optional short note in ${langName} if you are unsure

Respond with ONLY a JSON object that matches exactly:
{
  "schemaVersion": "1",
  "detected": [
    {
      "label": "string",
      "confidence": 0.0,
      "category": "vegetable",
      "aliases": ["..."],
      "quantity": { "amount": 0, "unit": "piece" },
      "uncertaintyNote": "..."
    }
  ],
  "modelNotes": "optional string"
}

If nothing is recognisable, return an empty "detected" array. Do not wrap the
JSON in markdown fences. Do not add any prose.`;
}

interface IncomingImage {
  data: string;
  mimeType: string;
}

interface IncomingPayload {
  images: IncomingImage[];
  locale?: string;
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

function isPlainBase64(input: unknown): input is string {
  return typeof input === "string" && /^[A-Za-z0-9+/=\s]+$/.test(input);
}

function validatePayload(raw: unknown): {
  ok: true;
  payload: IncomingPayload;
} | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "Body must be a JSON object." };
  }
  const obj = raw as Record<string, unknown>;
  const images = obj.images;
  if (!Array.isArray(images) || images.length === 0) {
    return { ok: false, reason: "At least one image is required." };
  }
  if (images.length > 4) {
    return { ok: false, reason: "Up to 4 images per request." };
  }
  const cleaned: IncomingImage[] = [];
  for (const item of images) {
    if (!item || typeof item !== "object") {
      return { ok: false, reason: "Each image must be an object." };
    }
    const img = item as Record<string, unknown>;
    if (!isPlainBase64(img.data)) {
      return { ok: false, reason: "Each image.data must be base64 string." };
    }
    if (typeof img.mimeType !== "string" || !ALLOWED_MIME_TYPES.has(img.mimeType)) {
      return { ok: false, reason: "Unsupported image.mimeType." };
    }
    if (img.data.length > MAX_PAYLOAD_BYTES) {
      return { ok: false, reason: "Image too large." };
    }
    cleaned.push({ data: img.data, mimeType: img.mimeType });
  }
  return {
    ok: true,
    payload: {
      images: cleaned,
      locale: typeof obj.locale === "string" ? obj.locale : undefined,
    },
  };
}

function extractJsonText(text: string): string {
  // Gemini occasionally wraps JSON in ```json ... ``` despite our prompt.
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return text.trim();
}

async function callGemini(
  apiKey: string,
  payload: IncomingPayload,
): Promise<{ ok: true; text: string } | { ok: false; reason: string; status: number }> {
  const parts: unknown[] = [{ text: buildPrompt(payload.locale) }];
  for (const img of payload.images) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data,
      },
    });
  }

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: "application/json",
    },
  };

  // @ts-ignore — Deno global only available in the Edge runtime.
  const model = Deno.env.get("GEMINI_MODEL") || DEFAULT_GEMINI_MODEL;

  let response: Response;
  try {
    response = await fetch(GEMINI_ENDPOINT(model, apiKey), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      ok: false,
      status: 502,
      reason: `Gemini network error: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    return {
      ok: false,
      status: 502,
      reason: `Gemini upstream error (${response.status}): ${errText.slice(0, 300)}`,
    };
  }

  let json: any;
  try {
    json = await response.json();
  } catch {
    return { ok: false, status: 502, reason: "Gemini returned non-JSON." };
  }

  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") {
    return { ok: false, status: 502, reason: "Gemini returned empty response." };
  }
  return { ok: true, text };
}

function ensureSchema(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (obj.schemaVersion !== SCHEMA_VERSION) {
    obj.schemaVersion = SCHEMA_VERSION;
  }
  if (!Array.isArray(obj.detected)) {
    obj.detected = [];
  }
  return obj;
}

// deno-lint-ignore no-explicit-any
const handler = async (req: any): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  // @ts-ignore — Deno global only available in the Edge runtime.
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonResponse(
      { error: "missing_gemini_key", message: "GEMINI_API_KEY is not set." },
      500,
    );
  }

  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const validated = validatePayload(bodyJson);
  if (!validated.ok) {
    return jsonResponse({ error: "invalid_payload", message: validated.reason }, 400);
  }

  const gem = await callGemini(apiKey, validated.payload);
  if (!gem.ok) {
    return jsonResponse({ error: "gemini_error", message: gem.reason }, gem.status);
  }

  const cleanedText = extractJsonText(gem.text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedText);
  } catch (err) {
    return jsonResponse(
      {
        error: "invalid_model_json",
        message: err instanceof Error ? err.message : "JSON parse failed",
      },
      502,
    );
  }

  const safe = ensureSchema(parsed);
  if (!safe) {
    return jsonResponse({ error: "invalid_model_shape" }, 502);
  }

  return jsonResponse(safe, 200);
};

// @ts-ignore — Deno.serve is a global in the Edge runtime.
Deno.serve(handler);
