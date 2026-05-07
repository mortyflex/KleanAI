# `analyze-fridge-images` — Edge Function

Server-side bridge between the Klean AI app and Google Gemini Vision.

## Why an Edge Function?

The Gemini API key must **never** ship in the Expo bundle. The app posts the
photo (base64) to this function, which signs the call with the secret key
held in Supabase, and returns a strict JSON response that matches
`FridgeVisionResponseRaw` (`src/types/ai.types.ts`).

## Deploy

```bash
# 1. Set the Gemini key once (server-side secret, never exposed to clients).
supabase secrets set GEMINI_API_KEY=AIzaSy...

# 2. (Optional) Override the model. Defaults to `gemini-flash-latest`,
#    which always tracks the current Flash release. Pin a specific version
#    only if you want stable behaviour:
supabase secrets set GEMINI_MODEL=gemini-2.5-flash

# 3. Deploy.
supabase functions deploy analyze-fridge-images
```

> **Note** — the older `gemini-2.0-flash` was deprecated for new Google AI
> Studio accounts in early 2026. If you see `404 NOT_FOUND` from Gemini,
> either keep the default `gemini-flash-latest` or pin a still-available
> version like `gemini-2.5-flash` via `GEMINI_MODEL`.

The function inherits the project's standard JWT verification — calls require
a valid Supabase user JWT (the app sends the anon key as a bearer token plus
the Authorization header from the active session).

To temporarily allow anonymous calls (e.g. preview):

```bash
supabase functions deploy analyze-fridge-images --no-verify-jwt
```

## Request

```http
POST /functions/v1/analyze-fridge-images
Content-Type: application/json
Authorization: Bearer <anon or user JWT>

{
  "images": [
    { "data": "<base64>", "mimeType": "image/jpeg" }
  ],
  "locale": "fr"
}
```

Up to 4 images per request. Allowed mime types:
`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`.

## Response

`200 OK` — JSON identical in shape to `FridgeVisionResponseRaw`:

```json
{
  "schemaVersion": "1",
  "detected": [
    { "label": "Eggs", "confidence": 0.92, "category": "protein_egg" }
  ],
  "modelNotes": "..."
}
```

## Errors (non-2xx)

| Status | `error`               | When                                    |
| ------ | --------------------- | --------------------------------------- |
| 400    | `invalid_json`        | Body is not JSON.                       |
| 400    | `invalid_payload`     | Missing/invalid images, oversized data. |
| 405    | `method_not_allowed`  | Anything other than POST/OPTIONS.       |
| 500    | `missing_gemini_key`  | `GEMINI_API_KEY` is not set on Supabase.|
| 502    | `gemini_error`        | Gemini network or upstream error.       |
| 502    | `invalid_model_json`  | Gemini returned non-JSON text.          |
| 502    | `invalid_model_shape` | Gemini JSON does not have expected keys.|

The app translates these into the existing `provider_error` /
`invalid_schema` failure reasons via the strict Zod parser
(`src/features/vision/utils/parse-fridge-vision.ts`).

## Local notes

This file is a Deno script (uses `Deno.serve` and `fetch` globals). It is
explicitly excluded from the app's `tsc` and `jest` runs — see
`tsconfig.json` and the package.json `jest.testPathIgnorePatterns`.
