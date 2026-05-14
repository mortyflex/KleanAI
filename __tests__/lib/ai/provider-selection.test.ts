import {
  __resetAIProviderForTests,
  __setAIProviderForTests,
  EdgeFunctionAIProvider,
  getAIProvider,
  getActiveAIProviderId,
  MockAIProvider,
} from '../../../src/lib/ai';

const ORIGINAL_MODE = process.env.EXPO_PUBLIC_AI_PROVIDER;
const ORIGINAL_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ORIGINAL_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
  process.env.EXPO_PUBLIC_AI_PROVIDER = ORIGINAL_MODE;
  process.env.EXPO_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = ORIGINAL_KEY;
  __resetAIProviderForTests();
});

describe('getAIProvider — env-driven mode selection', () => {
  it('defaults to MockAIProvider when EXPO_PUBLIC_AI_PROVIDER is unset', () => {
    delete process.env.EXPO_PUBLIC_AI_PROVIDER;
    __resetAIProviderForTests();
    expect(getAIProvider()).toBeInstanceOf(MockAIProvider);
    expect(getActiveAIProviderId()).toBe('mock');
  });

  it('returns EdgeFunctionAIProvider when mode is "edge-function" with valid env', () => {
    process.env.EXPO_PUBLIC_AI_PROVIDER = 'edge-function';
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://klean.test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-of-sufficient-length';
    __resetAIProviderForTests();
    const provider = getAIProvider();
    expect(provider).toBeInstanceOf(EdgeFunctionAIProvider);
    expect(getActiveAIProviderId()).toBe('gemini');
  });

  it('honours the test-only override regardless of env', () => {
    process.env.EXPO_PUBLIC_AI_PROVIDER = 'edge-function';
    __resetAIProviderForTests();
    const stub = new MockAIProvider();
    __setAIProviderForTests(stub);
    expect(getAIProvider()).toBe(stub);
  });
});
