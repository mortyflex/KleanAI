import {
  analyzeFridgeImages,
  FRIDGE_VISION_PROMPT_VERSION,
} from '../../../src/features/vision/services/fridge-vision.service';
import { clearAILogs, getAILogs } from '../../../src/lib/ai/logs';
import type {
  AIProvider,
  FridgeVisionResponseRaw,
  GymVisionResponseRaw,
} from '../../../src/types/ai.types';

function makeProvider(
  payload: FridgeVisionResponseRaw | (() => Promise<FridgeVisionResponseRaw>),
  overrides?: Partial<AIProvider>,
): AIProvider {
  return {
    id: 'mock',
    modelId: 'fake-model',
    analyzeGymImages: async () => ({
      schemaVersion: '1' as const,
      detected: [],
    } as GymVisionResponseRaw),
    analyzeFridgeImages:
      typeof payload === 'function' ? payload : async () => payload,
    ...overrides,
  } as AIProvider;
}

describe('analyzeFridgeImages — provider behavior', () => {
  beforeEach(() => clearAILogs());

  it('passes the prompt version through to the provider', async () => {
    const spy = jest.fn(async () => ({
      schemaVersion: '1' as const,
      detected: [{ label: 'Eggs', confidence: 0.9 }],
    }));
    const provider = makeProvider(spy);

    await analyzeFridgeImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ promptVersion: FRIDGE_VISION_PROMPT_VERSION }),
    );
  });

  it('returns ok with mapped detections on a valid response', async () => {
    const provider = makeProvider({
      schemaVersion: '1',
      detected: [
        { label: 'Chicken breast', confidence: 0.9 },
        { label: 'Eggs', confidence: 0.85 },
      ],
    });

    const result = await analyzeFridgeImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.detected.map((d) => d.internalId).sort()).toEqual([
        'chicken_breast',
        'eggs',
      ]);
    }
  });

  it('returns provider_error when the provider throws', async () => {
    const provider = makeProvider(async () => {
      throw new Error('network down');
    });

    const result = await analyzeFridgeImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('provider_error');
      expect(result.details).toContain('network down');
    }
  });

  it('returns invalid_schema for malformed responses', async () => {
    const provider = makeProvider({
      // confidence out of range — fails Zod validation.
      schemaVersion: '1',
      detected: [{ label: 'Eggs', confidence: 99 }],
    } as unknown as FridgeVisionResponseRaw);

    const result = await analyzeFridgeImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_schema');
  });

  it('respects a custom confidence threshold', async () => {
    const provider = makeProvider({
      schemaVersion: '1',
      detected: [{ label: 'Eggs', confidence: 0.4 }],
    });

    const lowThreshold = await analyzeFridgeImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
      confidenceThreshold: 0.3,
    });
    const highThreshold = await analyzeFridgeImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
      confidenceThreshold: 0.9,
    });

    expect(lowThreshold.ok && lowThreshold.detected.length).toBe(1);
    expect(highThreshold.ok && highThreshold.detected.length).toBe(0);
  });
});

describe('analyzeFridgeImages — AI logs', () => {
  beforeEach(() => clearAILogs());

  it('records a success log entry', async () => {
    const provider = makeProvider({
      schemaVersion: '1',
      detected: [{ label: 'Chicken breast', confidence: 0.9 }],
    });

    await analyzeFridgeImages({
      images: [{ uri: 'mock://a.jpg' }, { uri: 'mock://b.jpg' }],
      provider,
    });

    const logs = getAILogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      feature: 'fridge_vision',
      providerId: 'mock',
      modelId: 'fake-model',
      promptVersion: FRIDGE_VISION_PROMPT_VERSION,
      imageCount: 2,
      succeeded: true,
    });
    expect(logs[0].outputSummary).toMatch(/detected=1 kept=1/);
  });

  it('records a failure log entry on provider error', async () => {
    const provider = makeProvider(async () => {
      throw new Error('boom');
    });

    await analyzeFridgeImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
    });

    const logs = getAILogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].feature).toBe('fridge_vision');
    expect(logs[0].succeeded).toBe(false);
    expect(logs[0].errorMessage).toContain('boom');
  });

  it('records a failure log entry on schema error', async () => {
    const provider = makeProvider({
      schemaVersion: '1',
      detected: [{ label: 'X', confidence: 5 }],
    } as unknown as FridgeVisionResponseRaw);

    await analyzeFridgeImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
    });

    const logs = getAILogs();
    expect(logs[0].succeeded).toBe(false);
    expect(logs[0].outputSummary).toBe('invalid_schema');
  });
});
