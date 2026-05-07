import React from 'react';
import { render, screen } from '@testing-library/react-native';

import '../../src/lib/i18n';
import NutritionScreen from '../../app/(tabs)/nutrition';
import {
  AuthContext,
  type AuthContextValue,
} from '../../src/features/auth';
import { OnboardingContext } from '../../src/features/onboarding/onboarding-context';

jest.mock('../../src/features/nutrition/services/nutrition-sync', () => ({
  queueNutritionSync: jest.fn(() => new Promise(() => {})),
}));
jest.mock('../../src/features/smoothing/services/smoothing-sync', () => ({
  queueSmoothingSync: jest.fn(() => new Promise(() => {})),
}));

const noopAuth: AuthContextValue = {
  status: 'unauthenticated',
  session: null,
  user: null,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(async () => undefined),
  refresh: jest.fn(async () => undefined),
};

function renderScreen(profile: Record<string, unknown> = {}) {
  return render(
    <AuthContext.Provider value={noopAuth}>
      <OnboardingContext.Provider
        value={{
          profile: profile as never,
          updateProfile: jest.fn(),
          resetProfile: jest.fn(),
        }}
      >
        <NutritionScreen />
      </OnboardingContext.Provider>
    </AuthContext.Provider>,
  );
}

describe('NutritionScreen', () => {
  it('renders without crashing on an empty profile (incomplete state)', () => {
    renderScreen({});
    expect(screen.getByText('Finish your profile')).toBeTruthy();
  });

  it('shows the daily plan card title even when incomplete', () => {
    renderScreen({});
    expect(screen.getAllByText("Today's plan").length).toBeGreaterThan(0);
  });

  it('renders the event reporter with all five event types', () => {
    renderScreen({});
    expect(screen.getByTestId('event-followed_plan')).toBeTruthy();
    expect(screen.getByTestId('event-excess_food')).toBeTruthy();
    expect(screen.getByTestId('event-skipped_meal')).toBeTruthy();
    expect(screen.getByTestId('event-ordered_food')).toBeTruthy();
    expect(screen.getByTestId('event-alcohol')).toBeTruthy();
  });

  it('renders meal suggestions with at least one card per slot', () => {
    renderScreen({});
    expect(screen.getByTestId('suggestion-breakfast')).toBeTruthy();
    expect(screen.getByTestId('suggestion-lunch')).toBeTruthy();
    expect(screen.getByTestId('suggestion-dinner')).toBeTruthy();
    expect(screen.getByTestId('suggestion-snack')).toBeTruthy();
  });

  it('shows a real plan when the profile is complete', () => {
    renderScreen({
      goal: 'lose_weight',
      gender: 'female',
      age: 30,
      weightKg: 70,
      heightCm: 168,
      trainingDaysPerWeek: 3,
      targetWeightKg: 65,
      targetTimeframe: { durationWeeks: 12 },
      dietaryRestrictions: [],
    });
    // Header subtitle (visible only when plan exists)
    expect(screen.getByText('A simple target. Not a strict diet.')).toBeTruthy();
  });
});
