/**
 * Convert a local image URI (file://, content://, http(s)://) into a base64
 * payload suitable for sending to the `analyze-fridge-images` Edge Function.
 *
 * Uses React Native's `fetch` + `FileReader` so no extra native module is
 * required. Tests inject their own implementation via `__setImageEncoder`
 * to keep the provider unit tests deterministic.
 */
export interface EncodedImage {
  data: string;
  mimeType: string;
}

export type ImageEncoder = (
  uri: string,
  fallbackMimeType?: string,
) => Promise<EncodedImage>;

const defaultEncoder: ImageEncoder = async (uri, fallbackMimeType) => {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to read image (${response.status})`);
  }
  const blob = await response.blob();
  const mimeType = blob.type || fallbackMimeType || "image/jpeg";

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });

  const commaIndex = dataUrl.indexOf(",");
  const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  return { data: base64, mimeType };
};

let activeEncoder: ImageEncoder = defaultEncoder;

export function encodeImageToBase64(
  uri: string,
  fallbackMimeType?: string,
): Promise<EncodedImage> {
  return activeEncoder(uri, fallbackMimeType);
}

/** Test seam — swap the encoder so unit tests don't touch fetch/FileReader. */
export function __setImageEncoderForTests(encoder: ImageEncoder | null): void {
  activeEncoder = encoder ?? defaultEncoder;
}
