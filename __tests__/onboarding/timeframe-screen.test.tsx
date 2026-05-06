import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import '../../src/lib/i18n';
import { OnboardingContext, OnboardingProvider } from '../../src/features/onboarding/onboarding-context';
import TimeframeScreen from '../../app/(onboarding)/timeframe';
import type { OnboardingProfile } from '../../src/types/profile.types';

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

function renderWithProfile(profile: Partial<OnboardingProfile>) {
  const updateProfile = jest.fn();
  const resetProfile = jest.fn();
  return render(
    <OnboardingContext.Provider value={{ profile, updateProfile, resetProfile }}>
      <TimeframeScreen />
    </OnboardingContext.Provider>
  );
}

describe('TimeframeScreen', () => {
  it('renders without crashing', () => {
    renderTimeframeScreen();
  });

  it('shows step 8 of 10 indicator', () => {
    renderTimeframeScreen();
    expect(screen.getByText(/Step 8 of 10/i)).toBeTruthy();
  });

  it('shows title', () => {
    renderTimeframeScreen();
    expect(screen.getByText("When's your target?")).toBeTruthy();
  });

  it('shows subtitle', () => {
    renderTimeframeScreen();
    expect(screen.getByText("We'll adapt your plan to your timeframe.")).toBeTruthy();
  });

  it('renders the week slider', () => {
    renderTimeframeScreen();
    expect(screen.getByTestId('timeframe-week-slider')).toBeTruthy();
  });

  it('renders the +/- stepper buttons', () => {
    renderTimeframeScreen();
    expect(screen.getByTestId('week-slider-decrement')).toBeTruthy();
    expect(screen.getByTestId('week-slider-increment')).toBeTruthy();
  });

  it('renders the recommended hint card', () => {
    renderTimeframeScreen();
    expect(screen.getByTestId('timeframe-recommended-hint')).toBeTruthy();
  });

  it('shows all event label options', () => {
    renderTimeframeScreen();
    expect(screen.getByTestId('event-wedding')).toBeTruthy();
    expect(screen.getByTestId('event-vacation')).toBeTruthy();
    expect(screen.getByTestId('event-competition')).toBeTruthy();
    expect(screen.getByTestId('event-other')).toBeTruthy();
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

  it('shows back button', () => {
    renderTimeframeScreen();
    expect(screen.getByText(/Back/i)).toBeTruthy();
  });
});

describe('TimeframeScreen — recommendation', () => {
  it('defaults the slider to the recommended timeframe for a weight-loss goal', () => {
    // 70 kg → 65 kg : recommended = ceil(5 / min(1, 0.7)) = 8 weeks
    renderWithProfile({
      goal: 'lose_weight',
      weightKg: 70,
      targetWeightKg: 65,
      age: 28,
      gender: 'female',
      heightCm: 168,
      trainingDaysPerWeek: 3,
    });
    expect(screen.getByText('8')).toBeTruthy();
  });

  it('shows the safer/ambitious hint when the user picks a too-short timeframe', () => {
    renderWithProfile({
      goal: 'lose_weight',
      weightKg: 70,
      targetWeightKg: 60,
      age: 28,
      gender: 'female',
      heightCm: 168,
      trainingDaysPerWeek: 3,
      targetTimeframe: { durationWeeks: 4 },
    });
    // Recommendation is around 15 weeks; with 4 weeks we expect a non-empty hint card.
    expect(screen.getByTestId('timeframe-recommended-hint')).toBeTruthy();
  });

  it('renders the recommended marker on the slider track', () => {
    renderWithProfile({
      goal: 'lose_weight',
      weightKg: 70,
      targetWeightKg: 65,
      age: 28,
      gender: 'female',
      heightCm: 168,
      trainingDaysPerWeek: 3,
    });
    expect(screen.getByTestId('week-slider-recommended-marker')).toBeTruthy();
  });
});
