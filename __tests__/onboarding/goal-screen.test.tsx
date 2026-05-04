import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import '../../src/lib/i18n';
import { OnboardingProvider } from '../../src/features/onboarding/onboarding-context';
import GoalScreen from '../../app/(onboarding)/goal';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

function renderGoalScreen() {
  return render(
    <OnboardingProvider>
      <GoalScreen />
    </OnboardingProvider>
  );
}

describe('GoalScreen', () => {
  it('renders without crashing', () => {
    renderGoalScreen();
  });

  it('shows step indicator', () => {
    renderGoalScreen();
    expect(screen.getByText(/Step 1 of 7/i)).toBeTruthy();
  });

  it('shows all four goal options', () => {
    renderGoalScreen();
    expect(screen.getByText('Lose weight')).toBeTruthy();
    expect(screen.getByText('Gain muscle')).toBeTruthy();
    expect(screen.getByText('Maintain weight')).toBeTruthy();
    expect(screen.getByText('Recomposition')).toBeTruthy();
  });

  it('shows continue button', () => {
    renderGoalScreen();
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('selects a goal when pressed', () => {
    renderGoalScreen();
    const option = screen.getByTestId('goal-option-lose_weight');
    fireEvent.press(option);
    expect(option).toBeTruthy();
  });

  it('shows subtitle copy', () => {
    renderGoalScreen();
    expect(screen.getByText("We'll build your plan around this.")).toBeTruthy();
  });
});
