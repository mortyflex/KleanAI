import { useCallback, useReducer } from 'react';
import type { AIRequestImage, DetectedEquipment } from '../../../types/ai.types';
import type { Equipment } from '../../../types/workout.types';
import {
  analyzeGymImages,
  type GymVisionFailureReason,
} from '../services/gym-vision.service';

export type GymVisionStage =
  | 'idle'
  | 'analyzing'
  | 'results'
  | 'error'
  | 'saved';

export interface GymVisionFlowState {
  stage: GymVisionStage;
  images: AIRequestImage[];
  detected: DetectedEquipment[];
  /** Map of internalId -> selected? — defaults to true for everything detected. */
  selection: Record<string, boolean>;
  failureReason: GymVisionFailureReason | 'no_detections' | null;
}

type Action =
  | { type: 'add_image'; image: AIRequestImage }
  | { type: 'remove_image'; uri: string }
  | { type: 'analyze_started' }
  | { type: 'analyze_succeeded'; detected: DetectedEquipment[] }
  | { type: 'analyze_no_detections' }
  | { type: 'analyze_failed'; reason: GymVisionFailureReason }
  | { type: 'toggle_selection'; internalId: Equipment }
  | { type: 'select_all' }
  | { type: 'clear_all' }
  | { type: 'mark_saved' }
  | { type: 'reset' };

const initialState: GymVisionFlowState = {
  stage: 'idle',
  images: [],
  detected: [],
  selection: {},
  failureReason: null,
};

function buildSelection(detected: DetectedEquipment[]): Record<string, boolean> {
  // Everything detected is selected by default — uncheck what isn't really there.
  return Object.fromEntries(detected.map((d) => [d.internalId, true]));
}

export function gymVisionReducer(
  state: GymVisionFlowState,
  action: Action,
): GymVisionFlowState {
  switch (action.type) {
    case 'add_image':
      // Avoid duplicate URIs in the queue.
      if (state.images.some((img) => img.uri === action.image.uri)) return state;
      return { ...state, images: [...state.images, action.image] };
    case 'remove_image':
      return {
        ...state,
        images: state.images.filter((img) => img.uri !== action.uri),
      };
    case 'analyze_started':
      return { ...state, stage: 'analyzing', failureReason: null };
    case 'analyze_succeeded':
      return {
        ...state,
        stage: 'results',
        detected: action.detected,
        selection: buildSelection(action.detected),
        failureReason: null,
      };
    case 'analyze_no_detections':
      return {
        ...state,
        stage: 'error',
        detected: [],
        selection: {},
        failureReason: 'no_detections',
      };
    case 'analyze_failed':
      return {
        ...state,
        stage: 'error',
        detected: [],
        selection: {},
        failureReason: action.reason,
      };
    case 'toggle_selection':
      return {
        ...state,
        selection: {
          ...state.selection,
          [action.internalId]: !state.selection[action.internalId],
        },
      };
    case 'select_all':
      return { ...state, selection: buildSelection(state.detected) };
    case 'clear_all':
      return {
        ...state,
        selection: Object.fromEntries(state.detected.map((d) => [d.internalId, false])),
      };
    case 'mark_saved':
      return { ...state, stage: 'saved' };
    case 'reset':
      return initialState;
    default:
      return state;
  }
}

export function selectedEquipmentIds(state: GymVisionFlowState): Equipment[] {
  return state.detected
    .filter((d) => state.selection[d.internalId])
    .map((d) => d.internalId);
}

export interface UseGymVisionFlowApi {
  state: GymVisionFlowState;
  addImage: (image: AIRequestImage) => void;
  removeImage: (uri: string) => void;
  analyze: () => Promise<void>;
  toggleSelection: (id: Equipment) => void;
  selectAll: () => void;
  clearAll: () => void;
  markSaved: () => void;
  reset: () => void;
  selectedIds: Equipment[];
}

export function useGymVisionFlow(): UseGymVisionFlowApi {
  const [state, dispatch] = useReducer(gymVisionReducer, initialState);

  const analyze = useCallback(async () => {
    dispatch({ type: 'analyze_started' });
    const result = await analyzeGymImages({ images: state.images });
    if (!result.ok) {
      dispatch({ type: 'analyze_failed', reason: result.reason });
      return;
    }
    if (result.detected.length === 0) {
      dispatch({ type: 'analyze_no_detections' });
      return;
    }
    dispatch({ type: 'analyze_succeeded', detected: result.detected });
  }, [state.images]);

  return {
    state,
    addImage: (image) => dispatch({ type: 'add_image', image }),
    removeImage: (uri) => dispatch({ type: 'remove_image', uri }),
    analyze,
    toggleSelection: (id) => dispatch({ type: 'toggle_selection', internalId: id }),
    selectAll: () => dispatch({ type: 'select_all' }),
    clearAll: () => dispatch({ type: 'clear_all' }),
    markSaved: () => dispatch({ type: 'mark_saved' }),
    reset: () => dispatch({ type: 'reset' }),
    selectedIds: selectedEquipmentIds(state),
  };
}
