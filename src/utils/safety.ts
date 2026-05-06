import type { Gender, SafetyFlag } from '../types/profile.types';

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

export function hasBlockingFlags(flags: SafetyFlag[]): boolean {
  return flags.some((f) => f.severity === 'block');
}

/**
 * Returns the deterministic safety flags for a profile. Thin facade over
 * {@link import('./goal-classification').classifyGoal} kept for backward
 * compatibility with screens and tests that only need the flag list.
 *
 * AI is never the primary decision maker for safety. AI may only be used
 * later to *explain* the result in personalized copy.
 */
export { runSafetyChecks } from './goal-classification';
