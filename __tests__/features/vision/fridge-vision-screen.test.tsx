import React from 'react';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import '../../../src/lib/i18n';
import { FridgeVisionScreen } from '../../../src/features/vision/screens/fridge-vision-screen';
import { __resetAIProviderForTests } from '../../../src/lib/ai';
import { clearAILogs } from '../../../src/lib/ai/logs';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

describe('FridgeVisionScreen — smoke', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetAIProviderForTests();
    clearAILogs();
  });

  it('renders the intro stage', () => {
    render(<FridgeVisionScreen />);
    expect(screen.getByText('Scan your fridge')).toBeTruthy();
    expect(screen.getByText('Add photos')).toBeTruthy();
  });

  it('lets the user add a mock photo and reveals the analyze CTA', () => {
    render(<FridgeVisionScreen />);

    fireEvent.press(screen.getByTestId('fridge-add-photo'));
    expect(screen.getByText('1 photo ready')).toBeTruthy();
    expect(screen.getByTestId('fridge-analyze')).toBeTruthy();
  });

  it('runs analyze with the mock provider and shows result rows', async () => {
    render(<FridgeVisionScreen />);
    fireEvent.press(screen.getByTestId('fridge-add-photo'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('fridge-analyze'));
    });

    await waitFor(() =>
      expect(screen.getByText('We spotted these')).toBeTruthy(),
    );

    // The mock response includes chicken breast, eggs, greek yogurt, etc.
    expect(screen.getByText('Chicken breast')).toBeTruthy();
    expect(screen.getByText('Eggs')).toBeTruthy();
  });

  it('saves the user selection and persists it to AsyncStorage', async () => {
    render(<FridgeVisionScreen />);
    fireEvent.press(screen.getByTestId('fridge-add-photo'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('fridge-analyze'));
    });
    await waitFor(() =>
      expect(screen.getByText('We spotted these')).toBeTruthy(),
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('fridge-save'));
    });

    await waitFor(() =>
      expect(screen.getByText('Fridge saved')).toBeTruthy(),
    );

    const stored = await AsyncStorage.getItem('@klean_confirmed_fridge');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string);
    expect(parsed.ingredientIds).toEqual(
      expect.arrayContaining(['chicken_breast', 'eggs']),
    );
  });
});
