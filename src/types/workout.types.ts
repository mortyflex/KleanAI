export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'core'
  | 'calves'
  | 'full_body';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'resistance_band'
  | 'pull_up_bar';

export type ExerciseCategory = 'strength' | 'cardio' | 'mobility';

export type ProgramSplit =
  | 'full_body_2'
  | 'full_body_3'
  | 'upper_lower_4'
  | 'push_pull_legs'
  | 'home';

export type WorkoutIntensity = 'light' | 'medium' | 'high';

export interface Exercise {
  id: string;
  nameKey: string;
  muscleGroups: MuscleGroup[];
  category: ExerciseCategory;
  equipment: Equipment[];
  requiresGym: boolean;
  defaultSets: number;
  defaultReps: number;
  restSec: number;
}

export interface WorkoutExercise {
  exerciseId: string;
  nameKey: string;
  muscleGroups: MuscleGroup[];
  category: ExerciseCategory;
  sets: number;
  reps: number;
  restSec: number;
  done: boolean;
}

export interface WorkoutDay {
  id: string;
  weekDayIndex: number; // 0 = Monday … 6 = Sunday
  nameKey: string;
  focus: MuscleGroup[];
  exercises: WorkoutExercise[];
  durationMin: number;
  intensity: WorkoutIntensity;
  isRestDay: boolean;
}

export interface WorkoutProgram {
  id: string;
  split: ProgramSplit;
  nameKey: string;
  durationWeeks: number;
  currentWeek: number;
  days: WorkoutDay[]; // always 7 entries, rest days included
  generatedAt: string;
}

export interface GenerateProgramParams {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  trainingDaysPerWeek: number;
  sessionDurationMin: number;
  trainingLocation: 'gym' | 'home' | 'both';
  durationWeeks?: number;
}
