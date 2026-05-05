import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import '../../src/lib/i18n';
import { OnboardingProvider } from '../../src/features/onboarding/onboarding-context';
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
  beforeEach(() => {
    mockBack.mockClear();
  });

  it('renders without crashing', () => {
    renderDetail();
  });

  it('shows the workout header label', () => {
    renderDetail();
    expect(screen.getByText('Workout')).toBeTruthy();
  });

  it('shows the day name', () => {
    renderDetail();
    // weekDayIndex 0 → full_body_3 Monday → Full Body A
    expect(screen.getByText('Full Body A')).toBeTruthy();
  });

  it('shows duration chip', () => {
    renderDetail();
    // Contains "min" (e.g., "45 min")
    const minLabels = screen.getAllByText(/min/i);
    expect(minLabels.length).toBeGreaterThan(0);
  });

  it('shows intensity chip', () => {
    renderDetail();
    // Full Body A = medium intensity
    expect(screen.getByText('Medium')).toBeTruthy();
  });

  it('shows exercise names (at least one)', () => {
    renderDetail();
    // full_body_3 Day A includes Bench Press
    expect(screen.getByText('Bench Press')).toBeTruthy();
  });

  it('shows sets × reps label for each exercise', () => {
    renderDetail();
    const setsReps = screen.getAllByText(/×.*reps/i);
    expect(setsReps.length).toBeGreaterThan(0);
  });

  it('shows the mark-all-done button', () => {
    renderDetail();
    expect(screen.getByText('Mark all done')).toBeTruthy();
  });

  it('shows the exercises completed label', () => {
    renderDetail();
    expect(screen.getByText('Exercises completed')).toBeTruthy();
  });

  it('tapping mark-all-done updates button label', () => {
    renderDetail();
    const btn = screen.getByText('Mark all done');
    fireEvent.press(btn);
    expect(screen.getByText('Session complete!')).toBeTruthy();
  });

  it('back button triggers router.back()', () => {
    renderDetail();
    // "‹ Back" is the navigation back button; pick the first element containing "Back"
    const backBtns = screen.getAllByText(/Back/i);
    fireEvent.press(backBtns[0]);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
