import { useMemo } from 'react';
import type { Gender } from '../../../types/profile.types';
import type { SmoothingContext } from '../../../types/smoothing.types';
import { bmrMifflinStJeor, tdeeFromBMR } from '../../../utils/calories';
import { calorieFloor, KCAL_PER_KG, PROGRAM_WEEKS } from '../../../utils/safety';
import { useOnboarding } from '../../onboarding/onboarding-context';

const DEFAULT_CONTEXT: SmoothingContext = {
  gender: 'female',
  dailyKcalTarget: 2000,
};

/**
 * Resolve the user's current daily kcal target from the onboarding profile.
 * Falls back to a safe default when the profile is incomplete (Phase 5 is
 * still local/mocked — Supabase will replace this later).
 *
 * Always clamps the target at the safety floor for the user's gender.
 */
export function useSmoothingContext(): SmoothingContext {
  const { profile } = useOnboarding();

  return useMemo(() => {
    const gender: Gender = profile.gender ?? DEFAULT_CONTEXT.gender;

    if (
      profile.weightKg === undefined
      || profile.heightCm === undefined
      || profile.age === undefined
      || profile.trainingDaysPerWeek === undefined
    ) {
      return { gender, dailyKcalTarget: DEFAULT_CONTEXT.dailyKcalTarget };
    }

    const bmr = bmrMifflinStJeor(profile.weightKg, profile.heightCm, profile.age, gender);
    const tdee = tdeeFromBMR(bmr, profile.trainingDaysPerWeek);

    let target = tdee;
    if (profile.goal === 'lose_weight' && profile.targetWeightKg !== undefined) {
      const kgToLose = Math.max(0, profile.weightKg - profile.targetWeightKg);
      const weeks = profile.targetTimeframe?.durationWeeks ?? PROGRAM_WEEKS;
      const dailyDeficit = (kgToLose * KCAL_PER_KG) / weeks / 7;
      target = tdee - dailyDeficit;
    }

    const floor = calorieFloor(gender);
    return { gender, dailyKcalTarget: Math.max(floor, Math.round(target)) };
  }, [profile]);
}
