import type {
  FitnessGoal,
  Gender,
  GoalClassificationKind,
  SafetyFlag,
} from '../types/profile.types';
import { bmi, bmrMifflinStJeor, tdeeFromBMR } from './calories';
import {
  CALORIE_FLOOR_FEMALE,
  CALORIE_FLOOR_MALE,
  KCAL_PER_KG,
  MAX_DAILY_DEFICIT_KCAL,
  MAX_WEEKLY_WEIGHT_LOSS_KG,
  MAX_WEEKLY_WEIGHT_LOSS_PCT,
  MIN_AGE,
  MIN_BMI_FOR_WEIGHT_LOSS,
  PROGRAM_WEEKS,
  type SafetyCheckParams,
  calorieFloor,
} from './safety';

/**
 * Tolerance for "maintain" goals — a target up to this many kg away from
 * current weight is treated as consistent with maintenance. Beyond this,
 * the user clearly wants to lose or gain, and the goal is inconsistent.
 */
export const MAINTAIN_TOLERANCE_KG = 3;

/**
 * Weight-gain pacing thresholds (kg per week).
 *
 * - At or below {@link MAX_WEEKLY_GAIN_KG}: safe lean-gain pace.
 * - Above safe but at or below {@link AMBITIOUS_WEEKLY_GAIN_KG}: ambitious —
 *   allowed only with explicit user confirmation.
 * - Above {@link UNSAFE_WEEKLY_GAIN_KG}: unsafe — block automatic planning.
 */
export const MAX_WEEKLY_GAIN_KG = 0.5;
export const AMBITIOUS_WEEKLY_GAIN_KG = 0.5;
export const UNSAFE_WEEKLY_GAIN_KG = 1.0;

/**
 * Weight-loss ambition threshold — at or below this is comfortably safe,
 * above this (but still under the unsafe cap) is ambitious.
 */
export const AMBITIOUS_WEEKLY_LOSS_PCT = 0.0075;

export interface GoalClassificationParams {
  goal: FitnessGoal;
  age: number;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  targetWeightKg?: number;
  targetTimeframeWeeks?: number;
  trainingDaysPerWeek: number;
}

export interface GoalClassification {
  kind: GoalClassificationKind;
  reasons: string[];
  weeklyChangeKg: number;
  estimatedDailyCalories?: number;
  flags: SafetyFlag[];
}

function flag(
  code: SafetyFlag['code'],
  severity: SafetyFlag['severity'],
  i18nKey: string
): SafetyFlag {
  return { code, severity, i18nKey };
}

/**
 * Returns a deterministic classification of the user's goal —
 * never relies on AI. AI may later be used to *explain* the result
 * but must not influence the kind.
 */
