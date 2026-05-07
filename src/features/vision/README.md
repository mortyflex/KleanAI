# Vision feature

This folder contains the **Gym Vision** and **Fridge Vision** flows. They share
the same shape: pick or take photos → ask the active `AIProvider` →
validate/parse the response → map to internal ids → let the user confirm →
persist.

## Fridge Vision — Phase 12.1 (real images, mocked AI)

### What is real now

- `expo-image-picker` is wired into the screen.
- The user can:
  - tap **Take a photo** to open the camera, or
  - tap **Pick from library** to open the photo library, or
  - in `__DEV__` builds only, tap **Use a demo image** to generate a synthetic
    `mock://` URI.
- Picked photos render as thumbnails using `Image` source `{ uri }` —
  iOS/Android `file://` and Android `content://` URIs both work in Expo Go.
- Each photo can be removed or replaced individually.
- Permission denial and picker errors surface a discrete, translated alert
  inside the card.
- Confirmed ingredients are still persisted to AsyncStorage under
  `@klean_confirmed_fridge` and consumed by the meal-suggestion engine.

### What is still mocked

- The AI analysis. `MockAIProvider.analyzeFridgeImages` returns a static
  fixture; no real Gemini call is made and no key is shipped to the client.
- A `mockNotice` translation surfaces this in dev builds:
  > "Test mode: your photos are real, but the AI analysis still uses a sample
  > response."

### Testing in Expo Go

1. `npx expo start --clear`
2. Open the app on a device or simulator with the Expo Go client.
3. Open the **Nutrition** tab and tap the **Scan my fridge** card. (Direct
   route: `/vision/fridge`.)
4. Tap **Take a photo** or **Pick from library**. Grant permissions when iOS
   or Android prompts you.
5. Confirm a thumbnail appears in the preview row.
6. Tap **Detect ingredients** — the mock provider answers with a static set
   (chicken breast, eggs, greek yogurt, …).
7. Toggle ingredients, then **Save my fridge**. The `Fridge saved` screen
   confirms persistence.
8. Open the nutrition screen and verify suggestions adapt to the confirmed
   ingredients.

If the simulator has no media library, use the dev-only **Use a demo image**
button — it bypasses the picker entirely.

### Known limits

- The current UI is **multi-image but mono-pick**: each tap of the picker
  opens a single-image dialog. Multi-select inside one dialog will land
  alongside the real Gemini wiring (Phase 12.2).
- Camera permission requires a development build to open on a real device;
  Expo Go can use the library and the demo button without issue.
- The `Image` thumbnail uses the device URI directly. If the user revokes
  access between picking and rendering, the thumbnail will appear blank —
  acceptable trade-off for now.

## Fridge Vision — Phase 12.2 (real Gemini via Supabase Edge Function)

### What is real now

- `EdgeFunctionAIProvider` (`src/lib/ai/edge-function-provider.ts`) calls
  the Supabase Edge Function `analyze-fridge-images`, which forwards
  base64-encoded images to Google Gemini using the **server-side**
  `GEMINI_API_KEY`. The key never ships in the Expo bundle.
- The provider is selected at runtime via `EXPO_PUBLIC_AI_PROVIDER`:
  - `mock` → `MockAIProvider` (default, dev/CI safe).
  - `edge-function` → `EdgeFunctionAIProvider` (real Gemini call).
- A discreet provider badge appears on the Fridge Vision screen in
  `__DEV__` builds so engineers can tell at a glance whether they are in
  mock or Gemini mode (`vision.fridge.providerBadgeMock` /
  `vision.fridge.providerBadgeGemini`).
- Errors from the Edge Function (missing key, Gemini upstream error,
  invalid model JSON) flow through the existing
  `provider_error` / `invalid_schema` failure path — the picked image is
  preserved and the user can retry without losing it.
- AI output is **never** auto-confirmed — the user still confirms each
  detected ingredient.

### Configuring `GEMINI_API_KEY` on Supabase

```bash
# 1. Authenticate the Supabase CLI (one-time, opens a browser):
supabase login

# 2. Link the local repo to a real project:
supabase link --project-ref <your-project-ref>

# 3. Set the secret server-side (NEVER add it to .env or app.json):
supabase secrets set GEMINI_API_KEY=AIzaSy...
```

The key only lives in Supabase secrets — the Expo `.env` only contains the
two existing public values (`EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`).

### Deploying the Edge Function

```bash
supabase functions deploy analyze-fridge-images
```

The function file is at `supabase/functions/analyze-fridge-images/index.ts`.
See its own `README.md` for the request/response contract and error codes.

### Switching the app to Gemini mode

Add the flag to `.env` and restart Metro:

```bash
EXPO_PUBLIC_AI_PROVIDER=edge-function
```

```bash
npx expo start --clear
```

In Expo Go: open the **Nutrition** tab → **Scan my fridge**. The dev badge
should now read **AI mode: Gemini (real analysis)**. Take or pick a real
photo, tap **Detect ingredients**. The provider posts the base64 image to
the Edge Function; the function calls Gemini server-side and returns the
strict JSON the app validates.

### Reverting to mock mode

Either remove the flag, set it to `mock`, or simply don't define it:

```bash
# .env
EXPO_PUBLIC_AI_PROVIDER=mock
```

```bash
npx expo start --clear
```

Mock mode is also the implicit default in CI and during automated tests —
no Edge Function or Gemini call is ever made by `npm test`.

### What's still mocked

- **Gym Vision** still uses `MockAIProvider`; its own Edge Function will land
  in a later phase.
- The dev-only **Use a demo image** CTA still exists so engineers can
  exercise the flow without media-library permissions.
- AI logs (`recordAILog`) are still in-memory only — pushing them to a
  Supabase table is a future phase.
- Open Food Facts enrichment is **not** wired (explicitly out of scope).

### Failure handling

| What goes wrong                                          | UI shows                                        |
| -------------------------------------------------------- | ----------------------------------------------- |
| `GEMINI_API_KEY` is missing on Supabase                  | `errors.providerTitle` + retry CTA              |
| Gemini network / upstream error                          | `errors.providerTitle` + retry CTA              |
| Gemini returns non-JSON or wrong shape                   | `errors.schemaTitle` + retry CTA                |
| Model returns 0 detections                               | `errors.noDetectionsTitle`                      |

In every case the picked image is kept in state so the user can retry or
swap photos without re-picking from the library.
