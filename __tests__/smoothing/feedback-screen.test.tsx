import React from 'react';
import { render, screen } from '@testing-library/react-native';
import '../../src/lib/i18n';
import { OnboardingProvider } from '../../src/features/onboarding/onboarding-context';
import SmoothingFeedbackScreen from '../../app/smoothing/feedback';

let mockParams: Record<string, string | undefined> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

function renderScreen() {
  return render(
    <OnboardingProvider>
      <SmoothingFeedbackScreen />
    </OnboardingProvider>,
  );
}

describe('SmoothingFeedbackScreen', () => {
  beforeEach(() => {
    mockParams = {};
  });

  it('renders the zero-guilt banner', () => {
    mockParams = { type: 'missed_workout' };
    renderScreen();
    expect(screen.getByTestId('smoothing-zero-guilt-banner')).toBeTruthy();
    expect(screen.getByText("Zero guilt. We've got you.")).toBeTruthy();
  });

  it('renders the title and subtitle', () => {
    mockParams = { type: 'missed_workout' };
    renderScreen();
    expect(screen.getByText("Let's smooth this out")).toBeTruthy();
    expect(
      screen.getByText(/Real life happens\. We'll adjust your plan/),
    ).toBeTruthy();
  });

  it('shows the missed workout copy and three actions for a missed workout', () => {
    mockParams = { type: 'missed_workout', weekDayIndex: '2' };
    renderScreen();
    expect(screen.getByText('Missed workout')).toBeTruthy();
    expect(screen.getByTestId('smoothing-action-express_workout')).toBeTruthy();
    expect(screen.getByTestId('smoothing-action-reschedule')).toBeTruthy();
    expect(screen.getByTestId('smoothing-action-integrate_key_exercises')).toBeTruthy();
  });

  it('shows nutrition smoothing details for an excess_food event', () => {
    mockParams = { type: 'excess_food', excessKcal: '600' };
    renderScreen();
    expect(screen.getByText('A bit extra today')).toBeTruthy();
    expect(screen.getByText(/Spread gently over the next 3 days/)).toBeTruthy();
  });

  it('shows the unknown-event card for an unrecognised type', () => {
    mockParams = { type: 'mystery_meat' };
    renderScreen();
    expect(screen.getByText("We couldn't read that signal")).toBeTruthy();
  });

  it('renders without a type param (falls back to unknown event)', () => {
    mockParams = {};
    renderScreen();
    expect(screen.getByText("We couldn't read that signal")).toBeTruthy();
  });
});
