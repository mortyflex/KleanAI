import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import '../../src/lib/i18n';
import { OnboardingProvider } from '../../src/features/onboarding/onboarding-context';
import SessionDurationScreen from '../../app/(onboarding)/session-duration';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

function renderSessionDuration() {
  return render(
    <OnboardingProvider>
      <SessionDurationScreen />
    </OnboardingProvider>
  );
}

describe('SessionDurationScreen', () => {
  it('renders without crashing', () => {
    renderSessionDuration();
  });

  it('shows step 4 of 10 indicator', () => {
    renderSessionDuration();
    expect(screen.getByText(/Step 4 of 10/i)).toBeTruthy();
  });

  it('shows four duration options with descriptions', () => {
    renderSessionDuration();
    expect(screen.getByTestId('session-duration-option-30')).toBeTruthy();
    expect(screen.getByTestId('session-duration-option-45')).toBeTruthy();
    expect(screen.getByTestId('session-duration-option-60')).toBeTruthy();
    expect(screen.getByTestId('session-duration-option-75')).toBeTruthy();
  });

  it('shows helpful context for each duration', () => {
    renderSessionDuration();
    expect(screen.getByText(/Express format/i)).toBeTruthy();
    expect(screen.getByText(/Balanced and efficient/i)).toBeTruthy();
    expect(screen.getByText(/Complete session/i)).toBeTruthy();
    expect(screen.getByText(/Advanced or high-volume/i)).toBeTruthy();
  });

  it('selects a duration when pressed', () => {
    renderSessionDuration();
    fireEvent.press(screen.getByTestId('session-duration-option-60'));
    expect(screen.getByTestId('session-duration-option-60')).toBeTruthy();
  });
});
