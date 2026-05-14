import React from 'react';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

import '../../../src/lib/i18n';
import { FridgeVisionScreen } from '../../../src/features/vision/screens/fridge-vision-screen';
import { __resetAIProviderForTests } from '../../../src/lib/ai';
import { clearAILogs } from '../../../src/lib/ai/logs';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

const REAL_LIBRARY_URI = 'file:///mock/library/fridge.jpg';

describe('FridgeVisionScreen — smoke', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetAIProviderForTests();
    clearAILogs();
    jest.clearAllMocks();
  });

  it('renders the intro stage with the real picker entry points', () => {
    render(<FridgeVisionScreen />);
    expect(screen.getByText('Scan your fridge')).toBeTruthy();
    expect(screen.getByTestId('fridge-take-photo')).toBeTruthy();
    expect(screen.getByTestId('fridge-pick-library')).toBeTruthy();
  });

  it('lets the user pick a real library photo and reveals the analyze CTA', async () => {
    render(<FridgeVisionScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('fridge-pick-library'));
    });

    await waitFor(() =>
      expect(screen.getByText('1 photo ready')).toBeTruthy(),
    );
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    expect(screen.getByTestId('fridge-analyze')).toBeTruthy();
  });

  it('renders a remove control for the picked photo and clears it on press', async () => {
    render(<FridgeVisionScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('fridge-pick-library'));
    });
    await waitFor(() =>
      expect(screen.getByText('1 photo ready')).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId(`fridge-remove-photo-${REAL_LIBRARY_URI}`));

    await waitFor(() =>
      expect(screen.queryByText('1 photo ready')).toBeNull(),
    );
  });

  it('replaces the picked photo when the user taps Replace', async () => {
    render(<FridgeVisionScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('fridge-pick-library'));
    });
    await waitFor(() =>
      expect(screen.getByText('1 photo ready')).toBeTruthy(),
    );

    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: 'file:///mock/library/fridge-2.png',
            width: 1024,
            height: 768,
            mimeType: 'image/png',
            type: 'image' as const,
            assetId: 'replacement',
            fileName: 'fridge-2.png',
            fileSize: 1024,
            exif: null,
            base64: null,
            duration: null,
          },
        ],
      } as Awaited<ReturnType<typeof ImagePicker.launchImageLibraryAsync>>);

    await act(async () => {
      fireEvent.press(screen.getByTestId('fridge-replace-photo'));
    });

    await waitFor(() =>
      expect(screen.getByText('1 photo ready')).toBeTruthy(),
    );
    expect(
      screen.queryByTestId(`fridge-remove-photo-${REAL_LIBRARY_URI}`),
    ).toBeNull();
  });

  it('shows a permission-denied message and skips the picker when the OS refuses', async () => {
    jest
      .mocked(ImagePicker.requestMediaLibraryPermissionsAsync)
      .mockResolvedValueOnce({
        granted: false,
        status: 'denied',
        canAskAgain: true,
        expires: 'never',
      } as Awaited<ReturnType<typeof ImagePicker.requestMediaLibraryPermissionsAsync>>);

    render(<FridgeVisionScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('fridge-pick-library'));
    });

    await waitFor(() =>
      expect(screen.getByText('Permission needed')).toBeTruthy(),
    );
    expect(screen.queryByText('1 photo ready')).toBeNull();
  });

  it('runs analyze with the mock provider on a real-looking URI and shows result rows', async () => {
    render(<FridgeVisionScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('fridge-pick-library'));
    });
    await waitFor(() =>
      expect(screen.getByText('1 photo ready')).toBeTruthy(),
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('fridge-analyze'));
    });

    await waitFor(() =>
      expect(screen.getByText('We spotted these')).toBeTruthy(),
    );
    expect(screen.getByText('Chicken breast')).toBeTruthy();
    expect(screen.getByText('Eggs')).toBeTruthy();
  });

  it('saves the user selection and persists it to AsyncStorage', async () => {
    render(<FridgeVisionScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('fridge-pick-library'));
    });
    await waitFor(() =>
      expect(screen.getByText('1 photo ready')).toBeTruthy(),
    );

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

  it('still exposes the dev mock CTA so engineers can exercise the flow without media permissions', async () => {
    render(<FridgeVisionScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('fridge-add-photo'));
    });
    expect(screen.getByText('1 photo ready')).toBeTruthy();
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });
});
