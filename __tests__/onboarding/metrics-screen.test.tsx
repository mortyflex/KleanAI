import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import '../../src/lib/i18n';
import { OnboardingContext } from '../../src/features/onboarding/onboarding-context';
import MetricsScreen from '../../app/(onboarding)/metrics';
import type { OnboardingProfile } from '../../src/types/profile.types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

function renderWithProfile(profile: Partial<OnboardingProfile>) {
  const updateProfile = jest.fn();
  const resetProfile = jest.fn();
  return render(
    <OnboardingContext.Provider value={{ profile, updateProfile, resetProfile }}>
      <MetricsScreen />
    </OnboardingContext.Provider>
  );
}

describe('MetricsScreen — target weight diff', () => {
  it('renders the target weight diff card when target weight is provided', () => {
    renderWithProfile({
      goal: 'lose_weight',
      age: 28,
      gender: 'female',
      heightCm: 168,
      weightKg: 70,
      targetWeightKg: 65,
    });
    expect(screen.getByTestId('target-weight-diff')).toBeTruthy();
    expect(screen.getByTestId('target-weight-delta')).toBeTruthy();
  });

  it('shows the status badge as valid for a calm weight-loss goal', () => {
    renderWithProfile({
      goal: 'lose_weight',
      age: 28,
      gender: 'female',
      heightCm: 168,
      weightKg: 70,
      targetWeightKg: 65,
    });
    expect(screen.getByText(/Looks healthy/i)).toBeTruthy();
  });

  it('shows the status badge as inconsistent for weight loss with target above current', () => {
    renderWithProfile({
      goal: 'lose_weight',
      age: 28,
      gender: 'female',
      heightCm: 168,
      weightKg: 70,
      targetWeightKg: 80,
    });
    expect(screen.getByText(/Doesn't match your goal/i)).toBeTruthy();
  });
});

describe('MetricsScreen — cross-field validation', () => {
  it('blocks progression with a "must be lower" error when loss target is above current', async () => {
    renderWithProfile({ goal: 'lose_weight' });
    fireEvent.changeText(screen.getByTestId('input-age'), '28');
    fireEvent.press(screen.getByTestId('gender-option-female'));
    fireEvent.changeText(screen.getByTestId('input-height'), '168');
    fireEvent.changeText(screen.getByTestId('input-weight'), '70');
    fireEvent.changeText(screen.getByTestId('input-target-weight'), '80');
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => {
      expect(
        screen.getByText(
          /target should be lower than your current weight/i
        )
      ).toBeTruthy();
    });
  });

  it('blocks progression with a "must be higher" error when gain target is below current', async () => {
    renderWithProfile({ goal: 'gain_muscle' });
    fireEvent.changeText(screen.getByTestId('input-age'), '28');
    fireEvent.press(screen.getByTestId('gender-option-male'));
    fireEvent.changeText(screen.getByTestId('input-height'), '180');
    fireEvent.changeText(screen.getByTestId('input-weight'), '75');
    fireEvent.changeText(screen.getByTestId('input-target-weight'), '70');
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => {
      expect(
        screen.getByText(
          /target should be higher than your current weight/i
        )
      ).toBeTruthy();
    });
  });
});
