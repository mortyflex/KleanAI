import type {
  MissedWorkoutEvent,
  NoMachineEvent,
  NoTimeEvent,
  PartialWorkoutEvent,
  WorkoutSmoothingAction,
  WorkoutSmoothingResult,
} from '../../../types/smoothing.types';
import { EVENT_COPY } from './messages';

export const WORKOUT_SMOOTHING = {
  /** Express workout duration suggested when the user has no time. */
  EXPRESS_WORKOUT_MIN: 15,
  /** Lower-bound express duration when the user has even less time. */
  EXPRESS_WORKOUT_MIN_SHORT: 10,
} as const;

function expressAction(durationMin: number): WorkoutSmoothingAction {
  return {
    type: 'express_workout',
    labelKey: 'smoothing.actions.express_workout.label',
    descriptionKey: 'smoothing.actions.express_workout.description',
    durationMin,
  };
}

function rescheduleAction(toWeekDayIndex?: number): WorkoutSmoothingAction {
  return {
    type: 'reschedule',
    labelKey: 'smoothing.actions.reschedule.label',
    descriptionKey: 'smoothing.actions.reschedule.description',
    rescheduleToWeekDayIndex: toWeekDayIndex,
  };
}

function integrateKeyExercisesAction(exerciseIds?: string[]): WorkoutSmoothingAction {
  return {
    type: 'integrate_key_exercises',
    labelKey: 'smoothing.actions.integrate_key_exercises.label',
    descriptionKey: 'smoothing.actions.integrate_key_exercises.description',
    exerciseIds,
  };
}

function swapAction(unavailableIds?: string[]): WorkoutSmoothingAction {
  return {
    type: 'swap_exercises',
    labelKey: 'smoothing.actions.swap_exercises.label',
    descriptionKey: 'smoothing.actions.swap_exercises.description',
    exerciseIds: unavailableIds,
  };
}

/** Pick the next non-rest weekday index, wrapping around the week. */
function nextWeekDayIndex(from?: number): number | undefined {
  if (from === undefined) return undefined;
  return (from + 1) % 7;
}

export function smoothMissedWorkout(event: MissedWorkoutEvent): WorkoutSmoothingResult {
  const copy = EVENT_COPY.missed_workout;
  return {
    ok: true,
    category: 'workout',
    eventType: 'missed_workout',
    actions: [
      expressAction(WORKOUT_SMOOTHING.EXPRESS_WORKOUT_MIN),
      rescheduleAction(nextWeekDayIndex(event.weekDayIndex)),
      integrateKeyExercisesAction(),
    ],
    messageKey: copy.messageKey,
    recommendationKey: copy.recommendationKey,
  };
}

export function smoothPartialWorkout(event: PartialWorkoutEvent): WorkoutSmoothingResult {
  const copy = EVENT_COPY.partial_workout;
  return {
    ok: true,
    category: 'workout',
    eventType: 'partial_workout',
    actions: [
      integrateKeyExercisesAction(event.remainingExerciseIds),
      rescheduleAction(nextWeekDayIndex(event.weekDayIndex)),
    ],
    messageKey: copy.messageKey,
    recommendationKey: copy.recommendationKey,
  };
}

export function smoothNoMachine(event: NoMachineEvent): WorkoutSmoothingResult {
  const copy = EVENT_COPY.no_machine;
  return {
    ok: true,
    category: 'workout',
    eventType: 'no_machine',
    actions: [
      swapAction(event.unavailableExerciseIds),
      integrateKeyExercisesAction(),
    ],
    messageKey: copy.messageKey,
    recommendationKey: copy.recommendationKey,
  };
}

export function smoothNoTime(event: NoTimeEvent): WorkoutSmoothingResult {
  const copy = EVENT_COPY.no_time;
  const available = event.availableMinutes ?? WORKOUT_SMOOTHING.EXPRESS_WORKOUT_MIN;
  const duration =
    available <= 10
      ? WORKOUT_SMOOTHING.EXPRESS_WORKOUT_MIN_SHORT
      : Math.min(available, WORKOUT_SMOOTHING.EXPRESS_WORKOUT_MIN);
  return {
    ok: true,
    category: 'workout',
    eventType: 'no_time',
    actions: [
      expressAction(duration),
      integrateKeyExercisesAction(),
      rescheduleAction(nextWeekDayIndex(event.weekDayIndex)),
    ],
    messageKey: copy.messageKey,
    recommendationKey: copy.recommendationKey,
  };
}
