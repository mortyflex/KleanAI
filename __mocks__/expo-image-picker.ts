/**
 * Default Jest mock for expo-image-picker. Tests can override individual
 * methods with `jest.mocked(...)` or `jest.spyOn(...)` to simulate
 * permission denial, cancellation, or successful selection.
 */

export const requestMediaLibraryPermissionsAsync = jest.fn(async () => ({
  granted: true,
  status: 'granted',
  canAskAgain: true,
  expires: 'never',
}));

export const requestCameraPermissionsAsync = jest.fn(async () => ({
  granted: true,
  status: 'granted',
  canAskAgain: true,
  expires: 'never',
}));

export const launchImageLibraryAsync = jest.fn(async () => ({
  canceled: false,
  assets: [
    {
      uri: 'file:///mock/library/fridge.jpg',
      width: 1024,
      height: 768,
      mimeType: 'image/jpeg',
      type: 'image' as const,
      assetId: 'mock-asset-1',
      fileName: 'fridge.jpg',
      fileSize: 1024,
      exif: null,
      base64: null,
      duration: null,
    },
  ],
}));

export const launchCameraAsync = jest.fn(async () => ({
  canceled: false,
  assets: [
    {
      uri: 'file:///mock/camera/fridge.jpg',
      width: 1024,
      height: 768,
      mimeType: 'image/jpeg',
      type: 'image' as const,
      assetId: 'mock-asset-2',
      fileName: 'fridge.jpg',
      fileSize: 1024,
      exif: null,
      base64: null,
      duration: null,
    },
  ],
}));

export type ImagePickerAsset = {
  uri: string;
  width: number;
  height: number;
  mimeType?: string;
  type?: 'image' | 'video';
  assetId?: string | null;
  fileName?: string | null;
  fileSize?: number;
  exif?: Record<string, unknown> | null;
  base64?: string | null;
  duration?: number | null;
};
