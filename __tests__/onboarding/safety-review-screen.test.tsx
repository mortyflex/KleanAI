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

  it('shows step 7 of 8 indicator', () => {
    renderWithProfile(safeProfile);
    expect(screen.getByText(/Step 7 of 8/i)).toBeTruthy();
  });

  it('shows "Everything looks good!" for a safe profile', () => {
    renderWithProfile(safeProfile);
    expect(screen.getByTestId('safety-all-good')).toBeTruthy();
  });

  it('shows TDEE label', () => {
    renderWithProfile(safeProfile);
    expect(screen.getByText('Your daily burn (TDEE)')).toBeTruthy();
  });

  it('shows estimated calories element', () => {
    renderWithProfile(safeProfile);
    expect(screen.getByTestId('estimated-calories')).toBeTruthy();
  });

  it('shows AGE_TOO_YOUNG flag for user under 18', () => {
    renderWithProfile({ ...safeProfile, age: 16 });
    expect(screen.getByTestId('safety-flag-AGE_TOO_YOUNG')).toBeTruthy();
  });

  it('shows WEIGHT_LOSS_TOO_FAST flag for extreme weight loss target', () => {
    renderWithProfile({
      ...safeProfile,
      weightKg: 100,
      targetWeightKg: 40,
    });
    expect(screen.getByTestId('safety-flag-WEIGHT_LOSS_TOO_FAST')).toBeTruthy();
  });

  it('shows CALORIES_TOO_LOW flag when deficit is extreme', () => {
    renderWithProfile({
      age: 25,
      gender: 'female',
      weightKg: 55,
      heightCm: 158,
      targetWeightKg: 20,
      trainingDaysPerWeek: 1,
      goal: 'lose_weight',
    });
    expect(screen.getByTestId('safety-flag-CALORIES_TOO_LOW')).toBeTruthy();
  });

  it('shows adjust profile button when blocked', () => {
    renderWithProfile({ ...safeProfile, age: 15 });
    expect(screen.getByText('Adjust my profile')).toBeTruthy();
  });

  it('shows "I understand, continue" option when blocked', () => {
    renderWithProfile({ ...safeProfile, age: 15 });
    expect(screen.getByText('I understand, continue')).toBeTruthy();
  });

  it('shows Continue (not adjust) for safe profile', () => {
    renderWithProfile(safeProfile);
    expect(screen.getByText('Continue')).toBeTruthy();
    expect(screen.queryByText('Adjust my profile')).toBeNull();
  });
});

describe('SafetyReviewScreen — timeframe integration', () => {
  it('shows safe status when 4-week timeframe is realistic', () => {
    // 70 → 69 in 4 weeks = 0.25 kg/week < 0.70 → safe
    renderWithProfile({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 69,
      targetTimeframe: { durationWeeks: 4 },
    });
    expect(screen.getByTestId('safety-all-good')).toBeTruthy();
  });

  it('shows WEIGHT_LOSS_TOO_FAST for an aggressive 4-week target', () => {
    // 70 → 60 in 4 weeks = 2.5 kg/week > 0.70 → flagged
    renderWithProfile({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 60,
      targetTimeframe: { durationWeeks: 4 },
    });
    expect(screen.getByTestId('safety-flag-WEIGHT_LOSS_TOO_FAST')).toBeTruthy();
  });

  it('shows alternative suggestion when weight loss flags are blocking', () => {
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

  it('does not show alternative for safe profiles', () => {
    renderWithProfile(safeProfile);
    expect(screen.queryByTestId('safety-alternative')).toBeNull();
  });

  it('shows safe status with 12-week default when no timeframe is set', () => {
    // No targetTimeframe → defaults to 12 weeks. 5 kg / 12 = 0.42 → safe
    renderWithProfile({
      ...safeProfile,
      weightKg: 70,
      targetWeightKg: 65,
    });
    expect(screen.getByTestId('safety-all-good')).toBeTruthy();
  });

  it('calories are never silently below floor — extreme short-term target is blocked', () => {
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
    // Should show at least one blocking flag
    const flag =
      screen.queryByTestId('safety-flag-WEIGHT_LOSS_TOO_FAST') ||
      screen.queryByTestId('safety-flag-CALORIES_TOO_LOW') ||
      screen.queryByTestId('safety-flag-DEFICIT_TOO_HIGH');
    expect(flag).toBeTruthy();
  });
});
