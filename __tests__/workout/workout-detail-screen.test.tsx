import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '../../src/lib/i18n';

// useWorkoutSession reads from AuthProvider; this screen test doesn't mount one.
// Stub useAuth so the hook always sees an authenticated user.
jest.mock('../../src/features/auth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

// Replace the sync service so screen interactions never hit Supabase.
jest.mock(
  '../../src/features/workout/services/workout-sync',
  () => ({
    queueWorkoutSessionSync: jest
      .fn()
      .mockReturnValue(new Promise<never>(() => {})),
  }),
);

// eslint-disable-next-line import/first
import { OnboardingProvider } from '../../src/features/onboarding/onboarding-context';
// eslint-disable-next-line import/first
import WorkoutDetailScreen from '../../app/workout/[weekDayIndex]';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => ({ weekDayIndex: '0' }), // Monday → Full Body A
}));

function renderDetail() {
  return render(
    <OnboardingProvider>
      <WorkoutDetailScreen />
    </OnboardingProvider>,
  );
}

describe('WorkoutDetailScreen', () => {
  beforeEach(async () => {
    mockBack.mockClear();
    await AsyncStorage.clear();
  });

  it('renders without crashing', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText('Workout')).toBeTruthy());
  });

  it('shows the workout header label', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText('Workout')).toBeTruthy());
  });

  it('shows the day name', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText('Full Body A')).toBeTruthy());
  });

  it('shows duration chip', async () => {
    renderDetail();
    await waitFor(() => {
      const minLabels = screen.getAllByText(/min/i);
      expect(minLabels.length).toBeGreaterThan(0);
    });
  });

  it('shows intensity chip', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText('Medium')).toBeTruthy());
  });

  it('shows exercise names (at least one)', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
  });

  it('shows sets × reps label for each exercise', async () => {
    renderDetail();
    await waitFor(() => {
      const setsReps = screen.getAllByText(/×.*reps/i);
      expect(setsReps.length).toBeGreaterThan(0);
    });
  });

  it('shows the Finish workout button', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText('Finish workout')).toBeTruthy());
  });

  it('shows the Missed today button', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText('Missed today?')).toBeTruthy());
  });

  it('shows the exercises completed label', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText('Exercises completed')).toBeTruthy());
  });

  it('back button triggers router.back()', async () => {
    renderDetail();
    await waitFor(() => screen.getByText('Workout'));
    const backBtns = screen.getAllByText(/Back/i);
    fireEvent.press(backBtns[0]);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('tapping an exercise toggles its done state', async () => {
    renderDetail();
    await waitFor(() => screen.getByText('Bench Press'));

    const benchPressCard = screen.getByText('Bench Press');
    fireEvent.press(benchPressCard);

    // After toggle the done count increases — we can verify by presence of checkmark
    // The check is rendered as '✓' inside the circle when done=true
    await waitFor(() => {
      const checks = screen.queryAllByText('✓');
      expect(checks.length).toBeGreaterThan(0);
    });
  });

  it('shows the offline pending badge after an exercise toggle', async () => {
    renderDetail();
    await waitFor(() => screen.getByText('Bench Press'));

    fireEvent.press(screen.getByText('Bench Press'));

    await waitFor(() => expect(screen.getByText('Saved locally')).toBeTruthy());
  });

  it('tapping Finish workout shows the completion banner', async () => {
    renderDetail();
    await waitFor(() => screen.getByText('Finish workout'));

    fireEvent.press(screen.getByText('Finish workout'));

    await waitFor(() => expect(screen.getByText('Session complete!')).toBeTruthy());
  });

  it('hides Finish workout and Missed today buttons after finishing', async () => {
    renderDetail();
    await waitFor(() => screen.getByText('Finish workout'));

    fireEvent.press(screen.getByText('Finish workout'));

    await waitFor(() => {
      expect(screen.queryByText('Finish workout')).toBeNull();
      expect(screen.queryByText('Missed today?')).toBeNull();
    });
  });

  it('shows the Done chip in the header after finishing', async () => {
    renderDetail();
    await waitFor(() => screen.getByText('Finish workout'));

    fireEvent.press(screen.getByText('Finish workout'));

    await waitFor(() => expect(screen.getByText('Done')).toBeTruthy());
  });

  it('tapping Missed today shows the missed banner', async () => {
    renderDetail();
    await waitFor(() => screen.getByText('Missed today?'));

    fireEvent.press(screen.getByText('Missed today?'));

    await waitFor(() =>
      expect(
        screen.getByText('No worries — every day is a fresh start.'),
      ).toBeTruthy(),
    );
  });

  it('shows the Missed chip in the header after marking as missed', async () => {
    renderDetail();
    await waitFor(() => screen.getByText('Missed today?'));

    fireEvent.press(screen.getByText('Missed today?'));

    await waitFor(() => expect(screen.getByText('Missed')).toBeTruthy());
  });

  it('restores a previously saved completed session', async () => {
    // Pre-populate storage with a completed session for day-0
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

    renderDetail();

    await waitFor(() => expect(screen.getByText('Session complete!')).toBeTruthy());
  });
});
