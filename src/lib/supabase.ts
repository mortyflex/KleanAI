import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "./env";
import type { Database } from "../types/database.types";

export type KleanSupabaseClient = SupabaseClient<Database>;

let cached: KleanSupabaseClient | null = null;

/**
 * Returns a singleton, lazily-instantiated Supabase client wired for
 * React Native: AsyncStorage-backed sessions, auto refresh, and no URL
 * detection (we are not in a browser).
 *
 * The client is created lazily so:
 * - tests can reset the singleton via `__resetSupabaseForTests`
 * - missing env vars only blow up when the client is actually used (not at
 *   module import), keeping tools like Jest happy when `.env` is not present.
 */
export function getSupabase(): KleanSupabaseClient {
  if (cached) return cached;
  const env = getPublicEnv();
  cached = createClient<Database>(
    env.EXPO_PUBLIC_SUPABASE_URL,
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    },
  );
  return cached;
}

/**
 * @internal Used by tests to reset the singleton between cases.
 */
export function __resetSupabaseForTests(): void {
  cached = null;
}
