import type { AILogEntry } from '../../types/ai.types';

/**
 * Lightweight in-memory AI log placeholder. Real implementation will push
 * these entries to a Supabase table + Sentry breadcrumb. We keep the shape
 * stable so callers do not need to change later.
 *
 * Sensitive payloads (image bytes, full prompts) must never be logged here.
 */
const buffer: AILogEntry[] = [];

export function recordAILog(
  entry: Omit<AILogEntry, 'id' | 'createdAt'>,
): AILogEntry {
  const full: AILogEntry = {
    ...entry,
    id: `ai-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  buffer.push(full);
  return full;
}

export function getAILogs(): readonly AILogEntry[] {
  return buffer;
}

export function clearAILogs(): void {
  buffer.length = 0;
}

export function summarizeDetected(count: number, kept: number): string {
  return `detected=${count} kept=${kept}`;
}
