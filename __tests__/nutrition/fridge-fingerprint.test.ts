import { buildFridgeFingerprint } from '../../src/features/nutrition/utils/fridge-fingerprint';
import type { IngredientId } from '../../src/types/ai.types';

describe('buildFridgeFingerprint', () => {
  it('is order-independent for mapped ids and unmapped labels', () => {
    const a = buildFridgeFingerprint(
      ['chicken_breast', 'broccoli'] as IngredientId[],
      ['Ketchup', 'Harissa'],
    );
    const b = buildFridgeFingerprint(
      ['broccoli', 'chicken_breast'] as IngredientId[],
      ['Harissa', 'Ketchup'],
    );
    expect(a).toBe(b);
  });

  it('normalizes unmapped label case and surrounding whitespace', () => {
    const a = buildFridgeFingerprint([], ['  KETCHUP  ']);
    const b = buildFridgeFingerprint([], ['ketchup']);
    expect(a).toBe(b);
  });

  it('drops empty / whitespace-only unmapped labels', () => {
    const withBlanks = buildFridgeFingerprint([], ['ketchup', '', '   ']);
    const clean = buildFridgeFingerprint([], ['ketchup']);
    expect(withBlanks).toBe(clean);
  });

  it('changes when the fridge contents change', () => {
    const before = buildFridgeFingerprint(['eggs'] as IngredientId[], []);
    const afterAdd = buildFridgeFingerprint(
      ['eggs', 'spinach'] as IngredientId[],
      [],
    );
    const afterUnmapped = buildFridgeFingerprint(['eggs'] as IngredientId[], [
      'ketchup',
    ]);
    expect(afterAdd).not.toBe(before);
    expect(afterUnmapped).not.toBe(before);
  });

  it('keeps mapped ids and unmapped labels in separate sections', () => {
    // A mapped id and an unmapped label with the same text must not collide.
    const asMapped = buildFridgeFingerprint(['ketchup'] as IngredientId[], []);
    const asUnmapped = buildFridgeFingerprint([], ['ketchup']);
    expect(asMapped).not.toBe(asUnmapped);
  });

  it('returns a stable value for an empty fridge', () => {
    expect(buildFridgeFingerprint()).toBe(buildFridgeFingerprint([], []));
  });
});
