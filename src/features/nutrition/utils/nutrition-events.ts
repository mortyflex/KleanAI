import type {
  SmoothingContext,
  SmoothingEvent,
  SmoothingEventType,
  SmoothingResult,
} from '../../../types/smoothing.types';
import { smoothEvent } from '../../smoothing/utils/smooth-event';

/**
 * User-facing nutrition event types. These map onto smoothing-engine events,
 * but `followed_plan` is intentionally absent from the smoothing surface —
 * staying on track does NOT need to be "smoothed", and we explicitly do not
 * compensate the next day. The hook returns an `acknowledged` result for it.
 */
export type NutritionEventType =
  | 'followed_plan'
  | 'excess_food'
  | 'skipped_meal'
  | 'ordered_food'
  | 'alcohol';

export const NUTRITION_EVENT_TYPES: readonly NutritionEventType[] = [
  'followed_plan',
  'excess_food',
  'skipped_meal',
  'ordered_food',
  'alcohol',
] as const;

/**
 * Default kcal we charge against the user's plan when they don't pass an
 * exact number. Picked low on purpose — Klean AI is not a tracking app, so
 * we err on the side of "kind" defaults that the smoothing engine then
 * spreads gently across 2–3 days.
 */
export const DEFAULT_EXCESS_KCAL: Record<
  Exclude<NutritionEventType, 'followed_plan' | 'skipped_meal'>,
  number
> = {
  excess_food: 300,
  ordered_food: 400,
  alcohol: 350,
};

export interface ReportNutritionEventInput {
  type: NutritionEventType;
  /** Optional override for events that carry a kcal payload. */
  kcal?: number;
  /** Optional ISO timestamp for the event; defaults to now in callers. */
  occurredAt?: string;
}

export interface AcknowledgedResult {
  ok: true;
  acknowledged: true;
  category: 'nutrition';
  eventType: NutritionEventType;
  /** i18n key for a positive message — used for `followed_plan`. */
  messageKey: string;
}

export type NutritionEventResult = SmoothingResult | AcknowledgedResult;

const FOLLOWED_PLAN_MESSAGE_KEY = 'nutrition.events.followed_plan.message';

/**
 * Translate a user-reported nutrition event into a structured
 * {@link SmoothingEvent} the engine understands. Returns `null` for
 * `followed_plan` because that event is acknowledged in-place — we do
 * NOT compensate by adding more food, and we do NOT smooth the day.
 */
export function buildSmoothingEvent(
  input: ReportNutritionEventInput,
): SmoothingEvent | null {
  const { type, kcal, occurredAt } = input;
  const base: { occurredAt?: string } = occurredAt ? { occurredAt } : {};

  switch (type) {
    case 'followed_plan':
      return null;

    case 'skipped_meal':
      return {
        ...base,
        type: 'skipped_meal',
        // Skipped meal carries a "missed" kcal field for symmetry, but the
        // smoothing engine does NOT compensate for it.
        missedKcal: Math.max(0, kcal ?? 0),
      };

    case 'excess_food':
      return {
        ...base,
        type: 'excess_food',
        excessKcal: Math.max(0, kcal ?? DEFAULT_EXCESS_KCAL.excess_food),
      };

    case 'ordered_food':
      return {
        ...base,
        type: 'ordered_food',
        excessKcal: Math.max(0, kcal ?? DEFAULT_EXCESS_KCAL.ordered_food),
      };

    case 'alcohol':
      return {
        ...base,
        type: 'alcohol',
        excessKcal: Math.max(0, kcal ?? DEFAULT_EXCESS_KCAL.alcohol),
      };
  }
}

/**
 * Run a user-reported nutrition event through the smoothing engine.
 *
 * - `followed_plan`  → acknowledged (positive copy, no smoothing)
 * - all other events → routed through {@link smoothEvent} so the engine
 *                      stays the single source of truth for safety floor
 *                      enforcement, spread windows and zero-guilt copy.
 */
export function reportNutritionEvent(
  input: ReportNutritionEventInput,
  context: SmoothingContext,
): NutritionEventResult {
  if (input.type === 'followed_plan') {
    return {
      ok: true,
      acknowledged: true,
      category: 'nutrition',
      eventType: 'followed_plan',
      messageKey: FOLLOWED_PLAN_MESSAGE_KEY,
    };
  }

  const event = buildSmoothingEvent(input);
  if (!event) {
    return {
      ok: true,
      acknowledged: true,
      category: 'nutrition',
      eventType: input.type,
      messageKey: FOLLOWED_PLAN_MESSAGE_KEY,
    };
  }
  return smoothEvent(event, context);
}

export function isAcknowledgedResult(
  r: NutritionEventResult,
): r is AcknowledgedResult {
  return r.ok === true && (r as AcknowledgedResult).acknowledged === true;
}

/** Public set of smoothing event types that nutrition can produce. */
export const NUTRITION_SMOOTHING_EVENT_TYPES: readonly SmoothingEventType[] = [
  'excess_food',
  'skipped_meal',
  'ordered_food',
  'alcohol',
] as const;
