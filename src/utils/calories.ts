import type { Gender } from '../types/profile.types';

/** Mifflin-St Jeor BMR formula */
export function bmrMifflinStJeor(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

/** TDEE from BMR using PAL factors based on training days/week */
export function tdeeFromBMR(bmr: number, weeklyTrainingDays: number): number {
  let factor: number;
  if (weeklyTrainingDays === 0) factor = 1.2;
  else if (weeklyTrainingDays <= 2) factor = 1.375;
  else if (weeklyTrainingDays <= 4) factor = 1.55;
  else if (weeklyTrainingDays <= 5) factor = 1.725;
  else factor = 1.9;
  return Math.round(bmr * factor);
}

/** BMI calculation */
export function bmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return weightKg / (h * h);
}
