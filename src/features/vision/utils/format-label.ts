/**
 * Display formatter for free-text labels (e.g. unmapped fridge items).
 * Trims whitespace, collapses repeated spaces, and uppercases the first
 * letter of each word so a raw "ketchup" / "  KETCHUP  " / "ketchup heinz"
 * surfaces as "Ketchup", "Ketchup", "Ketchup Heinz" — clean and readable
 * regardless of how Gemini wrote it.
 */
export function formatRawLabel(input: string): string {
  const cleaned = input.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!cleaned) return cleaned;
  return cleaned.replace(/(^|\s|-)([a-zà-ÿ])/gu, (_match, sep, letter) =>
    `${sep}${letter.toUpperCase()}`,
  );
}
