import {
  gymVisionReducer,
  selectedEquipmentIds,
  type GymVisionFlowState,
} from '../../../src/features/vision/hooks/useGymVisionFlow';
import type { DetectedEquipment } from '../../../src/types/ai.types';

const initial: GymVisionFlowState = {
  stage: 'idle',
  images: [],
  detected: [],
  selection: {},
  failureReason: null,
};

const sampleDetected: DetectedEquipment[] = [
  { internalId: 'barbell', rawLabel: 'Barbell rack', confidence: 0.94 },
  { internalId: 'dumbbell', rawLabel: 'Dumbbells', confidence: 0.91 },
];

describe('gymVisionReducer — image queue', () => {
  it('adds images to the queue', () => {
    const next = gymVisionReducer(initial, {
      type: 'add_image',
      image: { uri: 'mock://a.jpg' },
    });
    expect(next.images).toHaveLength(1);
  });

  it('does not add duplicate URIs', () => {
    const after = [
      { type: 'add_image' as const, image: { uri: 'mock://a.jpg' } },
      { type: 'add_image' as const, image: { uri: 'mock://a.jpg' } },
    ].reduce(gymVisionReducer, initial);
    expect(after.images).toHaveLength(1);
  });

  it('removes images by URI', () => {
    const withTwo = [
      { type: 'add_image' as const, image: { uri: 'mock://a.jpg' } },
      { type: 'add_image' as const, image: { uri: 'mock://b.jpg' } },
    ].reduce(gymVisionReducer, initial);

    const next = gymVisionReducer(withTwo, {
      type: 'remove_image',
      uri: 'mock://a.jpg',
    });
    expect(next.images.map((i) => i.uri)).toEqual(['mock://b.jpg']);
  });
});

describe('gymVisionReducer — analyze lifecycle', () => {
  it('moves to analyzing stage and clears prior failureReason', () => {
    const errored: GymVisionFlowState = {
      ...initial,
      stage: 'error',
      failureReason: 'provider_error',
    };
    const next = gymVisionReducer(errored, { type: 'analyze_started' });
    expect(next.stage).toBe('analyzing');
    expect(next.failureReason).toBeNull();
  });

  it('moves to results and selects all detected items by default', () => {
    const next = gymVisionReducer(initial, {
      type: 'analyze_succeeded',
      detected: sampleDetected,
    });
    expect(next.stage).toBe('results');
    expect(next.detected).toHaveLength(2);
    expect(next.selection).toEqual({ barbell: true, dumbbell: true });
  });

  it('moves to error on no detections', () => {
    const next = gymVisionReducer(initial, { type: 'analyze_no_detections' });
    expect(next.stage).toBe('error');
    expect(next.failureReason).toBe('no_detections');
  });

  it('moves to error and stores reason on provider failure', () => {
    const next = gymVisionReducer(initial, {
      type: 'analyze_failed',
      reason: 'invalid_schema',
    });
    expect(next.stage).toBe('error');
    expect(next.failureReason).toBe('invalid_schema');
  });
});

describe('gymVisionReducer — selection', () => {
  const withResults: GymVisionFlowState = {
    ...initial,
    stage: 'results',
    detected: sampleDetected,
    selection: { barbell: true, dumbbell: true },
  };

  it('toggles a single selection', () => {
    const next = gymVisionReducer(withResults, {
      type: 'toggle_selection',
      internalId: 'barbell',
    });
    expect(next.selection).toEqual({ barbell: false, dumbbell: true });
  });

  it('clear_all unselects every item', () => {
    const next = gymVisionReducer(withResults, { type: 'clear_all' });
    expect(next.selection).toEqual({ barbell: false, dumbbell: false });
  });

  it('select_all reselects every item', () => {
    const cleared = gymVisionReducer(withResults, { type: 'clear_all' });
    const next = gymVisionReducer(cleared, { type: 'select_all' });
    expect(next.selection).toEqual({ barbell: true, dumbbell: true });
  });

  it('mark_saved transitions stage to saved', () => {
    const next = gymVisionReducer(withResults, { type: 'mark_saved' });
    expect(next.stage).toBe('saved');
  });

  it('reset returns to initial state', () => {
    const next = gymVisionReducer(withResults, { type: 'reset' });
    expect(next).toEqual(initial);
  });
});

describe('selectedEquipmentIds', () => {
  it('returns only ids whose selection is true', () => {
    const state: GymVisionFlowState = {
      ...initial,
      detected: sampleDetected,
      selection: { barbell: true, dumbbell: false },
    };
    expect(selectedEquipmentIds(state)).toEqual(['barbell']);
  });

  it('returns an empty list when no items are selected', () => {
    const state: GymVisionFlowState = {
      ...initial,
      detected: sampleDetected,
      selection: { barbell: false, dumbbell: false },
    };
    expect(selectedEquipmentIds(state)).toEqual([]);
  });
});
