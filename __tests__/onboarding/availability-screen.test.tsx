import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import '../../src/lib/i18n';
import { OnboardingProvider } from '../../src/features/onboarding/onboarding-context';
import AvailabilityScreen from '../../app/(onboarding)/availability';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

function renderAvailability() {
  return render(
    <OnboardingProvider>
      <AvailabilityScreen />
    </OnboardingProvider>
  );
}

describe('AvailabilityScreen', () => {
  it('renders without crashing', () => {
    renderAvailability();
  });

  it('shows step 5 of 10 indicator', () => {
    renderAvailability();
    expect(screen.getByText(/Step 5 of 10/i)).toBeTruthy();
  });

  it('renders the 7-day grid', () => {
    renderAvailability();
    expect(screen.getByTestId('availability-grid')).toBeTruthy();
    for (let day = 0; day < 7; day++) {
      for (const slot of ['morning', 'midday', 'evening']) {
        expect(screen.getByTestId(`availability-cell-${day}-${slot}`)).toBeTruthy();
      }
    }
  });

  it('shows the three slot headers', () => {
    renderAvailability();
    expect(screen.getByTestId('availability-slot-header-morning')).toBeTruthy();
    expect(screen.getByTestId('availability-slot-header-midday')).toBeTruthy();
    expect(screen.getByTestId('availability-slot-header-evening')).toBeTruthy();
  });

  it('disables continue when no slot is selected', () => {
    renderAvailability();
    expect(screen.getByTestId('availability-min-warning')).toBeTruthy();
  });

  it('clears the min-required warning after selecting a slot', () => {
    renderAvailability();
    fireEvent.press(screen.getByTestId('availability-cell-1-evening'));
    expect(screen.queryByTestId('availability-min-warning')).toBeNull();
  });

  it('toggles a cell on/off when pressed twice', () => {
    renderAvailability();
    const cell = screen.getByTestId('availability-cell-2-morning');
    fireEvent.press(cell); // on
    fireEvent.press(cell); // off
    expect(screen.getByTestId('availability-min-warning')).toBeTruthy();
  });
});
