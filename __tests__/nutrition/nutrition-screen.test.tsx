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

  it('renders without crashing on an empty profile and shows the meal section', () => {
    renderScreen({});
    expect(screen.getByText("Today's meals")).toBeTruthy();
  });

  it('shows the today plan kicker even when the profile is incomplete', () => {
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

  it('renders one meal slot card per meal type', () => {
    renderScreen({});
    expect(screen.getByTestId('nutrition-meal-breakfast')).toBeTruthy();
    expect(screen.getByTestId('nutrition-meal-lunch')).toBeTruthy();
    expect(screen.getByTestId('nutrition-meal-dinner')).toBeTruthy();
    expect(screen.getByTestId('nutrition-meal-snack')).toBeTruthy();
  });

  it('shows the zero-guilt hero copy regardless of profile state', () => {
    renderScreen({});
    expect(
      screen.getByText(
        'Real food, zero guilt. Klean adapts whenever life gets messy.',
      ),
    ).toBeTruthy();
  });

  it('exposes a CTA to scan the fridge when none is confirmed yet', async () => {
    renderScreen({});
    expect(screen.getByTestId('nutrition-fridge-scan-cta')).toBeTruthy();
    expect(screen.getByText('Scan my fridge')).toBeTruthy();
  });

  it('decrements the calorie counter when the user marks a meal as eaten', async () => {
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

    // Default lunch fallback is the chicken rice bowl (580 kcal). Tap its
    // "I ate this" button and verify the totals card updates.
    const lunchEat = await screen.findByTestId('nutrition-meal-lunch-eat');
    await act(async () => {
      fireEvent.press(lunchEat);
    });

    await waitFor(() => {
      expect(screen.getByText('580')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('nutrition-meal-lunch-eat'));
    });

    await waitFor(() => {
      expect(screen.getByText('0')).toBeTruthy();
    });
  });

  it('biases meal suggestions toward confirmed fridge ingredients', async () => {
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

    expect(screen.getByText('Update my fridge')).toBeTruthy();
  });

  it('surfaces the chosen recipe title and macros in the slot card', async () => {
    await AsyncStorage.setItem(
      `@klean_chosen_recipes_${todayKey()}`,
      JSON.stringify({
        lunch: {
          recipeId: 'internal:chicken_rice_lunch',
          source: 'internal',
          mealType: 'lunch',
          title: 'My chosen lunch',
          description: 'A custom pick',
          estimatedCalories: 540,
          estimatedProteinG: 40,
          estimatedCarbsG: 50,
          estimatedFatG: 14,
          prepTimeMinutes: 22,
          tags: ['high_protein'],
          chosenAt: '2026-05-08T10:00:00Z',
        },
      }),
    );

    renderScreen({});

    await waitFor(() => {
      expect(screen.getByText('My chosen lunch')).toBeTruthy();
    });
  });
});

function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
