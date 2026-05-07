import { useCallback, useReducer } from 'react';
import type {
  AIRequestImage,
  DetectedIngredient,
  IngredientId,
} from '../../../types/ai.types';
import {
  analyzeFridgeImages,
  type FridgeVisionFailureReason,
} from '../services/fridge-vision.service';

export type FridgeVisionStage =
  | 'idle'
  | 'analyzing'
  | 'results'
  | 'error'
  | 'saved';

export interface FridgeVisionFlowState {
  stage: FridgeVisionStage;
  images: AIRequestImage[];
  detected: DetectedIngredient[];
  /** Map of internalId -> selected? — defaults to true for everything detected. */
  selection: Record<string, boolean>;
  failureReason: FridgeVisionFailureReason | 'no_detections' | null;
  /** Raw error text from the provider — surfaced in `__DEV__` for debugging. */
  failureDetails: string | null;
}

type Action =
  | { type: 'add_image'; image: AIRequestImage }
  | { type: 'remove_image'; uri: string }
  | { type: 'analyze_started' }
  | { type: 'analyze_succeeded'; detected: DetectedIngredient[] }
  | { type: 'analyze_no_detections' }
  | {
      type: 'analyze_failed';
      reason: FridgeVisionFailureReason;
      details?: string;
    }
  | { type: 'toggle_selection'; internalId: IngredientId }
  | { type: 'select_all' }
  | { type: 'clear_all' }
  | { type: 'mark_saved' }
  | { type: 'reset' };

const initialState: FridgeVisionFlowState = {
  stage: 'idle',
  images: [],
  detected: [],
  selection: {},
  failureReason: null,
  failureDetails: null,
};

function buildSelection(detected: DetectedIngredient[]): Record<string, boolean> {
  // Everything detected is selected by default — uncheck what isn't really there.
  return Object.fromEntries(detected.map((d) => [d.internalId, true]));
}

export function fridgeVisionReducer(
  state: FridgeVisionFlowState,
  action: Action,
): FridgeVisionFlowState {
  switch (action.type) {
    case 'add_image':
      if (state.images.some((img) => img.uri === action.image.uri)) return state;
      return { ...state, images: [...state.images, action.image] };
    case 'remove_image':
      return {
        ...state,
        images: state.images.filter((img) => img.uri !== action.uri),
      };
    case 'analyze_started':
      return {
        ...state,
        stage: 'analyzing',
        failureReason: null,
        failureDetails: null,
      };
    case 'analyze_succeeded':
      return {
        ...state,
        stage: 'results',
        detected: action.detected,
        selection: buildSelection(action.detected),
        failureReason: null,
        failureDetails: null,
      };
    case 'analyze_no_detections':
      return {
        ...state,
        stage: 'error',
        detected: [],
        selection: {},
        failureReason: 'no_detections',
        failureDetails: null,
      };
    case 'analyze_failed':
      return {
        ...state,
        stage: 'error',
        detected: [],
        selection: {},
        failureReason: action.reason,
        failureDetails: action.details ?? null,
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

export function selectedIngredientIds(
  state: FridgeVisionFlowState,
): IngredientId[] {
  return state.detected
    .filter((d) => state.selection[d.internalId])
    .map((d) => d.internalId);
}

export interface UseFridgeVisionFlowApi {
  state: FridgeVisionFlowState;
  addImage: (image: AIRequestImage) => void;
  removeImage: (uri: string) => void;
  analyze: () => Promise<void>;
  toggleSelection: (id: IngredientId) => void;
  selectAll: () => void;
  clearAll: () => void;
  markSaved: () => void;
  reset: () => void;
  selectedIds: IngredientId[];
}

export function useFridgeVisionFlow(): UseFridgeVisionFlowApi {
  const [state, dispatch] = useReducer(fridgeVisionReducer, initialState);

  const analyze = useCallback(async () => {
    dispatch({ type: 'analyze_started' });
    const result = await analyzeFridgeImages({ images: state.images });
    if (!result.ok) {
      dispatch({
        type: 'analyze_failed',
        reason: result.reason,
        details: result.details,
      });
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
    selectedIds: selectedIngredientIds(state),
  };
}
