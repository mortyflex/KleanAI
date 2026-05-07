import {
  analyzeGymImages,
  GYM_VISION_PROMPT_VERSION,
} from '../../../src/features/vision/services/gym-vision.service';
import { clearAILogs, getAILogs } from '../../../src/lib/ai/logs';
import type { AIProvider, GymVisionResponseRaw } from '../../../src/types/ai.types';

function makeProvider(
  payload: GymVisionResponseRaw | (() => Promise<GymVisionResponseRaw>),
  overrides?: Partial<AIProvider>,
): AIProvider {
  return {
    id: 'mock',
    modelId: 'fake-model',
    analyzeGymImages: typeof payload === 'function'
      ? payload
      : async () => payload,
    ...overrides,
  } as AIProvider;
}

describe('analyzeGymImages — provider behavior', () => {
  beforeEach(() => clearAILogs());

  it('passes the prompt version through to the provider', async () => {
    const spy = jest.fn(async () => ({
      schemaVersion: '1' as const,
      detected: [{ label: 'Barbell', confidence: 0.9 }],
    }));
    const provider: AIProvider = {
      id: 'mock',
      modelId: 'fake-model',
      analyzeGymImages: spy,
    };

    await analyzeGymImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ promptVersion: GYM_VISION_PROMPT_VERSION }),
    );
  });

  it('returns ok with mapped detections on a valid response', async () => {
    const provider = makeProvider({
      schemaVersion: '1',
      detected: [
        { label: 'Barbell rack', confidence: 0.9 },
        { label: 'Dumbbells', confidence: 0.85 },
      ],
    });

    const result = await analyzeGymImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.detected.map((d) => d.internalId).sort()).toEqual([
        'barbell',
        'dumbbell',
      ]);
    }
  });

  it('returns provider_error when the provider throws', async () => {
    const provider = makeProvider(async () => {
      throw new Error('network down');
    });

    const result = await analyzeGymImages({
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
      detected: [{ label: 'Barbell', confidence: 99 }],
    } as unknown as GymVisionResponseRaw);

    const result = await analyzeGymImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_schema');
  });

  it('respects a custom confidence threshold', async () => {
    const provider = makeProvider({
      schemaVersion: '1',
      detected: [{ label: 'Barbell', confidence: 0.4 }],
    });

    const lowThreshold = await analyzeGymImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
      confidenceThreshold: 0.3,
    });
    const highThreshold = await analyzeGymImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
      confidenceThreshold: 0.9,
    });

    expect(lowThreshold.ok && lowThreshold.detected.length).toBe(1);
    expect(highThreshold.ok && highThreshold.detected.length).toBe(0);
  });
});

describe('analyzeGymImages — AI logs', () => {
  beforeEach(() => clearAILogs());

  it('records a success log entry', async () => {
    const provider = makeProvider({
      schemaVersion: '1',
      detected: [{ label: 'Barbell rack', confidence: 0.9 }],
    });

    await analyzeGymImages({
      images: [{ uri: 'mock://a.jpg' }, { uri: 'mock://b.jpg' }],
      provider,
    });

    const logs = getAILogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      feature: 'gym_vision',
      providerId: 'mock',
      modelId: 'fake-model',
      promptVersion: GYM_VISION_PROMPT_VERSION,
      imageCount: 2,
      succeeded: true,
    });
    expect(logs[0].outputSummary).toMatch(/detected=1 kept=1/);
  });

  it('records a failure log entry on provider error', async () => {
    const provider = makeProvider(async () => {
      throw new Error('boom');
    });

    await analyzeGymImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
    });

    const logs = getAILogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].succeeded).toBe(false);
    expect(logs[0].errorMessage).toContain('boom');
  });

  it('records a failure log entry on schema error', async () => {
    const provider = makeProvider({
      schemaVersion: '1',
      detected: [{ label: 'X', confidence: 5 }],
    } as unknown as GymVisionResponseRaw);

    await analyzeGymImages({
      images: [{ uri: 'mock://a.jpg' }],
      provider,
    });

    const logs = getAILogs();
    expect(logs[0].succeeded).toBe(false);
    expect(logs[0].outputSummary).toBe('invalid_schema');
  });
});
