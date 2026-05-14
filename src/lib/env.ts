import { z } from "zod";

/**
 * Public environment variables consumed by the Expo client. These must be
 * prefixed with EXPO_PUBLIC_ to be inlined by the Metro bundler.
 *
 * The anon key is *not* a secret — RLS policies on the database protect data.
 * The service-role key must never appear here.
 */
const publicEnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, "EXPO_PUBLIC_SUPABASE_URL is required")
    .url("EXPO_PUBLIC_SUPABASE_URL must be a valid URL"),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, "EXPO_PUBLIC_SUPABASE_ANON_KEY is required"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export interface EnvSource {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
}

export type AIProviderMode = "mock" | "edge-function";

/**
 * Reads the optional AI provider mode from `EXPO_PUBLIC_AI_PROVIDER`. Defaults
 * to `mock` so local development works without any extra setup. Set to
 * `edge-function` once the Supabase Edge Function `analyze-fridge-images` is
 * deployed and `GEMINI_API_KEY` is configured server-side.
 */
export function getAIProviderMode(): AIProviderMode {
  const raw = process.env.EXPO_PUBLIC_AI_PROVIDER;
  return raw === "edge-function" ? "edge-function" : "mock";
}

export class MissingEnvError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(
      [
        "Missing or invalid public environment variables:",
        ...issues.map((line) => `  • ${line}`),
        "",
        "Create a .env file at the repo root (see .env.example) and restart the bundler.",
      ].join("\n"),
    );
    this.name = "MissingEnvError";
    this.issues = issues;
  }
}

/**
 * Parses an env-like object and throws a developer-friendly error if any
 * required public variable is missing. Exported separately so tests can pass a
 * fake source without touching `process.env`.
 */
export function parsePublicEnv(source: EnvSource): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    });
    throw new MissingEnvError(issues);
  }
  return result.data;
}

let cached: PublicEnv | null = null;

/**
 * Returns the validated public env. Lazy + cached so the parsing cost is paid
 * once. Tests can call `resetPublicEnvCache()` between assertions.
 */
export function getPublicEnv(): PublicEnv {
  if (cached) return cached;
  cached = parsePublicEnv({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
  return cached;
}

export function resetPublicEnvCache(): void {
  cached = null;
}
