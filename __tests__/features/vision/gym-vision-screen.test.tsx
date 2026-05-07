import React from 'react';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import '../../../src/lib/i18n';
import { GymVisionScreen } from '../../../src/features/vision/screens/gym-vision-screen';
import { __resetAIProviderForTests } from '../../../src/lib/ai';
import { clearAILogs } from '../../../src/lib/ai/logs';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

describe('GymVisionScreen — smoke', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetAIProviderForTests();
    clearAILogs();
  });

  it('renders the intro stage', () => {
    render(<GymVisionScreen />);
    expect(screen.getByText('Scan your gym')).toBeTruthy();
    expect(screen.getByText('Add photos')).toBeTruthy();
  });

  it('lets the user add a mock photo and reveals the analyze CTA', () => {
    render(<GymVisionScreen />);

    fireEvent.press(screen.getByTestId('vision-add-photo'));
    expect(screen.getByText('1 photo ready')).toBeTruthy();
    expect(screen.getByTestId('vision-analyze')).toBeTruthy();
  });

  it('runs analyze with the mock provider and shows result rows', async () => {
    render(<GymVisionScreen />);
    fireEvent.press(screen.getByTestId('vision-add-photo'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('vision-analyze'));
    });

    await waitFor(() =>
      expect(screen.getByText('We spotted these')).toBeTruthy(),
    );

    // The mock response includes barbell, dumbbells, cable, machine, pull-up bar.
    expect(screen.getByText('Barbell & rack')).toBeTruthy();
    expect(screen.getByText('Dumbbells')).toBeTruthy();
  });

  it('saves the user selection and persists it to AsyncStorage', async () => {
    render(<GymVisionScreen />);
    fireEvent.press(screen.getByTestId('vision-add-photo'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('vision-analyze'));
    });
    await waitFor(() =>
      expect(screen.getByText('We spotted these')).toBeTruthy(),
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('vision-save'));
    });

    await waitFor(() =>
      expect(screen.getByText('Equipment saved')).toBeTruthy(),
    );

    const stored = await AsyncStorage.getItem('@klean_confirmed_equipment');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string);
    expect(parsed.equipmentIds).toEqual(
      expect.arrayContaining(['barbell', 'dumbbell', 'bodyweight']),
    );
  });
});
