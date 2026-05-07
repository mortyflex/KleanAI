import type {
  WorkoutProgram,
  WorkoutDay,
  WorkoutExercise,
  GenerateProgramParams,
  ProgramSplit,
  Equipment,
} from '../../../types/workout.types';
import { EXERCISES } from '../data/exercises';
import { PROGRAM_TEMPLATES } from '../data/program-templates';

/**
 * An exercise is "doable" when at least one of its required equipment
 * categories is in the user's available set. Bodyweight is always available
 * even if the user has never confirmed equipment, so home/calisthenics
 * exercises stay reachable.
 */
export function isExerciseAvailable(
  required: Equipment[],
  available: ReadonlySet<Equipment>,
): boolean {
  return required.some((eq) => eq === 'bodyweight' || available.has(eq));
}

const EXTRA_SETS_BY_LEVEL: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

export function maxExercisesFromDuration(durationMin: number): number {
  if (durationMin < 30) return 3;
  if (durationMin < 45) return 4;
  if (durationMin < 60) return 6;
  return 8;
}

function estimateDurationMin(exercises: WorkoutExercise[]): number {
  const setTimeMin = exercises.reduce((total, ex) => {
    const secPerSet = ex.reps * 2 + ex.restSec;
    return total + (ex.sets * secPerSet) / 60;
  }, 0);
  return Math.round(setTimeMin + 5); // +5 min warm-up/cool-down
}

export function selectSplit(params: GenerateProgramParams): ProgramSplit {
  if (params.trainingLocation === 'home') return 'home';
  const days = params.trainingDaysPerWeek;
  if (days <= 2) return 'full_body_2';
  if (days <= 3) return 'full_body_3';
  if (days <= 4) return 'upper_lower_4';
  return 'push_pull_legs';
}

function buildWorkoutExercise(
  exerciseId: string,
  fitnessLevel: GenerateProgramParams['fitnessLevel'],
): WorkoutExercise | null {
  const ex = EXERCISES[exerciseId];
  if (!ex) return null;
  return {
    exerciseId: ex.id,
    nameKey: ex.nameKey,
    muscleGroups: ex.muscleGroups,
    category: ex.category,
    sets: ex.defaultSets + (EXTRA_SETS_BY_LEVEL[fitnessLevel] ?? 0),
    reps: ex.defaultReps,
    restSec: ex.restSec,
    done: false,
  };
}

export function generateProgram(params: GenerateProgramParams): WorkoutProgram {
  const split = selectSplit(params);
  const template = PROGRAM_TEMPLATES[split];
  const maxEx = maxExercisesFromDuration(params.sessionDurationMin);
  const durationWeeks = params.durationWeeks ?? 12;
  const availableSet = params.availableEquipment
    ? new Set<Equipment>([...params.availableEquipment, 'bodyweight'])
    : null;

  const days: WorkoutDay[] = template.weekSchedule.map((dayTemplate, weekDayIndex) => {
    if (!dayTemplate) {
      return {
        id: `rest-${weekDayIndex}`,
        weekDayIndex,
        nameKey: 'workout.program.days.rest',
        focus: [],
        exercises: [],
        durationMin: 0,
        intensity: 'light',
        isRestDay: true,
      };
    }

    const eligibleIds = availableSet
      ? dayTemplate.exerciseIds.filter((id) => {
          const ex = EXERCISES[id];
          return ex ? isExerciseAvailable(ex.equipment, availableSet) : false;
        })
      : dayTemplate.exerciseIds;

    const exercises = eligibleIds
      .slice(0, maxEx)
      .map((id) => buildWorkoutExercise(id, params.fitnessLevel))
      .filter((ex): ex is WorkoutExercise => ex !== null);

    return {
      id: `day-${weekDayIndex}`,
      weekDayIndex,
      nameKey: dayTemplate.nameKey,
      focus: dayTemplate.focus,
      exercises,
      durationMin: estimateDurationMin(exercises),
      intensity: dayTemplate.intensity,
      isRestDay: false,
    };
  });

  return {
    id: `program-${split}`,
    split,
    nameKey: template.nameKey,
    durationWeeks,
    currentWeek: 1,
    days,
    generatedAt: new Date().toISOString(),
  };
}