export function classifyGoal(params: GoalClassificationParams): GoalClassification {
  const {
    goal,
    age,
    gender,
    weightKg,
    heightCm,
    targetWeightKg,
    targetTimeframeWeeks,
    trainingDaysPerWeek,
  } = params;

  const flags: SafetyFlag[] = [];
  const reasons: string[] = [];

  // Hard age block — overrides everything else.
  if (age < MIN_AGE) {
    flags.push(flag('AGE_TOO_YOUNG', 'block', 'onboarding.safety.flags.ageTooYoung'));
    return { kind: 'unsafe', reasons: ['AGE_TOO_YOUNG'], weeklyChangeKg: 0, flags };
  }

  const weeks = targetTimeframeWeeks ?? PROGRAM_WEEKS;

  // ── Goal consistency ─────────────────────────────────────────────────────
  if (targetWeightKg !== undefined) {
    if (goal === 'lose_weight' && targetWeightKg >= weightKg) {
      flags.push(
        flag('GOAL_INCONSISTENT_LOSS', 'block', 'onboarding.safety.flags.goalInconsistentLoss')
      );
      reasons.push('GOAL_INCONSISTENT_LOSS');
    }
    if (goal === 'gain_muscle' && targetWeightKg <= weightKg) {
      flags.push(
        flag('GOAL_INCONSISTENT_GAIN', 'block', 'onboarding.safety.flags.goalInconsistentGain')
      );
      reasons.push('GOAL_INCONSISTENT_GAIN');
    }
    if (
      goal === 'maintain' &&
      Math.abs(targetWeightKg - weightKg) > MAINTAIN_TOLERANCE_KG
    ) {
      flags.push(
        flag(
          'GOAL_INCONSISTENT_MAINTAIN',
          'block',
          'onboarding.safety.flags.goalInconsistentMaintain'
        )
      );
      reasons.push('GOAL_INCONSISTENT_MAINTAIN');
    }
  }

  if (reasons.length > 0) {
    return { kind: 'inconsistent', reasons, weeklyChangeKg: 0, flags };
  }

  // ── BMI guard for loss ───────────────────────────────────────────────────
  if (goal === 'lose_weight' && bmi(weightKg, heightCm) < MIN_BMI_FOR_WEIGHT_LOSS) {
    flags.push(flag('BMI_TOO_LOW', 'block', 'onboarding.safety.flags.bmiTooLow'));
    reasons.push('BMI_TOO_LOW');
  }

  // ── Pace evaluation ──────────────────────────────────────────────────────
  let weeklyChangeKg = 0;
  let estimatedDailyCalories: number | undefined;
  let ambitious = false;

  const bmrVal = bmrMifflinStJeor(weightKg, heightCm, age, gender);
  const tdee = tdeeFromBMR(bmrVal, trainingDaysPerWeek);
  estimatedDailyCalories = tdee;

  if (
    targetWeightKg !== undefined &&
    (goal === 'lose_weight' || goal === 'gain_muscle')
  ) {
    const deltaKg = Math.abs(targetWeightKg - weightKg);
    weeklyChangeKg = deltaKg / weeks;

    if (goal === 'lose_weight') {
      const dailyDeficit = (weeklyChangeKg * KCAL_PER_KG) / 7;
      const floor = calorieFloor(gender);
      const rawTarget = tdee - dailyDeficit;
      estimatedDailyCalories = Math.max(floor, Math.round(rawTarget));

      const unsafeWeekly = Math.min(
        MAX_WEEKLY_WEIGHT_LOSS_KG,
        weightKg * MAX_WEEKLY_WEIGHT_LOSS_PCT
      );
      const ambitiousWeekly = weightKg * AMBITIOUS_WEEKLY_LOSS_PCT;

      if (weeklyChangeKg > unsafeWeekly) {
        flags.push(
          flag('WEIGHT_LOSS_TOO_FAST', 'block', 'onboarding.safety.flags.weightLossTooFast')
        );
        reasons.push('WEIGHT_LOSS_TOO_FAST');
      }
      if (dailyDeficit > MAX_DAILY_DEFICIT_KCAL) {
        flags.push(flag('DEFICIT_TOO_HIGH', 'block', 'onboarding.safety.flags.deficitTooHigh'));
        reasons.push('DEFICIT_TOO_HIGH');
      }
      if (rawTarget < floor) {
        flags.push(flag('CALORIES_TOO_LOW', 'block', 'onboarding.safety.flags.caloriesTooLow'));
        reasons.push('CALORIES_TOO_LOW');
      }
      if (weeklyChangeKg > ambitiousWeekly && weeklyChangeKg <= unsafeWeekly) {
        ambitious = true;
        reasons.push('LOSS_PACE_AMBITIOUS');
      }
    }

    if (goal === 'gain_muscle') {
      const dailySurplus = (weeklyChangeKg * KCAL_PER_KG) / 7;
      estimatedDailyCalories = Math.round(tdee + dailySurplus);

      if (weeklyChangeKg > UNSAFE_WEEKLY_GAIN_KG) {
        flags.push(
          flag('WEIGHT_GAIN_TOO_FAST', 'block', 'onboarding.safety.flags.weightGainTooFast')
        );
        reasons.push('WEIGHT_GAIN_TOO_FAST');
      } else if (weeklyChangeKg > AMBITIOUS_WEEKLY_GAIN_KG) {
        ambitious = true;
        reasons.push('GAIN_PACE_AMBITIOUS');
      }
    }
  }

  let kind: GoalClassificationKind;
  if (flags.some((f) => f.severity === 'block')) {
    kind = 'unsafe';
  } else if (ambitious) {
    kind = 'ambitious';
  } else {
    kind = 'valid';
  }

  return { kind, reasons, weeklyChangeKg, estimatedDailyCalories, flags };
}

export const GAIN_CONSTANTS = {
  CALORIE_FLOOR_FEMALE,
  CALORIE_FLOOR_MALE,
};

/**
 * Backward-compatible flag-only API used by existing screens and tests.
 * Internally delegates to {@link classifyGoal}.
 */
export function runSafetyChecks(params: SafetyCheckParams): SafetyFlag[] {
  const supported = ['lose_weight', 'gain_muscle', 'maintain', 'recomposition'] as const;
  const goalTyped: FitnessGoal = supported.includes(
    params.goal as (typeof supported)[number]
  )
    ? (params.goal as FitnessGoal)
    : 'maintain';
  return classifyGoal({ ...params, goal: goalTyped }).flags;
}
