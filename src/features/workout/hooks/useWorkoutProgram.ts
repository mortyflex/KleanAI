import { useMemo } from 'react';
import { useOnboarding } from '../../onboarding/onboarding-context';
import { generateProgram } from '../utils/generate-program';
import type { WorkoutProgram, GenerateProgramParams } from '../../../types/workout.types';

const DEFAULT_PARAMS: GenerateProgramParams = {
  fitnessLevel: 'intermediate',
  trainingDaysPerWeek: 3,
  sessionDurationMin: 45,
  trainingLocation: 'gym',
  durationWeeks: 12,
};

export function useWorkoutProgram(): WorkoutProgram {
  const { profile } = useOnboarding();

  return useMemo(() => {
    const params: GenerateProgramParams = {
      fitnessLevel: profile.fitnessLevel ?? DEFAULT_PARAMS.fitnessLevel,
      trainingDaysPerWeek: profile.trainingDaysPerWeek ?? DEFAULT_PARAMS.trainingDaysPerWeek,
      sessionDurationMin: profile.sessionDurationMin ?? DEFAULT_PARAMS.sessionDurationMin,
      trainingLocation: profile.trainingLocation ?? DEFAULT_PARAMS.trainingLocation,
      durationWeeks:
        profile.targetTimeframe?.durationWeeks ?? DEFAULT_PARAMS.durationWeeks,
    };
    return generateProgram(params);
  }, [
    profile.fitnessLevel,
    profile.trainingDaysPerWeek,
    profile.sessionDurationMin,
    profile.trainingLocation,
    profile.targetTimeframe,
  ]);
}
