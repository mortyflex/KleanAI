import {
  fridgeVisionReducer,
  selectedIngredientIds,
  selectedUnmappedLabels,
  type FridgeVisionFlowState,
} from '../../../src/features/vision/hooks/useFridgeVisionFlow';
import type {
  DetectedIngredient,
  UnmappedIngredient,
} from '../../../src/types/ai.types';

const makeInitialState = (): FridgeVisionFlowState => ({
  stage: 'idle',
  images: [],
  detected: [],
  unmapped: [],
  selection: {},
  failureReason: null,
  failureDetails: null,
});

const sampleDetected: DetectedIngredient[] = [
  {
    internalId: 'chicken_breast',
    category: 'protein_meat',
    rawLabel: 'Chicken breast',
    confidence: 0.9,
  },
  {
    internalId: 'eggs',
    category: 'protein_egg',
    rawLabel: 'Eggs',
    confidence: 0.85,
  },
];

const sampleUnmapped: UnmappedIngredient[] = [
  {
    unmappedId: 'unmapped:ketchup',
    rawLabel: 'Ketchup',
    category: 'condiment',
    confidence: 0.78,
  },
];

describe('fridgeVisionReducer', () => {
  it('add_image appends a new image and dedupes by uri', () => {
    let state = fridgeVisionReducer(makeInitialState(), {
      type: 'add_image',
      image: { uri: 'mock://a.jpg' },
    });
    expect(state.images).toHaveLength(1);
    state = fridgeVisionReducer(state, {
      type: 'add_image',
      image: { uri: 'mock://a.jpg' },
    });
    expect(state.images).toHaveLength(1);
    state = fridgeVisionReducer(state, {
      type: 'add_image',
      image: { uri: 'mock://b.jpg' },
    });
    expect(state.images).toHaveLength(2);
  });

  it('remove_image removes an image by uri', () => {
    const initial: FridgeVisionFlowState = {
      ...makeInitialState(),
      images: [{ uri: 'mock://a.jpg' }, { uri: 'mock://b.jpg' }],
    };
    const state = fridgeVisionReducer(initial, {
      type: 'remove_image',
      uri: 'mock://a.jpg',
    });
    expect(state.images).toEqual([{ uri: 'mock://b.jpg' }]);
  });

  it('analyze_started moves to analyzing and clears the previous failure', () => {
    const initial: FridgeVisionFlowState = {
      ...makeInitialState(),
      failureReason: 'provider_error',
    };
    const state = fridgeVisionReducer(initial, { type: 'analyze_started' });
    expect(state.stage).toBe('analyzing');
    expect(state.failureReason).toBeNull();
  });

  it('analyze_succeeded selects every detection by default', () => {
    const state = fridgeVisionReducer(makeInitialState(), {
      type: 'analyze_succeeded',
      detected: sampleDetected,
      unmapped: [],
    });
    expect(state.stage).toBe('results');
    expect(state.detected).toEqual(sampleDetected);
    expect(state.selection).toEqual({
      chicken_breast: true,
      eggs: true,
    });
  });

  it('analyze_succeeded also selects unmapped detections by default', () => {
    const state = fridgeVisionReducer(makeInitialState(), {
      type: 'analyze_succeeded',
      detected: sampleDetected,
      unmapped: sampleUnmapped,
    });
    expect(state.unmapped).toEqual(sampleUnmapped);
    expect(state.selection['unmapped:ketchup']).toBe(true);
    expect(selectedUnmappedLabels(state)).toEqual(['Ketchup']);
  });

  it('analyze_no_detections moves to error with the no_detections reason', () => {
    const state = fridgeVisionReducer(makeInitialState(), {
      type: 'analyze_no_detections',
    });
    expect(state.stage).toBe('error');
    expect(state.failureReason).toBe('no_detections');
  });

  it('analyze_failed moves to error and forwards the failure reason + details', () => {
    const state = fridgeVisionReducer(makeInitialState(), {
      type: 'analyze_failed',
      reason: 'invalid_schema',
      details: 'detected.0.confidence: out of range',
    });
    expect(state.stage).toBe('error');
    expect(state.failureReason).toBe('invalid_schema');
    expect(state.failureDetails).toBe('detected.0.confidence: out of range');
  });

  it('toggle_selection flips a single key (mapped or unmapped)', () => {
    const initial: FridgeVisionFlowState = {
      ...makeInitialState(),
      detected: sampleDetected,
      unmapped: sampleUnmapped,
      selection: {
        chicken_breast: true,
        eggs: true,
        'unmapped:ketchup': true,
      },
    };
    const next = fridgeVisionReducer(initial, {
      type: 'toggle_selection',
      selectionKey: 'eggs',
    });
    expect(next.selection.eggs).toBe(false);
    expect(next.selection.chicken_breast).toBe(true);

    const flippedUnmapped = fridgeVisionReducer(next, {
      type: 'toggle_selection',
      selectionKey: 'unmapped:ketchup',
    });
    expect(flippedUnmapped.selection['unmapped:ketchup']).toBe(false);
  });

  it('select_all and clear_all toggle every key incl. unmapped ones', () => {
    const initial: FridgeVisionFlowState = {
      ...makeInitialState(),
      detected: sampleDetected,
      unmapped: sampleUnmapped,
      selection: {
        chicken_breast: false,
        eggs: false,
        'unmapped:ketchup': false,
      },
    };
    const allOn = fridgeVisionReducer(initial, { type: 'select_all' });
    expect(allOn.selection).toEqual({
      chicken_breast: true,
      eggs: true,
      'unmapped:ketchup': true,
    });
    const allOff = fridgeVisionReducer(allOn, { type: 'clear_all' });
    expect(allOff.selection).toEqual({
      chicken_breast: false,
      eggs: false,
      'unmapped:ketchup': false,
    });
  });

  it('mark_saved moves to the saved stage', () => {
    const state = fridgeVisionReducer(makeInitialState(), {
      type: 'mark_saved',
    });
    expect(state.stage).toBe('saved');
  });

  it('reset returns to the idle stage', () => {
    const initial: FridgeVisionFlowState = {
      ...makeInitialState(),
      stage: 'results',
      detected: sampleDetected,
      selection: { chicken_breast: true },
    };
    expect(fridgeVisionReducer(initial, { type: 'reset' })).toEqual(
      makeInitialState(),
    );
  });
});

describe('selectedIngredientIds', () => {
  it('returns only ingredients whose selection is true', () => {
    const state: FridgeVisionFlowState = {
      ...makeInitialState(),
      detected: sampleDetected,
      selection: { chicken_breast: true, eggs: false },
    };
    expect(selectedIngredientIds(state)).toEqual(['chicken_breast']);
  });

  it('returns an empty array when nothing is selected', () => {
    const state: FridgeVisionFlowState = {
      ...makeInitialState(),
      detected: sampleDetected,
      selection: { chicken_breast: false, eggs: false },
    };
    expect(selectedIngredientIds(state)).toEqual([]);
  });
});
