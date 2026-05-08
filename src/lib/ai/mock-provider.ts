import type {
  AIProvider,
  AIRecipeRequest,
  AIRecipesResponseRaw,
  FridgeVisionRequest,
  FridgeVisionResponseRaw,
  GymVisionRequest,
  GymVisionResponseRaw,
} from '../../types/ai.types';
import { MOCK_GYM_VISION_RESPONSE } from './mock-gym-vision';
import { MOCK_FRIDGE_VISION_RESPONSE } from './mock-fridge-vision';
import { buildMockRecipeResponse } from './mock-recipe-suggestions';

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

  async analyzeFridgeImages(
    _req: FridgeVisionRequest,
  ): Promise<FridgeVisionResponseRaw> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return MOCK_FRIDGE_VISION_RESPONSE;
  }

  async generateRecipeSuggestions(
    req: AIRecipeRequest,
  ): Promise<AIRecipesResponseRaw> {
    // Tiny delay so the UI loading state has a chance to render in dev.
    await new Promise((resolve) => setTimeout(resolve, 150));
    return buildMockRecipeResponse(req);
  }
}
