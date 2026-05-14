import * as ImagePicker from 'expo-image-picker';
import {
  createMockFridgeImage,
  isMockImageUri,
  pickFridgeImage,
} from '../../../src/features/vision/utils/image-picker';

describe('pickFridgeImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the selected library asset as an AIRequestImage', async () => {
    const result = await pickFridgeImage('library');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.image.uri).toMatch(/^file:\/\//);
      expect(result.image.mimeType).toBe('image/jpeg');
    }
    expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
  });

  it('falls back to permission_denied when the OS refuses', async () => {
    jest
      .mocked(ImagePicker.requestMediaLibraryPermissionsAsync)
      .mockResolvedValueOnce({
        granted: false,
        status: 'denied',
        canAskAgain: true,
        expires: 'never',
      } as Awaited<ReturnType<typeof ImagePicker.requestMediaLibraryPermissionsAsync>>);

    const result = await pickFridgeImage('library');
    expect(result).toEqual({ ok: false, reason: 'permission_denied' });
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('returns cancelled when the user dismisses the library picker', async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValueOnce({ canceled: true, assets: null } as Awaited<
        ReturnType<typeof ImagePicker.launchImageLibraryAsync>
      >);

    const result = await pickFridgeImage('library');
    expect(result).toEqual({ ok: false, reason: 'cancelled' });
  });

  it('routes to the camera when source is camera', async () => {
    const result = await pickFridgeImage('camera');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.image.uri).toBe('file:///mock/camera/fridge.jpg');
    }
    expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
  });

  it('returns unavailable when the picker throws', async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockRejectedValueOnce(new Error('boom'));

    const result = await pickFridgeImage('library');
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('createMockFridgeImage / isMockImageUri', () => {
  it('produces unique mock URIs that are recognised by isMockImageUri', () => {
    const a = createMockFridgeImage(1);
    const b = createMockFridgeImage(2);
    expect(a.uri).not.toBe(b.uri);
    expect(isMockImageUri(a.uri)).toBe(true);
    expect(isMockImageUri('file:///user/photo.jpg')).toBe(false);
  });
});
