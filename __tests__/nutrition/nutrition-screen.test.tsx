import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import '../../src/lib/i18n';
import NutritionScreen from '../../app/(tabs)/nutrition';
import {
  AuthContext,
  type AuthContextValue,
} from '../../src/features/auth';
import { OnboardingContext } from '../../src/features/onboarding/onboarding-context';
import { saveConfirmedFridge } from '../../src/features/vision/store/fridge-storage';

jest.mock('expo-router', () => {
  const actualReact = jest.requireActual('react');
  return {
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
    useFocusEffect: (cb: () => void | (() => void)) => {
      // Run the focus callback once at mount — enough to exercise reload-on-focus
      // logic in tests without pulling in the full navigator.
      actualReact.useEffect(() => cb(), [cb]);
    },
  };
});

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
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

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

  it('exposes a CTA to scan the fridge when none is confirmed yet', async () => {
    renderScreen({});
    expect(screen.getByTestId('nutrition-fridge-scan-cta')).toBeTruthy();
    expect(screen.getByText('Scan my fridge')).toBeTruthy();
  });

  it('decrements the calorie counter when the user marks a suggestion as eaten', async () => {
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

    // Default lunch suggestion is the chicken rice bowl (580 kcal). Tap its
    // "I ate this" button and verify the totals card updates.
    const lunchToggle = await screen.findByTestId('suggestion-lunch-toggle');
    await act(async () => {
      fireEvent.press(lunchToggle);
    });

    await waitFor(() => {
      expect(screen.getByText('580')).toBeTruthy();
    });

    // Tap again — totals should drop back to 0.
    await act(async () => {
      fireEvent.press(screen.getByTestId('suggestion-lunch-toggle'));
    });

    await waitFor(() => {
      expect(screen.getByText('0')).toBeTruthy();
    });
  });

  it('biases meal suggestions toward confirmed fridge ingredients', async () => {
    // Default catalog order (no fridge) picks oatmeal_berries / chicken_rice_bowl
    // / turkey_meatballs / fruit_almonds. With these ingredients, the scoring
    // shifts breakfast to greek_yogurt_bowl, dinner to chickpea_curry, snack to
    // cottage_cheese_fruit — giving us a clear signal the fridge is wired in.
    await saveConfirmedFridge([
      'greek_yogurt',
      'spinach',
      'brown_rice',
      'banana',
    ]);

    renderScreen({});

    await waitFor(() => {
      expect(screen.getByText('Greek yogurt bowl')).toBeTruthy();
      expect(screen.getByText('Chickpea curry')).toBeTruthy();
      expect(screen.getByText('Cottage cheese & fruit')).toBeTruthy();
    });

    // CTA copy switches once a fridge is on file.
    expect(screen.getByText('Update my fridge')).toBeTruthy();
  });
});
