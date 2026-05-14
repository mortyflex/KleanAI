import type { AIProvider } from '../../types/ai.types';
import { getAIProviderMode, type AIProviderMode } from '../env';
import { MockAIProvider } from './mock-provider';
import { EdgeFunctionAIProvider } from './edge-function-provider';

let activeProvider: AIProvider | null = null;
let testOverride: AIProvider | null = null;

function buildProviderForMode(mode: AIProviderMode): AIProvider {
  if (mode === 'edge-function') {
    try {
      return new EdgeFunctionAIProvider();
    } catch {
      // Public env not configured yet — fall back to the mock so the app
      // remains usable in dev. The screen badge will surface the mismatch.
      return new MockAIProvider();
    }
  }
  return new MockAIProvider();
}

/**
 * Returns the active AI provider. The mode is picked from
 * `EXPO_PUBLIC_AI_PROVIDER` (`mock` or `edge-function`), defaulting to
 * `mock` so the app runs without any extra setup. The Gemini provider lives
 * behind an Edge Function so the API key never ships in the Expo bundle.
 */
export function getAIProvider(): AIProvider {
  if (testOverride) return testOverride;
  if (activeProvider) return activeProvider;
  activeProvider = buildProviderForMode(getAIProviderMode());
  return activeProvider;
}

/** Returns the provider id of the currently active provider — UI uses this
 * to show a discreet badge in `__DEV__` builds. */
export function getActiveAIProviderId(): AIProvider['id'] {
  return getAIProvider().id;
}

/** Test seam: swap the provider in unit tests. Not used in production code. */
export function __setAIProviderForTests(provider: AIProvider): void {
  testOverride = provider;
}

export function __resetAIProviderForTests(): void {
  testOverride = null;
  activeProvider = null;
}

export { MockAIProvider } from './mock-provider';
export { EdgeFunctionAIProvider } from './edge-function-provider';
export { MOCK_GYM_VISION_RESPONSE } from './mock-gym-vision';
export { MOCK_FRIDGE_VISION_RESPONSE } from './mock-fridge-vision';
