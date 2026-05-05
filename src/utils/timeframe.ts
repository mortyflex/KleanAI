import { MAX_WEEKLY_WEIGHT_LOSS_KG, MAX_WEEKLY_WEIGHT_LOSS_PCT } from './safety';

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
