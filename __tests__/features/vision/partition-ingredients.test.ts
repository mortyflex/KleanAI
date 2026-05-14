import {
  buildUnmappedId,
  partitionIngredientDetections,
} from '../../../src/features/vision/utils/ingredient-mapping';

describe('partitionIngredientDetections — unmapped support', () => {
  it('keeps detections that match the catalog as mapped', () => {
    const result = partitionIngredientDetections([
      { label: 'Chicken breast', confidence: 0.9 },
      { label: 'Eggs', confidence: 0.85 },
    ]);
    expect(result.mapped.map((m) => m.internalId).sort()).toEqual([
      'chicken_breast',
      'eggs',
    ]);
    expect(result.unmapped).toHaveLength(0);
  });

  it('surfaces above-threshold detections that have no internal mapping as unmapped', () => {
    const result = partitionIngredientDetections([
      { label: 'Ketchup', confidence: 0.78, category: 'condiment' },
      { label: 'Decorative magnet', confidence: 0.99 },
    ]);
    expect(result.mapped).toHaveLength(0);
    const labels = result.unmapped.map((u) => u.rawLabel).sort();
    expect(labels).toEqual(['Decorative magnet', 'Ketchup']);
  });

  it('drops detections below the confidence threshold even if unmapped', () => {
    const result = partitionIngredientDetections([
      { label: 'Mystery sauce', confidence: 0.4 },
    ]);
    expect(result.unmapped).toHaveLength(0);
  });

  it('forwards category, confidence, quantity and uncertaintyNote to unmapped items', () => {
    const result = partitionIngredientDetections([
      {
        label: 'Harissa paste',
        confidence: 0.82,
        category: 'condiment',
        quantity: { amount: 100, unit: 'g' },
        uncertaintyNote: 'partial label',
      },
    ]);
    expect(result.unmapped).toHaveLength(1);
    expect(result.unmapped[0]).toMatchObject({
      rawLabel: 'Harissa paste',
      category: 'condiment',
      confidence: 0.82,
      uncertaintyNote: 'partial label',
    });
    expect(result.unmapped[0].quantity).toEqual({ amount: 100, unit: 'g' });
  });

  it('builds a stable unmappedId from the label', () => {
    expect(buildUnmappedId('Ketchup')).toBe('unmapped:ketchup');
    expect(buildUnmappedId('  Hot Sauce!  ')).toBe('unmapped:hot_sauce');
  });

  it('returns mapped + unmapped together when both are present', () => {
    const result = partitionIngredientDetections([
      { label: 'Eggs', confidence: 0.92 },
      { label: 'Ketchup', confidence: 0.78, category: 'condiment' },
    ]);
    expect(result.mapped.map((m) => m.internalId)).toEqual(['eggs']);
    expect(result.unmapped.map((u) => u.rawLabel)).toEqual(['Ketchup']);
  });
});
