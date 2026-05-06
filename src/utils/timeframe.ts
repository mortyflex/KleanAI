import type { FitnessGoal } from '../types/profile.types';
import { MAX_WEEKLY_WEIGHT_LOSS_KG, MAX_WEEKLY_WEIGHT_LOSS_PCT } from './safety';
import { MAX_WEEKLY_GAIN_KG } from './goal-classification';

export interface SafetyAlternative {
  saferWeeks: number;
  saferWeeklyLossKg: number;
  suggestKickstart: boolean;
  partialProgressPossible: boolean;
  partialKgBeforeEvent: number;
  maxSafeWeeklyLoss: number;
}

export function suggestSaferAlternatives(params: {
  weightKg: number;
  targetWeightKg: number;
  targetTimeframeWeeks?: number;
}): SafetyAlternative {
  const { weightKg, targetWeightKg, targetTimeframeWeeks } = params;
  const kgToLose = weightKg - targetWeightKg;

  const maxSafeWeeklyLoss = parseFloat(
    Math.min(MAX_WEEKLY_WEIGHT_LOSS_KG, weightKg * MAX_WEEKLY_WEIGHT_LOSS_PCT).toFixed(2)
  );

  const saferWeeks = Math.ceil(kgToLose / maxSafeWeeklyLoss);
  const saferWeeklyLossKg = parseFloat((kgToLose / saferWeeks).toFixed(2));

  const partialKgBeforeEvent =
    targetTimeframeWeeks !== undefined
      ? parseFloat((targetTimeframeWeeks * maxSafeWeeklyLoss).toFixed(1))
      : 0;

  const partialProgressPossible =
    targetTimeframeWeeks !== undefined &&
    targetTimeframeWeeks < saferWeeks &&
    partialKgBeforeEvent > 0;

  const suggestKickstart = (targetTimeframeWeeks ?? saferWeeks) <= 4;

  return {
    saferWeeks,
    saferWeeklyLossKg,
    suggestKickstart,
    partialProgressPossible,
    partialKgBeforeEvent,
    maxSafeWeeklyLoss,
  };
}

export const MIN_RECOMMENDED_WEEKS = 4;
export const MAX_RECOMMENDED_WEEKS = 52;

/**
 * Recommended timeframe (in weeks) for the given goal and target.
 * For loss/gain, uses the safe weekly change rate so the result is the
 * shortest *responsible* duration. For maintenance / no target, falls
 * back to a reasonable default.
 */
export function recommendedWeeksFor(params: {
  goal: FitnessGoal;
  weightKg: number;
  targetWeightKg?: number;
}): number {
  const { goal, weightKg, targetWeightKg } = params;

  if (goal === 'lose_weight' && targetWeightKg !== undefined && targetWeightKg < weightKg) {
    const kgToLose = weightKg - targetWeightKg;
    const safeWeekly = Math.min(MAX_WEEKLY_WEIGHT_LOSS_KG, weightKg * MAX_WEEKLY_WEIGHT_LOSS_PCT);
    return clampWeeks(Math.ceil(kgToLose / safeWeekly));
  }

  if (goal === 'gain_muscle' && targetWeightKg !== undefined && targetWeightKg > weightKg) {
    const kgToGain = targetWeightKg - weightKg;
    return clampWeeks(Math.ceil(kgToGain / MAX_WEEKLY_GAIN_KG));
  }

  return 12;
}

function clampWeeks(weeks: number): number {
  if (Number.isNaN(weeks)) return 12;
  if (weeks < MIN_RECOMMENDED_WEEKS) return MIN_RECOMMENDED_WEEKS;
  if (weeks > MAX_RECOMMENDED_WEEKS) return MAX_RECOMMENDED_WEEKS;
  return weeks;
}
