import type {
  DailyKcalAdjustment,
  NutritionSmoothingResult,
  SmoothingContext,
  SmoothingEventType,
} from '../../../types/smoothing.types';
import { calorieFloor } from '../../../utils/safety';
import { EVENT_COPY } from './messages';

/**
 * Hard caps to keep smoothing kind, never punishing. The Smoothing Engine
 * spreads small excesses across 48–72h and never asks the user to skip meals
 * or drop below the safety floor.
 */
export const NUTRITION_SMOOTHING = {
  /** Default spread window in days. */
  DEFAULT_SPREAD_DAYS: 3,
  /** Lower bound of the 48–72h window. */
  MIN_SPREAD_DAYS: 2,
  /** Upper bound of the 48–72h window. */
  MAX_SPREAD_DAYS: 3,
  /**
   * Hard cap per day on the extra deficit we ask the user to absorb.
   * Above this, we leave the remainder unaddressed rather than punish.
   */
  MAX_DAILY_COMPENSATION_KCAL: 250,
  /**
   * Excess below this threshold is ignored entirely (zero-guilt: a small
   * snack does not warrant a multi-day plan adjustment).
   */
  IGNORE_THRESHOLD_KCAL: 50,
} as const;

export interface SmoothNutritionParams {
  excessKcal: number;
  context: SmoothingContext;
  eventType: SmoothingEventType;
  spreadDays?: number;
}

/**
 * Spread a small excess over 2–3 days. Never goes below the safety floor;
 * never asks the user for an aggressive single-day cut.
 *
 * If the user's headroom above the floor cannot fully absorb the excess,
 * the unabsorbed portion is reported as `unaddressedKcal` and we tell the
 * user we kept things safe — no shame, no guilt.
 */
export function smoothNutrition(
  params: SmoothNutritionParams,
): NutritionSmoothingResult {
  const { context, eventType } = params;
  const excessKcal = Math.max(0, params.excessKcal);
  const requestedSpread = params.spreadDays ?? NUTRITION_SMOOTHING.DEFAULT_SPREAD_DAYS;
  const spreadDays = clamp(
    Math.round(requestedSpread),
    NUTRITION_SMOOTHING.MIN_SPREAD_DAYS,
    NUTRITION_SMOOTHING.MAX_SPREAD_DAYS,
  );

  const floor = calorieFloor(context.gender);
  const dailyTarget = context.dailyKcalTarget;
  const headroom = Math.max(0, dailyTarget - floor);
  const perDayCap = Math.min(
    NUTRITION_SMOOTHING.MAX_DAILY_COMPENSATION_KCAL,
    headroom,
  );

  const copy = EVENT_COPY[eventType];

  // No-op cases: we still return a structured, zero-guilt result.
  if (excessKcal <= NUTRITION_SMOOTHING.IGNORE_THRESHOLD_KCAL) {
    return {
      ok: true,
      category: 'nutrition',
      eventType,
      adjustments: [],
      spreadDays,
      totalCompensatedKcal: 0,
      totalExcessKcal: excessKcal,
      unaddressedKcal: 0,
      hitFloor: false,
      floor,
      messageKey: copy.messageKey,
      recommendationKey: copy.recommendationKey,
    };
  }

  const idealPerDay = excessKcal / spreadDays;
  const perDay = Math.min(idealPerDay, perDayCap);
  const hitFloor = perDay < idealPerDay;

  const totalCompensated = perDay * spreadDays;
  const unaddressed = Math.max(0, excessKcal - totalCompensated);

  const adjustments: DailyKcalAdjustment[] = Array.from({ length: spreadDays }, (_, i) => {
    const kcalDelta = -Math.round(perDay);
    const adjustedDailyTarget = Math.max(floor, dailyTarget + kcalDelta);
    return {
      dayOffset: i,
      kcalDelta,
      adjustedDailyTarget,
    };
  });

  return {
    ok: true,
    category: 'nutrition',
    eventType,
    adjustments,
    spreadDays,
    totalCompensatedKcal: Math.round(totalCompensated),
    totalExcessKcal: Math.round(excessKcal),
    unaddressedKcal: Math.round(unaddressed),
    hitFloor,
    floor,
    messageKey: copy.messageKey,
    recommendationKey: copy.recommendationKey,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
