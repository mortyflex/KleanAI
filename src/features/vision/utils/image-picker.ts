import * as ImagePicker from 'expo-image-picker';

import type { AIRequestImage } from '../../../types/ai.types';

export type PickerSource = 'library' | 'camera';

export type PickerOutcome =
  | { ok: true; image: AIRequestImage }
  | { ok: false; reason: 'cancelled' | 'permission_denied' | 'unavailable' };

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

function inferMimeType(uri: string, declared?: string | null): string {
  if (declared && ALLOWED_MIME_TYPES.includes(declared)) return declared;
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

function toRequestImage(asset: ImagePicker.ImagePickerAsset): AIRequestImage {
  return {
    uri: asset.uri,
    mimeType: inferMimeType(asset.uri, asset.mimeType ?? undefined),
  };
}

/**
 * Pick a single fridge/pantry image from the device library or camera. The
 * returned object shape is the same the AI provider expects so the rest of
 * the pipeline does not care whether the URI is `file://`, `content://` or
 * the legacy `mock://` fallback.
 *
 * Never throws — callers branch on `ok`.
 */
export async function pickFridgeImage(
  source: PickerSource = 'library',
): Promise<PickerOutcome> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'permission_denied' };
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        exif: false,
      });
      if (result.canceled) return { ok: false, reason: 'cancelled' };
      const asset = result.assets?.[0];
      if (!asset) return { ok: false, reason: 'cancelled' };
      return { ok: true, image: toRequestImage(asset) };
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: 'permission_denied' };
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 0.85,
      exif: false,
    });
    if (result.canceled) return { ok: false, reason: 'cancelled' };
    const asset = result.assets?.[0];
    if (!asset) return { ok: false, reason: 'cancelled' };
    return { ok: true, image: toRequestImage(asset) };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/**
 * Dev-only helper: returns a synthetic mock URI so engineers can exercise the
 * pipeline without granting media-library permissions on a simulator. The
 * returned URI starts with `mock://` so consumers that want to render a
 * thumbnail can opt out gracefully.
 */
export function createMockFridgeImage(index: number): AIRequestImage {
  return {
    uri: `mock://fridge-photo-${index}-${Date.now()}.jpg`,
    mimeType: 'image/jpeg',
  };
}

export function isMockImageUri(uri: string): boolean {
  return uri.startsWith('mock://');
}
