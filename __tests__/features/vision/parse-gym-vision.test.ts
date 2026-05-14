import {
  parseGymVisionResponse,
  gymVisionResponseSchema,
} from '../../../src/features/vision/utils/parse-gym-vision';

const validPayload = {
  schemaVersion: '1' as const,
  detected: [
    { label: 'Barbell rack', confidence: 0.92 },
    {
      label: 'Dumbbells',
      confidence: 0.81,
      aliases: ['adjustable dumbbells'],
      visibleConstraints: ['rack only fits up to 30kg'],
      suggestedInternalId: 'dumbbell',
    },
  ],
};

describe('parseGymVisionResponse — happy path', () => {
  it('accepts a valid object payload', () => {
    const result = parseGymVisionResponse(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.detected).toHaveLength(2);
      expect(result.data.detected[0].label).toBe('Barbell rack');
    }
  });

  it('accepts a valid JSON string payload', () => {
    const result = parseGymVisionResponse(JSON.stringify(validPayload));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.detected[1].suggestedInternalId).toBe('dumbbell');
    }
  });

  it('accepts an empty detected array', () => {
    const result = parseGymVisionResponse({
      schemaVersion: '1',
      detected: [],
    });
    expect(result.ok).toBe(true);
  });

  it('preserves optional fields like modelNotes and visibleConstraints', () => {
    const result = parseGymVisionResponse({
      ...validPayload,
      modelNotes: 'demo',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.modelNotes).toBe('demo');
      expect(result.data.detected[1].visibleConstraints).toEqual([
        'rack only fits up to 30kg',
      ]);
    }
  });
});

describe('parseGymVisionResponse — invalid inputs', () => {
  it('rejects non-JSON strings as invalid_json', () => {
    const result = parseGymVisionResponse('not-json{');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_json');
  });

  it('rejects an unknown schemaVersion', () => {
    const result = parseGymVisionResponse({ schemaVersion: '2', detected: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_schema');
  });

  it('rejects when detected is missing', () => {
    const result = parseGymVisionResponse({ schemaVersion: '1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_schema');
  });

  it('rejects confidence values outside [0, 1]', () => {
    const result = parseGymVisionResponse({
      schemaVersion: '1',
      detected: [{ label: 'Cable', confidence: 1.5 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_schema');
  });

  it('rejects detections with empty labels', () => {
    const result = parseGymVisionResponse({
      schemaVersion: '1',
      detected: [{ label: '', confidence: 0.7 }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects null and undefined gracefully', () => {
    expect(parseGymVisionResponse(null).ok).toBe(false);
    expect(parseGymVisionResponse(undefined).ok).toBe(false);
  });

  it('returns a details string explaining the failure', () => {
    const result = parseGymVisionResponse({ schemaVersion: '1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.details && result.details.length > 0).toBe(true);
  });
});

describe('gymVisionResponseSchema (direct)', () => {
  it('safeParse rejects extra non-string aliases', () => {
    const result = gymVisionResponseSchema.safeParse({
      schemaVersion: '1',
      detected: [{ label: 'Barbell', confidence: 0.9, aliases: [1, 2, 3] }],
    });
    expect(result.success).toBe(false);
  });
});
