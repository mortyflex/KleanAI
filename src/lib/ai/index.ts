import type { AIProvider } from '../../types/ai.types';
import { MockAIProvider } from './mock-provider';

let activeProvider: AIProvider = new MockAIProvider();

/**
 * Returns the active AI provider. The real Gemini provider will plug in here
 * once env vars are configured and explicitly confirmed — the rest of the
 * codebase only depends on the `AIProvider` interface.
 */
export function getAIProvider(): AIProvider {
  return activeProvider;
}

/** Test seam: swap the provider in unit tests. Not used in production code. */
export function __setAIProviderForTests(provider: AIProvider): void {
  activeProvider = provider;
}

export function __resetAIProviderForTests(): void {
  activeProvider = new MockAIProvider();
}

export { MockAIProvider } from './mock-provider';
export { MOCK_GYM_VISION_RESPONSE } from './mock-gym-vision';
export { MOCK_FRIDGE_VISION_RESPONSE } from './mock-fridge-vision';
