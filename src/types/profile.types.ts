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
  | 'WEIGHT_GAIN_TOO_FAST'
  | 'BMI_TOO_LOW'
  | 'GOAL_INCONSISTENT_LOSS'
  | 'GOAL_INCONSISTENT_GAIN'
  | 'GOAL_INCONSISTENT_MAINTAIN';

export type SafetySeverity = 'block' | 'warn';

export interface SafetyFlag {
  code: SafetyCode;
  severity: SafetySeverity;
  i18nKey: string;
}

/**
 * Deterministic classification of a user's goal pace and consistency.
 * Computed from current weight, target weight, timeframe, goal type,
 * and estimated calorie impact. AI is never the primary decision maker.
 */
export type GoalClassificationKind = 'valid' | 'ambitious' | 'unsafe' | 'inconsistent';

export interface TargetTimeframe {
  durationWeeks: number;
  eventLabel?: EventLabel;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type TimeSlot = 'morning' | 'midday' | 'evening';

/**
 * Structured weekly availability — used by the program generator
 * to schedule sessions to days/slots the user has actually selected.
 */
export interface WeeklyAvailability {
  /** Map dayOfWeek (0=Mon … 6=Sun) -> set of selected time slots */
  slots: Partial<Record<DayOfWeek, TimeSlot[]>>;
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
  weeklyAvailability?: WeeklyAvailability;
  /** User explicitly accepted an "ambitious" goal classification. */
  ambitionAccepted?: boolean;
  safetyFlags: SafetyFlag[];
  isComplete: boolean;
}
