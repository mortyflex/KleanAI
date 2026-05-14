import {
  parseFridgeVisionResponse,
  fridgeVisionResponseSchema,
} from '../../../src/features/vision/utils/parse-fridge-vision';

const validPayload = {
  schemaVersion: '1' as const,
  detected: [
    { label: 'Chicken breast', confidence: 0.92 },
    {
      label: 'Greek yogurt',
      confidence: 0.81,
      category: 'protein_dairy' as const,
      aliases: ['yaourt grec'],
      quantity: { amount: 500, unit: 'g' as const },
      uncertaintyNote: 'Label partially obscured',
      suggestedInternalId: 'greek_yogurt',
    },
  ],
};

describe('parseFridgeVisionResponse — happy path', () => {
  it('accepts a valid object payload', () => {
    const result = parseFridgeVisionResponse(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.detected).toHaveLength(2);
      expect(result.data.detected[0].label).toBe('Chicken breast');
    }
  });

  it('accepts a valid JSON string payload', () => {
    const result = parseFridgeVisionResponse(JSON.stringify(validPayload));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.detected[1].suggestedInternalId).toBe('greek_yogurt');
    }
  });

  it('accepts an empty detected array', () => {
    const result = parseFridgeVisionResponse({
      schemaVersion: '1',
      detected: [],
    });
    expect(result.ok).toBe(true);
  });

  it('preserves optional fields like modelNotes, quantity and uncertaintyNote', () => {
    const result = parseFridgeVisionResponse({
      ...validPayload,
      modelNotes: 'demo',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.modelNotes).toBe('demo');
      expect(result.data.detected[1].quantity).toEqual({
        amount: 500,
        unit: 'g',
      });
      expect(result.data.detected[1].uncertaintyNote).toBe(
        'Label partially obscured',
      );
    }
  });
});

describe('parseFridgeVisionResponse — invalid inputs', () => {
  it('rejects non-JSON strings as invalid_json', () => {
    const result = parseFridgeVisionResponse('not-json{');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_json');
  });

  it('rejects an unknown schemaVersion', () => {
    const result = parseFridgeVisionResponse({ schemaVersion: '2', detected: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_schema');
  });

  it('rejects when detected is missing', () => {
    const result = parseFridgeVisionResponse({ schemaVersion: '1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_schema');
  });

  it('rejects confidence values outside [0, 1]', () => {
    const result = parseFridgeVisionResponse({
      schemaVersion: '1',
      detected: [{ label: 'Eggs', confidence: 1.5 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_schema');
  });

  it('rejects detections with empty labels', () => {
    const result = parseFridgeVisionResponse({
      schemaVersion: '1',
      detected: [{ label: '', confidence: 0.7 }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown category values', () => {
    const result = parseFridgeVisionResponse({
      schemaVersion: '1',
      detected: [
        { label: 'Eggs', confidence: 0.8, category: 'space_food' },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_schema');
  });

  it('rejects unknown quantity units', () => {
    const result = parseFridgeVisionResponse({
      schemaVersion: '1',
      detected: [
        {
          label: 'Eggs',
          confidence: 0.8,
          quantity: { amount: 6, unit: 'pinch' },
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_schema');
  });

  it('rejects negative quantity amounts', () => {
    const result = parseFridgeVisionResponse({
      schemaVersion: '1',
      detected: [
        {
          label: 'Eggs',
          confidence: 0.8,
          quantity: { amount: -1, unit: 'piece' },
        },
      ],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects null and undefined gracefully', () => {
    expect(parseFridgeVisionResponse(null).ok).toBe(false);
    expect(parseFridgeVisionResponse(undefined).ok).toBe(false);
  });

  it('returns a details string explaining the failure', () => {
    const result = parseFridgeVisionResponse({ schemaVersion: '1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.details && result.details.length > 0).toBe(true);
  });
});

describe('fridgeVisionResponseSchema (direct)', () => {
  it('safeParse rejects extra non-string aliases', () => {
    const result = fridgeVisionResponseSchema.safeParse({
      schemaVersion: '1',
      detected: [{ label: 'Eggs', confidence: 0.9, aliases: [1, 2, 3] }],
    });
    expect(result.success).toBe(false);
  });
});
