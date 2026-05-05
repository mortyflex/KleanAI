import type { Gender, SafetyFlag } from '../types/profile.types';
import { bmrMifflinStJeor, tdeeFromBMR, bmi } from './calories';

export const CALORIE_FLOOR_MALE = 1500;
export const CALORIE_FLOOR_FEMALE = 1200;
export const MAX_WEEKLY_WEIGHT_LOSS_KG = 1.0;
export const MAX_WEEKLY_WEIGHT_LOSS_PCT = 0.01;
export const MAX_DAILY_DEFICIT_KCAL = 1000;
export const MIN_AGE = 18;
export const MIN_BMI_FOR_WEIGHT_LOSS = 17.5;
export const KCAL_PER_KG = 7700;
export const PROGRAM_WEEKS = 12;

export function calorieFloor(gender: Gender): number {
  return gender === 'male' ? CALORIE_FLOOR_MALE : CALORIE_FLOOR_FEMALE;
}

export interface SafetyCheckParams {
  age: number;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  targetWeightKg?: number;
  targetTimeframeWeeks?: number;
  trainingDaysPerWeek: number;
  goal: string;
}

export function runSafetyChecks(params: SafetyCheckParams): SafetyFlag[] {
  const {
    age,
    gender,
    weightKg,
    heightCm,
    targetWeightKg,
    targetTimeframeWeeks,
    trainingDaysPerWeek,
    goal,
  } = params;
  const flags: SafetyFlag[] = [];

  if (age < MIN_AGE) {
    flags.push({
      code: 'AGE_TOO_YOUNG',
      severity: 'block',
      i18nKey: 'onboarding.safety.flags.ageTooYoung',
    });
    return flags;
  }

  const currentBmi = bmi(weightKg, heightCm);
  if (goal === 'lose_weight' && currentBmi < MIN_BMI_FOR_WEIGHT_LOSS) {
    flags.push({
      code: 'BMI_TOO_LOW',
      severity: 'block',
      i18nKey: 'onboarding.safety.flags.bmiTooLow',
    });
  }

  if (goal === 'lose_weight' && targetWeightKg !== undefined) {
    const kgToLose = weightKg - targetWeightKg;
    if (kgToLose > 0) {
      const weeks = targetTimeframeWeeks ?? PROGRAM_WEEKS;
      const weeklyLossKg = kgToLose / weeks;
      const dailyDeficit = (weeklyLossKg * KCAL_PER_KG) / 7;

      // Block if weekly loss exceeds 1 kg/week OR 1% of body weight per week
      const maxWeeklyLoss = Math.min(
        MAX_WEEKLY_WEIGHT_LOSS_KG,
        weightKg * MAX_WEEKLY_WEIGHT_LOSS_PCT
      );
      if (weeklyLossKg > maxWeeklyLoss) {
        flags.push({
          code: 'WEIGHT_LOSS_TOO_FAST',
          severity: 'block',
          i18nKey: 'onboarding.safety.flags.weightLossTooFast',
        });
      }

      if (dailyDeficit > MAX_DAILY_DEFICIT_KCAL) {
        flags.push({
          code: 'DEFICIT_TOO_HIGH',
          severity: 'block',
          i18nKey: 'onboarding.safety.flags.deficitTooHigh',
        });
      }

      const bmr = bmrMifflinStJeor(weightKg, heightCm, age, gender);
      const tdee = tdeeFromBMR(bmr, trainingDaysPerWeek);
      const estimatedCalories = tdee - dailyDeficit;
      const floor = calorieFloor(gender);

      if (estimatedCalories < floor) {
        flags.push({
          code: 'CALORIES_TOO_LOW',
          severity: 'block',
          i18nKey: 'onboarding.safety.flags.caloriesTooLow',
        });
      }
    }
  }

  return flags;
}

export function hasBlockingFlags(flags: SafetyFlag[]): boolean {
  return flags.some((f) => f.severity === 'block');
}
