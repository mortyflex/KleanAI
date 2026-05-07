import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Json } from '../../types/database.types';
import type {
  SyncItemStatus,
  SyncQueueCounts,
  SyncQueueItem,
  SyncResourceKind,
} from './types';

const QUEUE_KEY = '@klean_sync_queue_v1';

async function readQueue(): Promise<SyncQueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as SyncQueueItem[];
  } catch {
    return [];
  }
}

async function writeQueue(items: SyncQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface EnqueueInput {
  resource: SyncResourceKind;
  dedupeKey: string;
  payload: Json;
}

/**
 * Append a sync item, replacing any pending/failed item that shares the
 * dedupe key. We never replace items that are currently `syncing` or already
 * `synced` — those are either in flight or done, so the new payload becomes
 * a fresh queue entry instead.
 */
export async function enqueue(input: EnqueueInput): Promise<SyncQueueItem> {
  const items = await readQueue();
  const now = new Date().toISOString();

  const item: SyncQueueItem = {
    id: makeId(),
    resource: input.resource,
    dedupeKey: input.dedupeKey,
    payload: input.payload,
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  const next = items.filter(
    (existing) =>
      !(
        existing.dedupeKey === input.dedupeKey
        && existing.resource === input.resource
        && (existing.status === 'pending' || existing.status === 'failed')
      ),
  );
  next.push(item);
  await writeQueue(next);
  return item;
}

export async function getAll(): Promise<SyncQueueItem[]> {
  return readQueue();
}

export async function getPending(): Promise<SyncQueueItem[]> {
  const items = await readQueue();
  return items.filter((i) => i.status === 'pending' || i.status === 'failed');
}

export async function getCounts(): Promise<SyncQueueCounts> {
  const items = await readQueue();
  return items.reduce<SyncQueueCounts>(
    (acc, i) => {
      acc[i.status] += 1;
      return acc;
    },
    { pending: 0, syncing: 0, synced: 0, failed: 0 },
  );
}

export async function updateStatus(
  id: string,
  status: SyncItemStatus,
  patch: { lastError?: string; incrementAttempts?: boolean } = {},
): Promise<SyncQueueItem | null> {
  const items = await readQueue();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return null;

  const current = items[idx]!;
  const next: SyncQueueItem = {
    ...current,
    status,
    attempts: patch.incrementAttempts ? current.attempts + 1 : current.attempts,
    lastError: patch.lastError,
    updatedAt: new Date().toISOString(),
  };
  items[idx] = next;
  await writeQueue(items);
  return next;
}

export async function remove(id: string): Promise<void> {
  const items = await readQueue();
  await writeQueue(items.filter((i) => i.id !== id));
}

/** Drop every item whose status is `synced`. Useful to keep the queue small. */
export async function clearSynced(): Promise<void> {
  const items = await readQueue();
  await writeQueue(items.filter((i) => i.status !== 'synced'));
}

/** @internal — used by tests to start from an empty queue. */
export async function __resetForTests(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
