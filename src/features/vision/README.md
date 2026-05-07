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

### What's left to wire real Gemini (later phases)

1. Implement a `GeminiAIProvider` that calls a Supabase Edge Function (no key
   on the client). The function forwards base64-encoded images to Gemini and
   returns the raw `FridgeVisionResponseRaw` JSON.
2. Switch `getAIProvider()` to return the Gemini provider when a flag is on.
3. Encode picker URIs to base64 inside the provider (or have the Edge
   Function fetch the signed Supabase Storage URL).
4. Wire Open Food Facts for richer ingredient metadata.
5. Remove the `__DEV__` mock CTA and the `mockNotice` string once the real
   path is the default.
