import {
  DEFAULT_FRIDGE_CONFIDENCE_THRESHOLD,
  mapIngredientDetections,
  mapToInternalIngredient,
} from '../../../src/features/vision/utils/ingredient-mapping';

describe('mapToInternalIngredient', () => {
  it('uses suggestedInternalId when it is a known internal id', () => {
    expect(
      mapToInternalIngredient({
        label: 'Skinless chicken',
        confidence: 0.9,
        suggestedInternalId: 'chicken_breast',
      }),
    ).toBe('chicken_breast');
  });

  it('ignores suggestedInternalId when it is not a known id, falling back to label', () => {
    expect(
      mapToInternalIngredient({
        label: 'Eggs',
        confidence: 0.9,
        suggestedInternalId: 'totally_made_up',
      }),
    ).toBe('eggs');
  });

  it('matches by label (case + whitespace insensitive)', () => {
    expect(
      mapToInternalIngredient({ label: '  GREEK yogurt  ', confidence: 0.8 }),
    ).toBe('greek_yogurt');
  });

  it('falls back to aliases when the label does not match', () => {
    expect(
      mapToInternalIngredient({
        label: 'Mystery dairy thing',
        confidence: 0.9,
        aliases: ['cottage cheese'],
      }),
    ).toBe('cottage_cheese');
  });

  it('returns null for completely unknown labels', () => {
    expect(
      mapToInternalIngredient({ label: 'Decorative magnet', confidence: 0.99 }),
    ).toBeNull();
  });

  it('matches French aliases (poulet → chicken_breast)', () => {
    expect(
      mapToInternalIngredient({ label: 'Poulet', confidence: 0.85 }),
    ).toBe('chicken_breast');
  });

  it('matches plural English aliases (bananas → banana)', () => {
    expect(
      mapToInternalIngredient({ label: 'Bananas', confidence: 0.8 }),
    ).toBe('banana');
  });

  it('matches French berries alias (fruits rouges → berries)', () => {
    expect(
      mapToInternalIngredient({ label: 'Fruits rouges', confidence: 0.8 }),
    ).toBe('berries');
  });
});

describe('mapIngredientDetections — confidence threshold', () => {
  it('drops detections below the default threshold (0.6)', () => {
    const result = mapIngredientDetections([
      { label: 'Chicken breast', confidence: 0.59 },
      { label: 'Eggs', confidence: 0.61 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].internalId).toBe('eggs');
  });

  it('respects a custom threshold', () => {
    const result = mapIngredientDetections(
      [
        { label: 'Chicken breast', confidence: 0.55 },
        { label: 'Eggs', confidence: 0.7 },
      ],
      0.5,
    );
    expect(result).toHaveLength(2);
  });

  it('drops detections at threshold-minus-epsilon', () => {
    expect(
      mapIngredientDetections([
        {
          label: 'Chicken breast',
          confidence: DEFAULT_FRIDGE_CONFIDENCE_THRESHOLD - 0.01,
        },
      ]),
    ).toHaveLength(0);
  });

  it('keeps detections at exactly the threshold', () => {
    expect(
      mapIngredientDetections([
        {
          label: 'Chicken breast',
          confidence: DEFAULT_FRIDGE_CONFIDENCE_THRESHOLD,
        },
      ]),
    ).toHaveLength(1);
  });
});

describe('mapIngredientDetections — dedupe + ordering', () => {
  it('keeps only the highest-confidence detection per internal id', () => {
    const result = mapIngredientDetections([
      { label: 'Chicken', confidence: 0.7 },
      { label: 'Chicken breast', confidence: 0.95 },
      { label: 'Poulet', confidence: 0.65 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].internalId).toBe('chicken_breast');
    expect(result[0].confidence).toBe(0.95);
    expect(result[0].rawLabel).toBe('Chicken breast');
  });

  it('drops items with no internal mapping', () => {
    const result = mapIngredientDetections([
      { label: 'Decorative magnet', confidence: 0.99 },
      { label: 'Eggs', confidence: 0.9 },
    ]);
    expect(result.map((r) => r.internalId)).toEqual(['eggs']);
  });

  it('returns results sorted by confidence (highest first)', () => {
    const result = mapIngredientDetections([
      { label: 'Olive oil', confidence: 0.7 },
      { label: 'Chicken breast', confidence: 0.95 },
      { label: 'Eggs', confidence: 0.85 },
    ]);
    expect(result.map((r) => r.internalId)).toEqual([
      'chicken_breast',
      'eggs',
      'olive_oil',
    ]);
  });

  it('preserves quantity and uncertaintyNote from the raw detection', () => {
    const result = mapIngredientDetections([
      {
        label: 'Eggs',
        confidence: 0.9,
        quantity: { amount: 6, unit: 'piece' },
        uncertaintyNote: 'partial view',
      },
    ]);
    expect(result[0].quantity).toEqual({ amount: 6, unit: 'piece' });
    expect(result[0].uncertaintyNote).toBe('partial view');
  });

  it('falls back to the catalog category when the AI omits one', () => {
    const result = mapIngredientDetections([
      { label: 'Eggs', confidence: 0.9 },
    ]);
    expect(result[0].category).toBe('protein_egg');
  });

  it('uses the AI-supplied category when present', () => {
    const result = mapIngredientDetections([
      {
        label: 'Greek yogurt',
        confidence: 0.9,
        category: 'protein_dairy',
      },
    ]);
    expect(result[0].category).toBe('protein_dairy');
  });
});
