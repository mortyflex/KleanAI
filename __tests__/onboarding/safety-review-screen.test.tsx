import React from 'react';
import { render, screen } from '@testing-library/react-native';
import '../../src/lib/i18n';
import { OnboardingContext } from '../../src/features/onboarding/onboarding-context';
import SafetyReviewScreen from '../../app/(onboarding)/safety-review';
import type { OnboardingProfile } from '../../src/types/profile.types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

function renderWithProfile(profile: Partial<OnboardingProfile>) {
  const updateProfile = jest.fn();
  const resetProfile = jest.fn();
  return render(
    <OnboardingContext.Provider value={{ profile, updateProfile, resetProfile }}>
      <SafetyReviewScreen />
    </OnboardingContext.Provider>
  );
}

const safeProfile: Partial<OnboardingProfile> = {
  age: 28,
  gender: 'female',
  weightKg: 70,
  heightCm: 168,
  targetWeightKg: 65,
  trainingDaysPerWeek: 3,
  goal: 'lose_weight',
};

describe('SafetyReviewScreen', () => {
  it('renders without crashing', () => {
    renderWithProfile(safeProfile);
  });

  it('shows step 9 of 10 indicator', () => {
    renderWithProfile(safeProfile);
    expect(screen.getByText(/Step 9 of 10/i)).toBeTruthy();
  });

  it('shows valid kind for a calm goal', () => {
    renderWithProfile(safeProfile);
    expect(screen.getByTestId('safety-all-good')).toBeTruthy();
    expect(screen.getByTestId('safety-cta-primary')).toBeTruthy();
  });

  it('shows the calorie preview card', () => {
    renderWithProfile(safeProfile);
    expect(screen.getByTestId('calorie-preview')).toBeTruthy();
    expect(screen.getByTestId('estimated-calories')).toBeTruthy();
  });

  it('shows AGE_TOO_YOUNG flag for user under 18', () => {
    renderWithProfile({ ...safeProfile, age: 16 });
    expect(screen.getByTestId('safety-flag-AGE_TOO_YOUNG')).toBeTruthy();
  });

  it('shows WEIGHT_LOSS_TOO_FAST flag for an aggressive 4-week target', () => {
    renderWithProfile({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 60,
      targetTimeframe: { durationWeeks: 4 },
    });
    expect(screen.getByTestId('safety-flag-WEIGHT_LOSS_TOO_FAST')).toBeTruthy();
  });

  it('shows ambitious-but-allowed CTAs when goal is ambitious', () => {
    // 70 → 62 in 12 weeks = 0.667 kg/week → ambitious
    renderWithProfile({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 62,
      targetTimeframe: { durationWeeks: 12 },
    });
    expect(screen.getByTestId('safety-cta-follow-klean')).toBeTruthy();
    expect(screen.getByTestId('safety-cta-continue-mine')).toBeTruthy();
  });

  it('shows unsafe CTAs (follow safer + edit) when goal is unsafe', () => {
    renderWithProfile({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 60,
      targetTimeframe: { durationWeeks: 4 },
    });
    expect(screen.getByTestId('safety-cta-follow-klean')).toBeTruthy();
    expect(screen.getByTestId('safety-cta-edit-goal')).toBeTruthy();
    expect(screen.queryByTestId('safety-cta-continue-mine')).toBeNull();
  });

  it('shows inconsistent CTA when target weight contradicts goal', () => {
    renderWithProfile({
      ...safeProfile,
      goal: 'lose_weight',
      weightKg: 70,
      targetWeightKg: 80,
    });
    expect(screen.getByTestId('safety-cta-fix-goal')).toBeTruthy();
    expect(screen.queryByTestId('safety-cta-continue-mine')).toBeNull();
    expect(screen.queryByTestId('safety-cta-follow-klean')).toBeNull();
  });

  it('shows the GOAL_INCONSISTENT_GAIN flag when gain target is below current', () => {
    renderWithProfile({
      ...safeProfile,
      goal: 'gain_muscle',
      weightKg: 70,
      targetWeightKg: 65,
    });
    expect(screen.getByTestId('safety-flag-GOAL_INCONSISTENT_GAIN')).toBeTruthy();
  });

  it('does not classify 60→80 kg in 12 weeks as valid', () => {
    renderWithProfile({
      goal: 'gain_muscle',
      age: 28,
      gender: 'male',
      weightKg: 60,
      heightCm: 175,
      targetWeightKg: 80,
      trainingDaysPerWeek: 4,
      targetTimeframe: { durationWeeks: 12 },
    });
    expect(screen.queryByTestId('safety-all-good')).toBeNull();
    expect(screen.getByTestId('safety-flag-WEIGHT_GAIN_TOO_FAST')).toBeTruthy();
  });

  it('shows alternative suggestion when weight loss is unsafe', () => {
    renderWithProfile({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 60,
      targetTimeframe: { durationWeeks: 4 },
    });
    expect(screen.getByTestId('safety-alternative')).toBeTruthy();
  });

  it('does not show alternative for age-blocked profiles', () => {
    renderWithProfile({ ...safeProfile, age: 15 });
    expect(screen.queryByTestId('safety-alternative')).toBeNull();
  });

  it('does not show alternative for valid profiles', () => {
    renderWithProfile(safeProfile);
    expect(screen.queryByTestId('safety-alternative')).toBeNull();
  });

  it('shows valid kind with 12-week default when no timeframe is set', () => {
    renderWithProfile({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 65,
    });
    expect(screen.getByTestId('safety-all-good')).toBeTruthy();
  });

  it('blocks calories below floor — extreme short-term target is flagged unsafe', () => {
    renderWithProfile({
      age: 28,
      gender: 'female',
      weightKg: 70,
      heightCm: 168,
      targetWeightKg: 50,
      trainingDaysPerWeek: 3,
      goal: 'lose_weight',
      targetTimeframe: { durationWeeks: 4 },
    });
    const flag =
      screen.queryByTestId('safety-flag-WEIGHT_LOSS_TOO_FAST') ||
      screen.queryByTestId('safety-flag-CALORIES_TOO_LOW') ||
      screen.queryByTestId('safety-flag-DEFICIT_TOO_HIGH');
    expect(flag).toBeTruthy();
  });
});
