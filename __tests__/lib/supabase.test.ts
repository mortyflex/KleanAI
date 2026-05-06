/**
 * Smoke test for src/lib/supabase.ts.
 *
 * We mock @supabase/supabase-js so we can assert that:
 *  - `getSupabase()` reads validated env values and forwards them to
 *    `createClient` with the AsyncStorage-backed auth config.
 *  - The client is cached (subsequent calls don't re-create it).
 *  - Missing env vars surface as a `MissingEnvError` from `getPublicEnv`.
 */

const mockCreateClient: jest.Mock = jest.fn(() => ({ marker: "fake-client" }));

jest.mock("@supabase/supabase-js", () => ({
  __esModule: true,
  createClient: (url: string, key: string, options: unknown) =>
    mockCreateClient(url, key, options),
}));

// Avoid touching the actual URL polyfill in jest-expo (it tries to mutate
// global URL — fine in RN, noisy in node).
jest.mock("react-native-url-polyfill/auto", () => ({}));

// eslint-disable-next-line import/first
import { resetPublicEnvCache } from "../../src/lib/env";
// eslint-disable-next-line import/first
import {
  getSupabase,
  __resetSupabaseForTests,
} from "../../src/lib/supabase";

const VALID_URL = "https://example.supabase.co";
const VALID_KEY = "anon-key-with-enough-chars-1234";

describe("getSupabase", () => {
  const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    mockCreateClient.mockClear();
    resetPublicEnvCache();
    __resetSupabaseForTests();
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    resetPublicEnvCache();
    __resetSupabaseForTests();
  });

  it("creates a client with env values and AsyncStorage-backed auth config", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = VALID_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = VALID_KEY;

    const client = getSupabase();

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    const call = mockCreateClient.mock.calls[0] as unknown as [
      string,
      string,
      {
        auth: {
          persistSession: boolean;
          autoRefreshToken: boolean;
          detectSessionInUrl: boolean;
          storage: unknown;
        };
      },
    ];
    expect(call[0]).toBe(VALID_URL);
    expect(call[1]).toBe(VALID_KEY);
    expect(call[2].auth.persistSession).toBe(true);
    expect(call[2].auth.autoRefreshToken).toBe(true);
    expect(call[2].auth.detectSessionInUrl).toBe(false);
    expect(call[2].auth.storage).toBeDefined();
    expect(client).toEqual({ marker: "fake-client" });
  });

  it("caches the client across calls", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = VALID_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = VALID_KEY;

    const a = getSupabase();
    const b = getSupabase();
    expect(a).toBe(b);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });

  it("throws MissingEnvError when env is incomplete", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => getSupabase()).toThrow(/Missing or invalid public environment/);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
