import type {
  AIProvider,
  FridgeVisionRequest,
  FridgeVisionResponseRaw,
  GymVisionRequest,
  GymVisionResponseRaw,
} from "../../types/ai.types";
import { getPublicEnv } from "../env";
import { encodeImageToBase64 } from "./encode-image";

const FRIDGE_FUNCTION_PATH = "/functions/v1/analyze-fridge-images";

export interface EdgeFunctionProviderOptions {
  /** Override the resolved Supabase URL — useful for tests / staging. */
  baseUrl?: string;
  /** Override the anon key sent as the `apikey` / bearer header. */
  anonKey?: string;
  /** Test seam for the global fetch implementation. */
  fetchImpl?: typeof fetch;
}

interface EdgeError {
  error: string;
  message?: string;
}

function isEdgeError(value: unknown): value is EdgeError {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).error === "string"
  );
}

/**
 * Real AI provider — forwards fridge images to the Supabase Edge Function
 * `analyze-fridge-images`, which calls Gemini with the server-side
 * `GEMINI_API_KEY`. The provider intentionally throws on transport errors so
 * `analyzeFridgeImages` (in `fridge-vision.service.ts`) records them as
 * `provider_error`. The strict Zod parser still validates the JSON returned.
 */
export class EdgeFunctionAIProvider implements AIProvider {
  readonly id = "gemini" as const;
  readonly modelId = "gemini-via-edge-function";

  private readonly options: EdgeFunctionProviderOptions;

  constructor(options: EdgeFunctionProviderOptions = {}) {
    this.options = options;
  }

  async analyzeGymImages(_req: GymVisionRequest): Promise<GymVisionResponseRaw> {
    // Phase 12.2 only wires the fridge function — gym vision still uses the
    // mock provider until its own Edge Function lands.
    throw new Error("EdgeFunctionAIProvider.analyzeGymImages not implemented");
  }

  async analyzeFridgeImages(
    req: FridgeVisionRequest,
  ): Promise<FridgeVisionResponseRaw> {
    const { baseUrl, anonKey } = this.resolveCredentials();
    const url = `${baseUrl.replace(/\/+$/, "")}${FRIDGE_FUNCTION_PATH}`;
    const fetchImpl = this.options.fetchImpl ?? fetch;

    const images = await Promise.all(
      req.images.map(async (img) => {
        const encoded = await encodeImageToBase64(img.uri, img.mimeType);
        return { data: encoded.data, mimeType: encoded.mimeType };
      }),
    );

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ images }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "network error";
      throw new Error(`edge-function unreachable: ${message}`);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error(`edge-function returned non-JSON (${response.status})`);
    }

    if (!response.ok) {
      const detail = isEdgeError(body)
        ? `${body.error}${body.message ? `: ${body.message}` : ""}`
        : `status ${response.status}`;
      throw new Error(`edge-function error: ${detail}`);
    }

    return body as FridgeVisionResponseRaw;
  }

  private resolveCredentials(): { baseUrl: string; anonKey: string } {
    if (this.options.baseUrl && this.options.anonKey) {
      return { baseUrl: this.options.baseUrl, anonKey: this.options.anonKey };
    }
    const env = getPublicEnv();
    return {
      baseUrl: this.options.baseUrl ?? env.EXPO_PUBLIC_SUPABASE_URL,
      anonKey: this.options.anonKey ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    };
  }
}
