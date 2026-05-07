import { getSyncHandler } from './sync-handlers';
import {
  getPending,
  updateStatus,
} from './sync-queue-storage';
import type { SyncQueueItem } from './types';

/** Default cap on retry attempts before an item is left in `failed`. */
export const DEFAULT_MAX_ATTEMPTS = 5;

export interface RunSyncOptions {
  /** Items above this many attempts are skipped on this run (still kept in the queue). */
  maxAttempts?: number;
}

export interface RunSyncReport {
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

/**
 * Guard so concurrent triggers (foreground + manual retry, etc.) don't run two
 * drains in parallel. The second caller just gets the in-flight promise.
 */
let inFlight: Promise<RunSyncReport> | null = null;

/**
 * Walk every pending/failed queue item once and try to push it. Each item is
 * marked `syncing` while in flight, then `synced` on success or `failed` on
 * error (with `attempts` incremented and `lastError` recorded).
 *
 * The runner is intentionally serial — fitness sync volume is low and a serial
 * loop is far simpler to reason about than parallel coordination, especially
 * around retries and dedupe.
 */
export function runSync(options: RunSyncOptions = {}): Promise<RunSyncReport> {
  if (inFlight) return inFlight;
  inFlight = drain(options).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function drain(options: RunSyncOptions): Promise<RunSyncReport> {
  const max = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const items = await getPending();
  const report: RunSyncReport = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  };

  for (const item of items) {
    if (item.attempts >= max) {
      report.skipped += 1;
      continue;
    }
    report.attempted += 1;
    const ok = await attemptOne(item);
    if (ok) report.succeeded += 1;
    else report.failed += 1;
  }
  return report;
}

async function attemptOne(item: SyncQueueItem): Promise<boolean> {
  await updateStatus(item.id, 'syncing');
  try {
    const handler = getSyncHandler(item.resource);
    await handler(item.payload);
    await updateStatus(item.id, 'synced', { incrementAttempts: true });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateStatus(item.id, 'failed', {
      incrementAttempts: true,
      lastError: message,
    });
    return false;
  }
}

/** @internal — drop the in-flight guard between tests. */
export function __resetRunnerForTests(): void {
  inFlight = null;
}
