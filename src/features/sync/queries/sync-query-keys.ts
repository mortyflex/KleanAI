/**
 * Key hierarchy for sync-queue derived state. Mirrors the TanStack Query
 * convention so screens can later swap to `useQuery` without renaming keys.
 *
 *   syncQueryKeys.all              → ['sync']
 *   syncQueryKeys.queue()          → ['sync', 'queue']
 *   syncQueryKeys.pending()        → ['sync', 'queue', 'pending']
 *   syncQueryKeys.counts()         → ['sync', 'counts']
 *   syncQueryKeys.byResource(kind) → ['sync', 'queue', 'byResource', kind]
 */
export const syncQueryKeys = {
  all: ['sync'] as const,
  queue: () => [...syncQueryKeys.all, 'queue'] as const,
  pending: () => [...syncQueryKeys.queue(), 'pending'] as const,
  counts: () => [...syncQueryKeys.all, 'counts'] as const,
  byResource: (kind: string) =>
    [...syncQueryKeys.queue(), 'byResource', kind] as const,
} as const;

export const syncMutationKeys = {
  enqueue: 'sync/enqueue' as const,
  drain: 'sync/drain' as const,
  retryItem: 'sync/retryItem' as const,
} as const;
