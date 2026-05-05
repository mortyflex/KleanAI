import React from 'react';
import { render, screen } from '@testing-library/react-native';
import '../../src/lib/i18n';
import { OnboardingProvider } from '../../src/features/onboarding/onboarding-context';
import WorkoutProgramOverview from '../../app/(tabs)/workout';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

function renderOverview() {
  return render(
    <OnboardingProvider>
      <WorkoutProgramOverview />
    </OnboardingProvider>,
  );
}

describe('WorkoutProgramOverview', () => {
  it('renders without crashing', () => {
    renderOverview();
  });

  it('shows the program title label', () => {
    renderOverview();
    expect(screen.getByText('Your Program')).toBeTruthy();
  });

  it('shows week progress text', () => {
    renderOverview();
    expect(screen.getByText(/Week 1 of/i)).toBeTruthy();
  });

  it('shows at least one workout day (not all rest)', () => {
    renderOverview();
    // Default profile → full_body_3 → days include Full Body A, B, C
    expect(screen.getByText('Full Body A')).toBeTruthy();
  });

  it('shows rest day labels for non-training days', () => {
    renderOverview();
    // full_body_3 has 4 rest days, so "Rest" appears multiple times
    const restLabels = screen.getAllByText('Rest');
    expect(restLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('shows weekday short labels (Mon, Wed, Fri)', () => {
    renderOverview();
    expect(screen.getByText('Mon')).toBeTruthy();
    expect(screen.getByText('Wed')).toBeTruthy();
    expect(screen.getByText('Fri')).toBeTruthy();
  });

  it('shows split name (Full Body — 3 days for default profile)', () => {
    renderOverview();
    expect(screen.getByText('Full Body — 3 days')).toBeTruthy();
  });

  it('shows exercise counts for workout days', () => {
    renderOverview();
    // At least one day should show "X exercises"
    const exerciseLabels = screen.getAllByText(/exercise/i);
    expect(exerciseLabels.length).toBeGreaterThan(0);
  });
});
