import type { MuscleGroup, ProgramSplit, WorkoutIntensity } from '../../../types/workout.types';

export interface DayTemplate {
  nameKey: string;
  focus: MuscleGroup[];
  exerciseIds: string[];
  intensity: WorkoutIntensity;
}

export interface ProgramTemplate {
  split: ProgramSplit;
  nameKey: string;
  // 7 entries (0=Mon … 6=Sun); null = rest day
  weekSchedule: (DayTemplate | null)[];
}

export const PROGRAM_TEMPLATES: Record<ProgramSplit, ProgramTemplate> = {
  full_body_2: {
    split: 'full_body_2',
    nameKey: 'workout.program.splits.full_body_2',
    weekSchedule: [
      {
        nameKey: 'workout.program.days.fullBodyA',
        focus: ['chest', 'back', 'quadriceps', 'core'],
        exerciseIds: ['bench_press', 'barbell_row', 'barbell_squat', 'overhead_press', 'plank', 'calf_raise'],
        intensity: 'medium',
      },
      null,
      null,
      {
        nameKey: 'workout.program.days.fullBodyB',
        focus: ['hamstrings', 'back', 'shoulders', 'core'],
        exerciseIds: ['deadlift', 'lat_pulldown', 'dumbbell_shoulder_press', 'lunges', 'leg_raises', 'bicep_curl'],
        intensity: 'medium',
      },
      null,
      null,
      null,
    ],
  },
  full_body_3: {
    split: 'full_body_3',
    nameKey: 'workout.program.splits.full_body_3',
    weekSchedule: [
      {
        nameKey: 'workout.program.days.fullBodyA',
        focus: ['chest', 'back', 'quadriceps'],
        exerciseIds: ['bench_press', 'barbell_row', 'barbell_squat', 'plank', 'calf_raise'],
        intensity: 'medium',
      },
      null,
      {
        nameKey: 'workout.program.days.fullBodyB',
        focus: ['shoulders', 'hamstrings', 'biceps'],
        exerciseIds: ['overhead_press', 'romanian_deadlift', 'lat_pulldown', 'bicep_curl', 'leg_raises'],
        intensity: 'medium',
      },
      null,
      {
        nameKey: 'workout.program.days.fullBodyC',
        focus: ['chest', 'back', 'glutes', 'core'],
        exerciseIds: ['incline_dumbbell_press', 'barbell_row', 'hip_thrust', 'tricep_dips', 'russian_twist'],
        intensity: 'high',
      },
      null,
      null,
    ],
  },
  upper_lower_4: {
    split: 'upper_lower_4',
    nameKey: 'workout.program.splits.upper_lower_4',
    weekSchedule: [
      {
        nameKey: 'workout.program.days.upperA',
        focus: ['chest', 'shoulders', 'triceps'],
        exerciseIds: ['bench_press', 'overhead_press', 'incline_dumbbell_press', 'lateral_raise', 'tricep_pushdown'],
        intensity: 'medium',
      },
      {
        nameKey: 'workout.program.days.lowerA',
        focus: ['quadriceps', 'glutes', 'calves'],
        exerciseIds: ['barbell_squat', 'leg_press', 'lunges', 'calf_raise', 'plank'],
        intensity: 'medium',
      },
      null,
      {
        nameKey: 'workout.program.days.upperB',
        focus: ['back', 'biceps'],
        exerciseIds: ['barbell_row', 'lat_pulldown', 'face_pull', 'bicep_curl', 'hammer_curl'],
        intensity: 'medium',
      },
      {
        nameKey: 'workout.program.days.lowerB',
        focus: ['hamstrings', 'glutes', 'core'],
        exerciseIds: ['deadlift', 'romanian_deadlift', 'leg_curl', 'hip_thrust', 'leg_raises'],
        intensity: 'high',
      },
      null,
      null,
    ],
  },
  push_pull_legs: {
    split: 'push_pull_legs',
    nameKey: 'workout.program.splits.push_pull_legs',
    weekSchedule: [
      {
        nameKey: 'workout.program.days.push',
        focus: ['chest', 'shoulders', 'triceps'],
        exerciseIds: ['bench_press', 'overhead_press', 'incline_dumbbell_press', 'lateral_raise', 'tricep_pushdown', 'tricep_dips'],
        intensity: 'medium',
      },
      {
        nameKey: 'workout.program.days.pullDay',
        focus: ['back', 'biceps'],
        exerciseIds: ['barbell_row', 'lat_pulldown', 'face_pull', 'bicep_curl', 'hammer_curl', 'dead_bug'],
        intensity: 'medium',
      },
      {
        nameKey: 'workout.program.days.legs',
        focus: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
        exerciseIds: ['barbell_squat', 'romanian_deadlift', 'leg_press', 'leg_curl', 'calf_raise', 'plank'],
        intensity: 'high',
      },
      null,
      {
        nameKey: 'workout.program.days.push',
        focus: ['chest', 'shoulders', 'triceps'],
        exerciseIds: ['incline_dumbbell_press', 'dumbbell_shoulder_press', 'push_ups', 'lateral_raise', 'tricep_dips'],
        intensity: 'medium',
      },
      {
        nameKey: 'workout.program.days.pullDay',
        focus: ['back', 'biceps'],
        exerciseIds: ['deadlift', 'barbell_row', 'lat_pulldown', 'bicep_curl', 'face_pull', 'leg_raises'],
        intensity: 'high',
      },
      null,
    ],
  },
  home: {
    split: 'home',
    nameKey: 'workout.program.splits.home',
    weekSchedule: [
      {
        nameKey: 'workout.program.days.homeA',
        focus: ['chest', 'shoulders', 'triceps'],
        exerciseIds: ['push_ups', 'pike_push_ups', 'diamond_push_ups', 'tricep_dips', 'plank'],
        intensity: 'medium',
      },
      null,
      {
        nameKey: 'workout.program.days.homeB',
        focus: ['back', 'biceps', 'quadriceps', 'glutes'],
        exerciseIds: ['pull_ups', 'inverted_row', 'bodyweight_squat', 'lunges', 'glute_bridge'],
        intensity: 'medium',
      },
      null,
      {
        nameKey: 'workout.program.days.homeC',
        focus: ['full_body', 'core'],
        exerciseIds: ['burpees', 'bulgarian_split_squat', 'push_ups', 'mountain_climbers', 'russian_twist', 'jumping_jacks'],
        intensity: 'high',
      },
      null,
      null,
    ],
  },
};
