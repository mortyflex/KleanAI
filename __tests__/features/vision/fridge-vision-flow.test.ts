import {
  fridgeVisionReducer,
  selectedIngredientIds,
  type FridgeVisionFlowState,
} from '../../../src/features/vision/hooks/useFridgeVisionFlow';
import type { DetectedIngredient } from '../../../src/types/ai.types';

const makeInitialState = (): FridgeVisionFlowState => ({
  stage: 'idle',
  images: [],
  detected: [],
  selection: {},
  failureReason: null,
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
    });
    expect(state.stage).toBe('results');
    expect(state.detected).toEqual(sampleDetected);
    expect(state.selection).toEqual({
      chicken_breast: true,
      eggs: true,
    });
  });

  it('analyze_no_detections moves to error with the no_detections reason', () => {
    const state = fridgeVisionReducer(makeInitialState(), {
      type: 'analyze_no_detections',
    });
    expect(state.stage).toBe('error');
    expect(state.failureReason).toBe('no_detections');
  });

  it('analyze_failed moves to error and forwards the failure reason', () => {
    const state = fridgeVisionReducer(makeInitialState(), {
      type: 'analyze_failed',
      reason: 'invalid_schema',
    });
    expect(state.stage).toBe('error');
    expect(state.failureReason).toBe('invalid_schema');
  });

  it('toggle_selection flips a single id', () => {
    const initial: FridgeVisionFlowState = {
      ...makeInitialState(),
      detected: sampleDetected,
      selection: { chicken_breast: true, eggs: true },
    };
    const next = fridgeVisionReducer(initial, {
      type: 'toggle_selection',
      internalId: 'eggs',
    });
    expect(next.selection.eggs).toBe(false);
    expect(next.selection.chicken_breast).toBe(true);
  });

  it('select_all and clear_all toggle every id', () => {
    const initial: FridgeVisionFlowState = {
      ...makeInitialState(),
      detected: sampleDetected,
      selection: { chicken_breast: false, eggs: false },
    };
    const allOn = fridgeVisionReducer(initial, { type: 'select_all' });
    expect(allOn.selection).toEqual({ chicken_breast: true, eggs: true });
    const allOff = fridgeVisionReducer(allOn, { type: 'clear_all' });
    expect(allOff.selection).toEqual({ chicken_breast: false, eggs: false });
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
