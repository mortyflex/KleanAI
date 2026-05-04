import { z } from 'zod';

export const GoalSchema = z.object({
  goal: z.enum(['lose_weight', 'gain_muscle', 'maintain', 'recomposition']),
});

export const MetricsSchema = z.object({
  age: z.number().int().min(14, 'ageInvalid').max(100, 'ageInvalid'),
  gender: z.enum(['male', 'female', 'other']),
  heightCm: z.number().min(100, 'heightInvalid').max(250, 'heightInvalid'),
  weightKg: z.number().min(30, 'weightInvalid').max(300, 'weightInvalid'),
  targetWeightKg: z
    .number()
    .min(30, 'targetWeightInvalid')
    .max(300, 'targetWeightInvalid')
    .optional(),
});

export const TrainingSchema = z.object({
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  trainingDaysPerWeek: z.number().int().min(1).max(6),
  sessionDurationMin: z.number().int().refine((v) => [30, 45, 60, 90].includes(v)),
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
export type LocationFormData = z.infer<typeof LocationSchema>;
export type NutritionPrefsFormData = z.infer<typeof NutritionPrefsSchema>;
