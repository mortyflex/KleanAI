import { z } from 'zod';
import { MAINTAIN_TOLERANCE_KG } from '../../utils/goal-classification';

export const GoalSchema = z.object({
  goal: z.enum(['lose_weight', 'gain_muscle', 'maintain', 'recomposition']),
});

export const TimeframeSchema = z.object({
  durationWeeks: z
    .number({ message: 'durationRequired' })
    .int()
    .min(1, 'durationInvalid')
    .max(104, 'durationInvalid'),
  eventLabel: z.enum(['wedding', 'vacation', 'competition', 'other']).optional(),
});

const baseMetricsShape = {
  age: z.number().int().min(14, 'ageInvalid').max(100, 'ageInvalid'),
  gender: z.enum(['male', 'female', 'other']),
  heightCm: z.number().min(100, 'heightInvalid').max(250, 'heightInvalid'),
  weightKg: z.number().min(30, 'weightInvalid').max(300, 'weightInvalid'),
  targetWeightKg: z
    .number()
    .min(30, 'targetWeightInvalid')
    .max(300, 'targetWeightInvalid')
    .optional(),
  /** Read-only context — used only for cross-field consistency validation. */
  goal: z.enum(['lose_weight', 'gain_muscle', 'maintain', 'recomposition']).optional(),
};

export const MetricsSchema = z.object(baseMetricsShape).superRefine((data, ctx) => {
  if (data.targetWeightKg === undefined || data.goal === undefined) return;

  if (data.goal === 'lose_weight' && data.targetWeightKg >= data.weightKg) {
    ctx.addIssue({
      code: 'custom',
      path: ['targetWeightKg'],
      message: 'targetMustBeLower',
    });
  }
  if (data.goal === 'gain_muscle' && data.targetWeightKg <= data.weightKg) {
    ctx.addIssue({
      code: 'custom',
      path: ['targetWeightKg'],
      message: 'targetMustBeHigher',
    });
  }
  if (
    data.goal === 'maintain' &&
    Math.abs(data.targetWeightKg - data.weightKg) > MAINTAIN_TOLERANCE_KG
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['targetWeightKg'],
      message: 'targetMustBeClose',
    });
  }
});

export const FitnessLevelSchema = z.object({
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']),
});

export const SessionDurationSchema = z.object({
  sessionDurationMin: z.number().int().refine((v) => [30, 45, 60, 75].includes(v)),
});

const TimeSlotEnum = z.enum(['morning', 'midday', 'evening']);

export const AvailabilitySchema = z.object({
  slots: z
    .record(z.string(), z.array(TimeSlotEnum))
    .refine(
      (slots) => Object.values(slots).some((arr) => Array.isArray(arr) && arr.length > 0),
      { message: 'minOneRequired' }
    ),
});

export const TrainingSchema = z.object({
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  trainingDaysPerWeek: z.number().int().min(1).max(6),
  sessionDurationMin: z.number().int().refine((v) => [30, 45, 60, 75, 90].includes(v)),
});

export const LocationSchema = z.object({
  trainingLocation: z.enum(['gym', 'home', 'both']),
  gymChain: z.enum(['basic_fit', 'fitness_park', 'on_air', 'other']).optional(),
});

export const NutritionPrefsSchema = z.object({
  dietaryRestrictions: z.array(
    z.enum(['vegetarian', 'vegan', 'gluten_free', 'lactose_free', 'halal', 'kosher'])
  ),
});

export type GoalFormData = z.infer<typeof GoalSchema>;
export type MetricsFormData = z.infer<typeof MetricsSchema>;
export type TrainingFormData = z.infer<typeof TrainingSchema>;
export type FitnessLevelFormData = z.infer<typeof FitnessLevelSchema>;
export type SessionDurationFormData = z.infer<typeof SessionDurationSchema>;
export type AvailabilityFormData = z.infer<typeof AvailabilitySchema>;
export type LocationFormData = z.infer<typeof LocationSchema>;
export type NutritionPrefsFormData = z.infer<typeof NutritionPrefsSchema>;
export type TimeframeFormData = z.infer<typeof TimeframeSchema>;
