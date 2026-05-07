import type {
  AIProvider,
  GymVisionRequest,
  GymVisionResponseRaw,
} from '../../types/ai.types';
import { MOCK_GYM_VISION_RESPONSE } from './mock-gym-vision';

/**
 * Mock AI provider — returns a fixed structured response so the rest of the
 * vision pipeline (validation, mapping, UI, workout adaptation) is fully
 * exercised without a real API call. The Gemini provider can be wired up
 * later behind the same `AIProvider` interface.
 */
export class MockAIProvider implements AIProvider {
  readonly id = 'mock' as const;
  readonly modelId = 'mock-vision-1';

  async analyzeGymImages(_req: GymVisionRequest): Promise<GymVisionResponseRaw> {
    // Tiny artificial delay so the UI shows its loading state in dev/preview.
    await new Promise((resolve) => setTimeout(resolve, 250));
    return MOCK_GYM_VISION_RESPONSE;
  }
}
