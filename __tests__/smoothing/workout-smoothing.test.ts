import {
  smoothMissedWorkout,
  smoothNoMachine,
  smoothNoTime,
  smoothPartialWorkout,
  WORKOUT_SMOOTHING,
} from '../../src/features/smoothing/utils/workout-smoothing';

describe('smoothMissedWorkout', () => {
  it('offers express_workout, reschedule, and integrate_key_exercises (in that order)', () => {
    const result = smoothMissedWorkout({ type: 'missed_workout', weekDayIndex: 2 });
    expect(result.actions.map((a) => a.type)).toEqual([
      'express_workout',
      'reschedule',
      'integrate_key_exercises',
    ]);
  });

  it('the express action carries the default duration', () => {
    const result = smoothMissedWorkout({ type: 'missed_workout' });
    const express = result.actions.find((a) => a.type === 'express_workout');
    expect(express?.durationMin).toBe(WORKOUT_SMOOTHING.EXPRESS_WORKOUT_MIN);
  });

  it('reschedules to the next weekday when given the current weekDayIndex', () => {
    const result = smoothMissedWorkout({ type: 'missed_workout', weekDayIndex: 2 });
    const reschedule = result.actions.find((a) => a.type === 'reschedule');
    expect(reschedule?.rescheduleToWeekDayIndex).toBe(3);
  });

  it('wraps reschedule from Sunday (6) back to Monday (0)', () => {
    const result = smoothMissedWorkout({ type: 'missed_workout', weekDayIndex: 6 });
    const reschedule = result.actions.find((a) => a.type === 'reschedule');
    expect(reschedule?.rescheduleToWeekDayIndex).toBe(0);
  });

  it('uses zero-guilt copy keys', () => {
    const result = smoothMissedWorkout({ type: 'missed_workout' });
    expect(result.messageKey).toBe('smoothing.events.missed_workout.message');
    expect(result.recommendationKey).toBe('smoothing.events.missed_workout.recommendation');
  });
});

describe('smoothPartialWorkout', () => {
  it('integrates the remaining exercise IDs into the next session', () => {
    const result = smoothPartialWorkout({
      type: 'partial_workout',
      weekDayIndex: 1,
      remainingExerciseIds: ['bench_press', 'overhead_press'],
    });
    const integrate = result.actions.find((a) => a.type === 'integrate_key_exercises');
    expect(integrate?.exerciseIds).toEqual(['bench_press', 'overhead_press']);
  });

  it('also offers a reschedule option', () => {
    const result = smoothPartialWorkout({ type: 'partial_workout', weekDayIndex: 1 });
    expect(result.actions.some((a) => a.type === 'reschedule')).toBe(true);
  });
});

describe('smoothNoMachine', () => {
  it('proposes a swap action carrying the unavailable exercise IDs', () => {
    const result = smoothNoMachine({
      type: 'no_machine',
      unavailableExerciseIds: ['leg_press'],
    });
    const swap = result.actions.find((a) => a.type === 'swap_exercises');
    expect(swap?.exerciseIds).toEqual(['leg_press']);
  });
});

describe('smoothNoTime', () => {
  it('proposes a 15 min express session by default', () => {
    const result = smoothNoTime({ type: 'no_time' });
    const express = result.actions.find((a) => a.type === 'express_workout');
    expect(express?.durationMin).toBe(WORKOUT_SMOOTHING.EXPRESS_WORKOUT_MIN);
  });

  it('drops to a 10 min express session when the user has 10 minutes or less', () => {
    const result = smoothNoTime({ type: 'no_time', availableMinutes: 8 });
    const express = result.actions.find((a) => a.type === 'express_workout');
    expect(express?.durationMin).toBe(WORKOUT_SMOOTHING.EXPRESS_WORKOUT_MIN_SHORT);
  });
});
