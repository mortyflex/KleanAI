import type { Json } from '../../types/database.types';

/**
 * Resource kinds the sync queue knows how to push to Supabase.
 * Add new kinds here, then register a handler in `sync-handlers.ts`.
 */
export type SyncResourceKind =
  | 'workout_session'
  | 'workout_log'
  | 'nutrition_log'
  | 'smoothing_event';

/** State of a single queued operation. */
export type SyncItemStatus = 'pending' | 'syncing' | 'synced' | 'failed';

/**
 * A single queued operation. Payload shape is resource-specific and validated
 * by the matching handler in `sync-handlers.ts`.
 *
 * Items are persisted to AsyncStorage so they survive app restarts and offline
 * sessions. The runner walks the queue, calls the handler, and updates each
 * item's status + attempts counter.
 */
export interface SyncQueueItem {
  id: string;
  resource: SyncResourceKind;
  /** Stable key used for de-duplication (e.g. `workout_session:day-0`). */
  dedupeKey: string;
  payload: Json;
  status: SyncItemStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncQueueCounts {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
}
