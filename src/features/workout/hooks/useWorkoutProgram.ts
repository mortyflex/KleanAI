import { useMemo } from 'react';
import { useOnboarding } from '../../onboarding/onboarding-context';
import { useConfirmedEquipment } from '../../vision/hooks/useConfirmedEquipment';
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
  const { equipmentIds } = useConfirmedEquipment();

  return useMemo(() => {
    const params: GenerateProgramParams = {
      fitnessLevel: profile.fitnessLevel ?? DEFAULT_PARAMS.fitnessLevel,
      trainingDaysPerWeek: profile.trainingDaysPerWeek ?? DEFAULT_PARAMS.trainingDaysPerWeek,
      sessionDurationMin: profile.sessionDurationMin ?? DEFAULT_PARAMS.sessionDurationMin,
      trainingLocation: profile.trainingLocation ?? DEFAULT_PARAMS.trainingLocation,
      durationWeeks:
        profile.targetTimeframe?.durationWeeks ?? DEFAULT_PARAMS.durationWeeks,
      // Only filter once the user has explicitly confirmed equipment via Gym Vision.
      // Until then equipmentIds is null and the program stays unfiltered.
      ...(equipmentIds ? { availableEquipment: equipmentIds } : {}),
    };
    return generateProgram(params);
  }, [
    profile.fitnessLevel,
    profile.trainingDaysPerWeek,
    profile.sessionDurationMin,
    profile.trainingLocation,
    profile.targetTimeframe,
    equipmentIds,
  ]);
}
