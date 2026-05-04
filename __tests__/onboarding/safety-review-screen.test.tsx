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

  it('shows step 6 of 7 indicator', () => {
    renderWithProfile(safeProfile);
    expect(screen.getByText(/Step 6 of 7/i)).toBeTruthy();
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
