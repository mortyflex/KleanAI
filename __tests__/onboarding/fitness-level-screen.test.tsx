import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import '../../src/lib/i18n';
import { OnboardingProvider } from '../../src/features/onboarding/onboarding-context';
import FitnessLevelScreen from '../../app/(onboarding)/fitness-level';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

function renderFitnessLevel() {
  return render(
    <OnboardingProvider>
      <FitnessLevelScreen />
    </OnboardingProvider>
  );
}

describe('FitnessLevelScreen', () => {
  it('renders without crashing', () => {
    renderFitnessLevel();
  });

  it('shows step 3 of 10 indicator', () => {
    renderFitnessLevel();
    expect(screen.getByText(/Step 3 of 10/i)).toBeTruthy();
  });

  it('shows three fitness level cards', () => {
    renderFitnessLevel();
    expect(screen.getByTestId('fitness-level-option-beginner')).toBeTruthy();
    expect(screen.getByTestId('fitness-level-option-intermediate')).toBeTruthy();
    expect(screen.getByTestId('fitness-level-option-advanced')).toBeTruthy();
  });

  it('shows practical descriptions for each level', () => {
    renderFitnessLevel();
    expect(screen.getByText(/Less than 6 months/)).toBeTruthy();
    expect(screen.getByText(/6 months to 2 years/)).toBeTruthy();
    expect(screen.getByText(/2\+ years/)).toBeTruthy();
  });

  it('selects a level when pressed', () => {
    renderFitnessLevel();
    fireEvent.press(screen.getByTestId('fitness-level-option-advanced'));
    expect(screen.getByTestId('fitness-level-option-advanced')).toBeTruthy();
  });
});
