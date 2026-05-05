import type { Gender } from './profile.types';

export type SmoothingEventType =
  | 'missed_workout'
  | 'partial_workout'
  | 'excess_food'
  | 'skipped_meal'
  | 'ordered_food'
  | 'alcohol'
  | 'no_machine'
  | 'no_time';

export const SMOOTHING_EVENT_TYPES: readonly SmoothingEventType[] = [
  'missed_workout',
  'partial_workout',
  'excess_food',
  'skipped_meal',
  'ordered_food',
  'alcohol',
  'no_machine',
  'no_time',
] as const;

export type SmoothingCategory = 'nutrition' | 'workout';

export interface SmoothingEventBase {
  id?: string;
  occurredAt?: string;
}

export interface MissedWorkoutEvent extends SmoothingEventBase {
  type: 'missed_workout';
  weekDayIndex?: number;
}

export interface PartialWorkoutEvent extends SmoothingEventBase {
  type: 'partial_workout';
  weekDayIndex?: number;
  completedExerciseIds?: string[];
  remainingExerciseIds?: string[];
}

export interface ExcessFoodEvent extends SmoothingEventBase {
  type: 'excess_food';
  excessKcal: number;
}

export interface SkippedMealEvent extends SmoothingEventBase {
  type: 'skipped_meal';
  missedKcal: number;
}

export interface OrderedFoodEvent extends SmoothingEventBase {
  type: 'ordered_food';
  excessKcal: number;
}

export interface AlcoholEvent extends SmoothingEventBase {
  type: 'alcohol';
  excessKcal: number;
}

export interface NoMachineEvent extends SmoothingEventBase {
  type: 'no_machine';
  weekDayIndex?: number;
  unavailableExerciseIds?: string[];
}

export interface NoTimeEvent extends SmoothingEventBase {
  type: 'no_time';
  weekDayIndex?: number;
  availableMinutes?: number;
}

export type SmoothingEvent =
  | MissedWorkoutEvent
  | PartialWorkoutEvent
  | ExcessFoodEvent
  | SkippedMealEvent
  | OrderedFoodEvent
  | AlcoholEvent
  | NoMachineEvent
  | NoTimeEvent;

export interface SmoothingContext {
  gender: Gender;
  dailyKcalTarget: number;
}

export interface DailyKcalAdjustment {
  dayOffset: number; // 0 = today, 1 = tomorrow, 2 = day after tomorrow
  kcalDelta: number; // negative = small extra deficit, positive = restoring
  adjustedDailyTarget: number; // resulting daily target after adjustment
}

export interface NutritionSmoothingResult {
  ok: true;
  category: 'nutrition';
  eventType: SmoothingEventType;
  adjustments: DailyKcalAdjustment[];
  spreadDays: number; // 2 or 3
  totalCompensatedKcal: number;
  totalExcessKcal: number;
  unaddressedKcal: number;
  hitFloor: boolean;
  floor: number;
  messageKey: string;
  recommendationKey: string;
}

export type WorkoutSmoothingActionType =
  | 'express_workout'
  | 'reschedule'
  | 'integrate_key_exercises'
  | 'swap_exercises';

export interface WorkoutSmoothingAction {
  type: WorkoutSmoothingActionType;
  labelKey: string;
  descriptionKey: string;
  durationMin?: number;
  rescheduleToWeekDayIndex?: number;
  exerciseIds?: string[];
}

export interface WorkoutSmoothingResult {
  ok: true;
  category: 'workout';
  eventType: SmoothingEventType;
  actions: WorkoutSmoothingAction[];
  messageKey: string;
  recommendationKey: string;
}

export type SmoothingErrorReason = 'unknown_event_type' | 'invalid_event';

export interface SmoothingErrorResult {
  ok: false;
  reason: SmoothingErrorReason;
  messageKey: string;
}

export type SmoothingResult =
  | NutritionSmoothingResult
  | WorkoutSmoothingResult
  | SmoothingErrorResult;
