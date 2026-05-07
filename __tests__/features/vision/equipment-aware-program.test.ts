import {
  generateProgram,
  isExerciseAvailable,
} from '../../../src/features/workout/utils/generate-program';
import type {
  Equipment,
  GenerateProgramParams,
  WorkoutDay,
  WorkoutExercise,
} from '../../../src/types/workout.types';
import { EXERCISES } from '../../../src/features/workout/data/exercises';

const gymBase: GenerateProgramParams = {
  fitnessLevel: 'intermediate',
  trainingDaysPerWeek: 3,
  sessionDurationMin: 45,
  trainingLocation: 'gym',
  durationWeeks: 12,
};

function workoutExercises(days: WorkoutDay[]): WorkoutExercise[] {
  return days.filter((d) => !d.isRestDay).flatMap((d) => d.exercises);
}

describe('isExerciseAvailable', () => {
  it('returns true when one of the required equipment categories is available', () => {
    expect(isExerciseAvailable(['barbell', 'dumbbell'], new Set(['dumbbell']))).toBe(
      true,
    );
  });

  it('always treats bodyweight as available, even without an explicit set entry', () => {
    expect(isExerciseAvailable(['bodyweight'], new Set())).toBe(true);
  });

  it('returns false when none of the required equipment is available', () => {
    expect(isExerciseAvailable(['barbell'], new Set(['dumbbell']))).toBe(false);
  });
});

describe('generateProgram — equipment-aware filtering', () => {
  it('keeps existing behavior when availableEquipment is undefined', () => {
    const program = generateProgram(gymBase);
    expect(program.days).toHaveLength(7);
    const exerciseIds = workoutExercises(program.days).map((ex) => ex.exerciseId);
    expect(exerciseIds).toContain('bench_press');
  });

  it('drops exercises that require equipment outside the available set', () => {
    const noBarbell: Equipment[] = ['dumbbell', 'cable', 'machine'];
    const program = generateProgram({ ...gymBase, availableEquipment: noBarbell });

    workoutExercises(program.days).forEach((ex) => {
      const required = EXERCISES[ex.exerciseId].equipment;
      const allowed = new Set<Equipment>([...noBarbell, 'bodyweight']);
      expect(required.some((eq) => allowed.has(eq))).toBe(true);
    });

    // Pure-barbell exercises should be filtered out.
    const ids = workoutExercises(program.days).map((ex) => ex.exerciseId);
    expect(ids).not.toContain('bench_press');
    expect(ids).not.toContain('barbell_squat');
  });

  it('keeps bodyweight-only exercises even with an empty equipment list', () => {
    const program = generateProgram({ ...gymBase, availableEquipment: [] });
    const exercises = workoutExercises(program.days);

    // We expect at least some bodyweight movements to remain reachable.
    const ids = exercises.map((ex) => ex.exerciseId);
    expect(ids.length).toBeGreaterThan(0);
    exercises.forEach((ex) => {
      const required = EXERCISES[ex.exerciseId].equipment;
      expect(required).toContain('bodyweight');
    });
  });

  it('still produces 7 days, with workout days non-empty when reasonable equipment is available', () => {
    const program = generateProgram({
      ...gymBase,
      availableEquipment: ['dumbbell', 'pull_up_bar'],
    });
    expect(program.days).toHaveLength(7);
    const trainingDays = program.days.filter((d) => !d.isRestDay);
    trainingDays.forEach((d) => expect(d.exercises.length).toBeGreaterThan(0));
  });
});
