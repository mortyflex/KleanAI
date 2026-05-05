import type {
  SmoothingContext,
  SmoothingErrorResult,
  SmoothingEvent,
  SmoothingEventType,
  SmoothingResult,
} from '../../../types/smoothing.types';
import { SMOOTHING_EVENT_TYPES } from '../../../types/smoothing.types';
import { UNKNOWN_EVENT_MESSAGE_KEY } from './messages';
import { smoothNutrition } from './nutrition-smoothing';
import {
  smoothMissedWorkout,
  smoothNoMachine,
  smoothNoTime,
  smoothPartialWorkout,
} from './workout-smoothing';

export function isSmoothingEventType(value: unknown): value is SmoothingEventType {
  return typeof value === 'string'
    && (SMOOTHING_EVENT_TYPES as readonly string[]).includes(value);
}

function unknownEvent(reason: 'unknown_event_type' | 'invalid_event'): SmoothingErrorResult {
  return {
    ok: false,
    reason,
    messageKey: UNKNOWN_EVENT_MESSAGE_KEY,
  };
}

/**
 * Top-level Smoothing Engine entry point. Takes a structured event plus the
 * user's current context (gender, daily kcal target) and returns either a
 * nutrition or workout smoothing plan, or a soft error for unknown events.
 *
 * This function is deterministic and pure — no network, no storage. All
 * persistence and sync happens elsewhere (mocked locally for now).
 */
export function smoothEvent(
  event: SmoothingEvent | { type: string } | null | undefined,
  context: SmoothingContext,
): SmoothingResult {
  if (!event || typeof event !== 'object') {
    return unknownEvent('invalid_event');
  }

  const type = (event as { type?: unknown }).type;
  if (!isSmoothingEventType(type)) {
    return unknownEvent('unknown_event_type');
  }

  switch (type) {
    case 'missed_workout':
      return smoothMissedWorkout(event as SmoothingEvent & { type: 'missed_workout' });

    case 'partial_workout':
      return smoothPartialWorkout(event as SmoothingEvent & { type: 'partial_workout' });

    case 'no_machine':
      return smoothNoMachine(event as SmoothingEvent & { type: 'no_machine' });

    case 'no_time':
      return smoothNoTime(event as SmoothingEvent & { type: 'no_time' });

    case 'excess_food':
    case 'ordered_food':
    case 'alcohol': {
      const e = event as { type: typeof type; excessKcal?: unknown };
      if (typeof e.excessKcal !== 'number' || !Number.isFinite(e.excessKcal)) {
        return unknownEvent('invalid_event');
      }
      return smoothNutrition({
        excessKcal: e.excessKcal,
        context,
        eventType: type,
      });
    }

    case 'skipped_meal': {
      // A skipped meal creates a deficit, not an excess. Zero-guilt: we do
      // NOT compensate by adding food back; we just acknowledge it kindly.
      return smoothNutrition({
        excessKcal: 0,
        context,
        eventType: 'skipped_meal',
      });
    }
  }
}
