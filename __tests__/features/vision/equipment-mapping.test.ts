import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  mapDetections,
  mapToInternalEquipment,
} from '../../../src/features/vision/utils/equipment-mapping';

describe('mapToInternalEquipment', () => {
  it('uses suggestedInternalId when it is a known internal id', () => {
    expect(
      mapToInternalEquipment({
        label: 'Bench press station',
        confidence: 0.9,
        suggestedInternalId: 'barbell',
      }),
    ).toBe('barbell');
  });

  it('ignores suggestedInternalId when it is not a known id, falling back to label', () => {
    expect(
      mapToInternalEquipment({
        label: 'Dumbbells',
        confidence: 0.9,
        suggestedInternalId: 'totally_made_up',
      }),
    ).toBe('dumbbell');
  });

  it('matches by label (case + whitespace insensitive)', () => {
    expect(
      mapToInternalEquipment({ label: '  CABLE machine  ', confidence: 0.8 }),
    ).toBe('cable');
  });

  it('falls back to aliases when the label does not match', () => {
    expect(
      mapToInternalEquipment({
        label: 'Mystery rack',
        confidence: 0.9,
        aliases: ['power rack'],
      }),
    ).toBe('barbell');
  });

  it('returns null for completely unknown labels', () => {
    expect(
      mapToInternalEquipment({ label: 'Decorative plant', confidence: 0.99 }),
    ).toBeNull();
  });

  it('matches French aliases (haltères → dumbbell)', () => {
    expect(
      mapToInternalEquipment({ label: 'Haltères', confidence: 0.85 }),
    ).toBe('dumbbell');
  });

  it('matches a leg-press machine label to the machine category', () => {
    expect(
      mapToInternalEquipment({ label: 'Leg press machine', confidence: 0.8 }),
    ).toBe('machine');
  });

  it('matches pull-up bar variants', () => {
    expect(
      mapToInternalEquipment({ label: 'Chin-up bar', confidence: 0.8 }),
    ).toBe('pull_up_bar');
  });
});

describe('mapDetections — confidence threshold', () => {
  it('drops detections below the default threshold (0.6)', () => {
    const result = mapDetections([
      { label: 'Barbell', confidence: 0.59 },
      { label: 'Dumbbells', confidence: 0.61 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].internalId).toBe('dumbbell');
  });

  it('respects a custom threshold', () => {
    const result = mapDetections(
      [
        { label: 'Barbell', confidence: 0.55 },
        { label: 'Dumbbells', confidence: 0.7 },
      ],
      0.5,
    );
    expect(result).toHaveLength(2);
  });

  it('drops detections at exactly threshold-minus-epsilon', () => {
    expect(
      mapDetections([
        { label: 'Barbell', confidence: DEFAULT_CONFIDENCE_THRESHOLD - 0.01 },
      ]),
    ).toHaveLength(0);
  });

  it('keeps detections at exactly the threshold', () => {
    expect(
      mapDetections([
        { label: 'Barbell', confidence: DEFAULT_CONFIDENCE_THRESHOLD },
      ]),
    ).toHaveLength(1);
  });
});

describe('mapDetections — dedupe + ordering', () => {
  it('keeps only the highest-confidence detection per internal id', () => {
    const result = mapDetections([
      { label: 'Squat rack', confidence: 0.7 },
      { label: 'Power rack', confidence: 0.95 },
      { label: 'Barbell', confidence: 0.65 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].internalId).toBe('barbell');
    expect(result[0].confidence).toBe(0.95);
    expect(result[0].rawLabel).toBe('Power rack');
  });

  it('drops items with no internal mapping', () => {
    const result = mapDetections([
      { label: 'Decorative plant', confidence: 0.99 },
      { label: 'Dumbbells', confidence: 0.9 },
    ]);
    expect(result.map((r) => r.internalId)).toEqual(['dumbbell']);
  });

  it('returns results sorted by confidence (highest first)', () => {
    const result = mapDetections([
      { label: 'Pull-up bar', confidence: 0.7 },
      { label: 'Barbell', confidence: 0.95 },
      { label: 'Dumbbells', confidence: 0.85 },
    ]);
    expect(result.map((r) => r.internalId)).toEqual([
      'barbell',
      'dumbbell',
      'pull_up_bar',
    ]);
  });

  it('preserves visibleConstraints from the raw detection', () => {
    const result = mapDetections([
      {
        label: 'Cable machine',
        confidence: 0.8,
        visibleConstraints: ['low pulley only'],
      },
    ]);
    expect(result[0].visibleConstraints).toEqual(['low pulley only']);
  });
});
