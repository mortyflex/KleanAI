/**
 * Generate an RFC 4122 v4 UUID. Uses `Math.random` rather than a crypto
 * source — these ids are row identifiers, not secrets, and React Native's
 * Hermes runtime does not expose `crypto.randomUUID` out of the box.
 *
 * If you ever need a cryptographically strong id (auth tokens, etc.), use
 * `expo-crypto` instead — do NOT replace this helper.
 */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
