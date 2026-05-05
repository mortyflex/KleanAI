export type FitnessGoal = 'lose_weight' | 'gain_muscle' | 'maintain' | 'recomposition';
export type Gender = 'male' | 'female' | 'other';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type TrainingLocation = 'gym' | 'home' | 'both';
export type GymChain = 'basic_fit' | 'fitness_park' | 'on_air' | 'other';
export type DietaryRestriction =
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'lactose_free'
  | 'halal'
  | 'kosher';
export type EventLabel = 'wedding' | 'vacation' | 'competition' | 'other';

export type SafetyCode =
  | 'AGE_TOO_YOUNG'
  | 'CALORIES_TOO_LOW'
  | 'DEFICIT_TOO_HIGH'
  | 'WEIGHT_LOSS_TOO_FAST'
  | 'BMI_TOO_LOW';

export type SafetySeverity = 'block' | 'warn';

export interface SafetyFlag {
  code: SafetyCode;
  severity: SafetySeverity;
  i18nKey: string;
}

export interface TargetTimeframe {
  durationWeeks: number;
  eventLabel?: EventLabel;
}

export interface OnboardingProfile {
  goal: FitnessGoal;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  targetTimeframe?: TargetTimeframe;
  fitnessLevel: FitnessLevel;
  trainingDaysPerWeek: number;
  sessionDurationMin: number;
  trainingLocation: TrainingLocation;
  gymChain?: GymChain;
  dietaryRestrictions: DietaryRestriction[];
  safetyFlags: SafetyFlag[];
  isComplete: boolean;
}
