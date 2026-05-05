import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import '../../src/lib/i18n';
import { OnboardingProvider } from '../../src/features/onboarding/onboarding-context';
import TimeframeScreen from '../../app/(onboarding)/timeframe';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

function renderTimeframeScreen() {
  return render(
    <OnboardingProvider>
      <TimeframeScreen />
    </OnboardingProvider>
  );
}

describe('TimeframeScreen', () => {
  it('renders without crashing', () => {
    renderTimeframeScreen();
  });

  it('shows step 6 of 8 indicator', () => {
    renderTimeframeScreen();
    expect(screen.getByText(/Step 6 of 8/i)).toBeTruthy();
  });

  it('shows title', () => {
    renderTimeframeScreen();
    expect(screen.getByText("When's your target?")).toBeTruthy();
  });

  it('shows subtitle', () => {
    renderTimeframeScreen();
    expect(screen.getByText("We'll adapt your plan to your timeframe.")).toBeTruthy();
  });

  it('shows all three preset duration buttons', () => {
    renderTimeframeScreen();
    expect(screen.getByTestId('preset-4')).toBeTruthy();
    expect(screen.getByTestId('preset-8')).toBeTruthy();
    expect(screen.getByTestId('preset-12')).toBeTruthy();
  });

  it('shows custom duration button', () => {
    renderTimeframeScreen();
    expect(screen.getByTestId('preset-custom')).toBeTruthy();
  });

  it('shows all event label options', () => {
    renderTimeframeScreen();
    expect(screen.getByTestId('event-wedding')).toBeTruthy();
    expect(screen.getByTestId('event-vacation')).toBeTruthy();
    expect(screen.getByTestId('event-competition')).toBeTruthy();
    expect(screen.getByTestId('event-other')).toBeTruthy();
  });

  it('shows custom weeks input when Custom is pressed', () => {
    renderTimeframeScreen();
    fireEvent.press(screen.getByTestId('preset-custom'));
    expect(screen.getByTestId('input-custom-weeks')).toBeTruthy();
  });

  it('hides custom input when a preset is selected after Custom', () => {
    renderTimeframeScreen();
    fireEvent.press(screen.getByTestId('preset-custom'));
    fireEvent.press(screen.getByTestId('preset-8'));
    expect(screen.queryByTestId('input-custom-weeks')).toBeNull();
  });

  it('shows Continue button', () => {
    renderTimeframeScreen();
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('can select an event label without crashing', () => {
    renderTimeframeScreen();
    fireEvent.press(screen.getByTestId('event-wedding'));
    expect(screen.getByTestId('event-wedding')).toBeTruthy();
  });

  it('can deselect an event label by pressing it again', () => {
    renderTimeframeScreen();
    fireEvent.press(screen.getByTestId('event-vacation'));
    fireEvent.press(screen.getByTestId('event-vacation'));
    expect(screen.getByTestId('event-vacation')).toBeTruthy();
  });

  it('can select a preset duration', () => {
    renderTimeframeScreen();
    fireEvent.press(screen.getByTestId('preset-4'));
    expect(screen.getByTestId('preset-4')).toBeTruthy();
  });

  it('shows back button', () => {
    renderTimeframeScreen();
    expect(screen.getByText(/Back/i)).toBeTruthy();
  });
});
