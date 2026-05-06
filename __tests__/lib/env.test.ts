import {
  MissingEnvError,
  parsePublicEnv,
  getPublicEnv,
  resetPublicEnvCache,
} from "../../src/lib/env";

const VALID = {
  EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  EXPO_PUBLIC_SUPABASE_ANON_KEY: "anon-key-with-enough-chars-1234",
};

describe("parsePublicEnv", () => {
  it("returns the parsed env when all values are valid", () => {
    expect(parsePublicEnv(VALID)).toEqual(VALID);
  });

  it("throws MissingEnvError when EXPO_PUBLIC_SUPABASE_URL is missing", () => {
    expect(() =>
      parsePublicEnv({ ...VALID, EXPO_PUBLIC_SUPABASE_URL: undefined }),
    ).toThrow(MissingEnvError);
  });

  it("throws MissingEnvError when EXPO_PUBLIC_SUPABASE_URL is not a URL", () => {
    expect(() =>
      parsePublicEnv({ ...VALID, EXPO_PUBLIC_SUPABASE_URL: "not-a-url" }),
    ).toThrow(/must be a valid URL/);
  });

  it("throws MissingEnvError when the anon key is too short", () => {
    expect(() =>
      parsePublicEnv({ ...VALID, EXPO_PUBLIC_SUPABASE_ANON_KEY: "short" }),
    ).toThrow(MissingEnvError);
  });

  it("includes a developer-friendly message and structured issues", () => {
    try {
      parsePublicEnv({});
      fail("expected MissingEnvError");
    } catch (e) {
      const err = e as MissingEnvError;
      expect(err).toBeInstanceOf(MissingEnvError);
      expect(err.issues.length).toBeGreaterThan(0);
      expect(err.message).toMatch(/Missing or invalid public environment/);
      expect(err.message).toMatch(/\.env\.example/);
    }
  });
});

describe("getPublicEnv (process.env-backed)", () => {
  const original = {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };

  afterEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.url;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = original.key;
    resetPublicEnvCache();
  });

  it("reads from process.env and caches the result", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = VALID.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
      VALID.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    resetPublicEnvCache();

    const first = getPublicEnv();
    // Mutate process.env after the first call — cache should still serve
    // the original value.
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://other.supabase.co";
    const second = getPublicEnv();
    expect(second).toBe(first);
  });

  it("throws when the env is invalid", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    resetPublicEnvCache();
    expect(() => getPublicEnv()).toThrow(MissingEnvError);
  });
});
