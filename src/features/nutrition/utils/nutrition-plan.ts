import type {
  DietaryRestriction,
  FitnessGoal,
  Gender,
  OnboardingProfile,
} from '../../../types/profile.types';
import { bmrMifflinStJeor, tdeeFromBMR } from '../../../utils/calories';
import {
  KCAL_PER_KG,
  PROGRAM_WEEKS,
  calorieFloor,
} from '../../../utils/safety';

/**
 * Protein targets in g per kg of body weight, by goal. Pulled to keep
 * the plan calculator transparent and easy to test.
 *
 * - lose_weight    → 2.0 g/kg (preserve lean mass during deficit)
 * - gain_muscle    → 1.8 g/kg (lean-gain bracket)
 * - recomposition  → 2.0 g/kg (highest of the three to support recomp)
 * - maintain       → 1.6 g/kg (general health floor)
 */
export const PROTEIN_PER_KG: Record<FitnessGoal, number> = {
  lose_weight: 2.0,
  gain_muscle: 1.8,
  recomposition: 2.0,
  maintain: 1.6,
};

/**
 * Macro split by goal expressed as a fraction of total daily calories.
 * Protein is always derived from body weight (above), so the macro split
 * here only governs how the remaining kcal are divided between carbs and
 * fat. Numbers must sum to 1 for the leftover share.
 */
export const FAT_RATIO: Record<FitnessGoal, number> = {
  lose_weight: 0.30,
  gain_muscle: 0.25,
  recomposition: 0.27,
  maintain: 0.30,
};

export const KCAL_PER_G_PROTEIN = 4;
export const KCAL_PER_G_CARB = 4;
export const KCAL_PER_G_FAT = 9;

/** Minimum hydration default in glasses/day (250 mL each). */
export const HYDRATION_GLASSES_DEFAULT = 8;

export interface DailyNutritionPlan {
  /** Daily calorie target. Always >= calorieFloor(gender). */
  calories: number;
  /** Daily protein target in grams. */
  proteinG: number;
  /** Daily carbs target in grams. */
  carbsG: number;
  /** Daily fat target in grams. */
  fatG: number;
  /** Recommended hydration in glasses (250 mL each). */
  hydrationGlasses: number;
  /** True if the raw calculation dipped below the safety floor and was clamped. */
  clampedToFloor: boolean;
  /** Active dietary restrictions (forwarded for downstream filters). */
  restrictions: DietaryRestriction[];
  /** Daily calorie floor used for clamping. */
  floor: number;
}

export interface PlanInput {
  goal: FitnessGoal;
  gender: Gender;
  age: number;
  weightKg: number;
  heightCm: number;
  trainingDaysPerWeek: number;
  targetWeightKg?: number;
  targetTimeframeWeeks?: number;
  restrictions?: DietaryRestriction[];
}

/**
 * Compute the user's daily nutrition plan from their profile.
 *
 * Calorie target is derived from BMR + activity (TDEE), then nudged for
 * weight-loss / weight-gain pace within the safety bounds the smoothing
 * engine and onboarding classifier already enforce. The result is *always*
 * clamped to the gender-specific calorie floor — even if the caller passes
 * an aggressive timeframe, the plan never asks the user to eat below
 * {@link calorieFloor}.
 *
 * Protein is `weightKg * PROTEIN_PER_KG[goal]`. Fat is a goal-dependent
 * fraction of total calories. Carbs absorb the remainder.
 */
export function computeDailyPlan(input: PlanInput): DailyNutritionPlan {
  const {
    goal,
    gender,
    age,
    weightKg,
    heightCm,
    trainingDaysPerWeek,
    targetWeightKg,
    targetTimeframeWeeks,
    restrictions = [],
  } = input;

  const bmr = bmrMifflinStJeor(weightKg, heightCm, age, gender);
  const tdee = tdeeFromBMR(bmr, trainingDaysPerWeek);

  const weeks = targetTimeframeWeeks ?? PROGRAM_WEEKS;
  let rawCalories = tdee;

  if (
    targetWeightKg !== undefined
    && Number.isFinite(targetWeightKg)
    && weeks > 0
  ) {
    const deltaKg = targetWeightKg - weightKg;

    if (goal === 'lose_weight' && deltaKg < 0) {
      const dailyDeficit = (Math.abs(deltaKg) * KCAL_PER_KG) / weeks / 7;
      rawCalories = tdee - dailyDeficit;
    }

    if (goal === 'gain_muscle' && deltaKg > 0) {
      const dailySurplus = (deltaKg * KCAL_PER_KG) / weeks / 7;
      rawCalories = tdee + dailySurplus;
    }
  }

  const floor = calorieFloor(gender);
  const clampedToFloor = rawCalories < floor;
  const calories = Math.max(floor, Math.round(rawCalories));

  const proteinG = Math.round(weightKg * PROTEIN_PER_KG[goal]);
  const proteinKcal = proteinG * KCAL_PER_G_PROTEIN;

  const fatRatio = FAT_RATIO[goal];
  const fatKcal = calories * fatRatio;
  const fatG = Math.round(fatKcal / KCAL_PER_G_FAT);

  // Carbs absorb whatever remains. If protein + fat already exceed the
  // calorie target (extreme low calories + high body weight), carbs is 0
  // — never negative.
  const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbsG = Math.round(carbsKcal / KCAL_PER_G_CARB);

  return {
    calories,
    proteinG,
    carbsG,
    fatG,
    hydrationGlasses: HYDRATION_GLASSES_DEFAULT,
    clampedToFloor,
    restrictions,
    floor,
  };
}

/**
 * Build a {@link PlanInput} from an onboarding profile. Returns null when
 * required fields are missing — callers should fall back to a placeholder
 * UI rather than computing on partial data.
 */
export function planInputFromProfile(
  profile: Partial<OnboardingProfile>,
): PlanInput | null {
  if (
    profile.goal === undefined
    || profile.gender === undefined
    || profile.age === undefined
    || profile.weightKg === undefined
    || profile.heightCm === undefined
    || profile.trainingDaysPerWeek === undefined
  ) {
    return null;
  }
  return {
    goal: profile.goal,
    gender: profile.gender,
    age: profile.age,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    trainingDaysPerWeek: profile.trainingDaysPerWeek,
    targetWeightKg: profile.targetWeightKg,
    targetTimeframeWeeks: profile.targetTimeframe?.durationWeeks,
    restrictions: profile.dietaryRestrictions ?? [],
  };
}
