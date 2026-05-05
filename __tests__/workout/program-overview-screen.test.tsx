import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '../../src/lib/i18n';
import { OnboardingProvider } from '../../src/features/onboarding/onboarding-context';
import WorkoutProgramOverview from '../../app/(tabs)/workout';

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RealReact = require('react');
  return {
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
    // Run the focus effect once on mount to simulate tab focus
    useFocusEffect: (cb: () => void | (() => void)) => {
      RealReact.useEffect(cb, []);
    },
  };
});

function renderOverview() {
  return render(
    <OnboardingProvider>
      <WorkoutProgramOverview />
    </OnboardingProvider>,
  );
}

describe('WorkoutProgramOverview', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renders without crashing', async () => {
    renderOverview();
    await waitFor(() => expect(screen.getByText('Your Program')).toBeTruthy());
  });

  it('shows the program title label', async () => {
    renderOverview();
    await waitFor(() => expect(screen.getByText('Your Program')).toBeTruthy());
  });

  it('shows week progress text', async () => {
    renderOverview();
    await waitFor(() => expect(screen.getByText(/Week 1 of/i)).toBeTruthy());
  });

  it('shows at least one workout day (not all rest)', async () => {
    renderOverview();
    await waitFor(() => expect(screen.getByText('Full Body A')).toBeTruthy());
  });

  it('shows rest day labels for non-training days', async () => {
    renderOverview();
    await waitFor(() => {
      const restLabels = screen.getAllByText('Rest');
      expect(restLabels.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows weekday short labels (Mon, Wed, Fri)', async () => {
    renderOverview();
    await waitFor(() => {
      expect(screen.getByText('Mon')).toBeTruthy();
      expect(screen.getByText('Wed')).toBeTruthy();
      expect(screen.getByText('Fri')).toBeTruthy();
    });
  });

  it('shows split name (Full Body — 3 days for default profile)', async () => {
    renderOverview();
    await waitFor(() => expect(screen.getByText('Full Body — 3 days')).toBeTruthy());
  });

  it('shows exercise counts for workout days', async () => {
    renderOverview();
    await waitFor(() => {
      const exerciseLabels = screen.getAllByText(/exercise/i);
      expect(exerciseLabels.length).toBeGreaterThan(0);
    });
  });

  it('shows Done badge for a day with a completed session', async () => {
    // Pre-populate AsyncStorage with a completed session for day-0 (Monday)
    await AsyncStorage.setItem(
      '@klean_workout_session_day-0',
      JSON.stringify({
        dayId: 'day-0',
        weekDayIndex: 0,
        status: 'completed',
        syncStatus: 'pending',
        exercises: [],
        startedAt: '2026-05-05T08:00:00.000Z',
        updatedAt: '2026-05-05T08:45:00.000Z',
      }),
    );

    renderOverview();

    await waitFor(() => expect(screen.getByText('Done')).toBeTruthy());
  });

  it('shows Missed badge for a day with a missed session', async () => {
    await AsyncStorage.setItem(
      '@klean_workout_session_day-0',
      JSON.stringify({
        dayId: 'day-0',
        weekDayIndex: 0,
        status: 'missed',
        syncStatus: 'pending',
        exercises: [],
        startedAt: '2026-05-05T08:00:00.000Z',
        updatedAt: '2026-05-05T08:05:00.000Z',
      }),
    );

    renderOverview();

    await waitFor(() => expect(screen.getByText('Missed')).toBeTruthy());
  });
});
