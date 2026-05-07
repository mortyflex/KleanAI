/**
 * Key hierarchy for smoothing events. Mirrors the TanStack Query convention.
 *
 *   smoothingQueryKeys.all          → ['smoothing']
 *   smoothingQueryKeys.events()     → ['smoothing', 'events']
 *   smoothingQueryKeys.event(id)    → ['smoothing', 'events', id]
 *   smoothingQueryKeys.pendingSync  → ['smoothing', 'pendingSync']
 */
export const smoothingQueryKeys = {
  all: ['smoothing'] as const,
  events: () => [...smoothingQueryKeys.all, 'events'] as const,
  event: (id: string) => [...smoothingQueryKeys.events(), id] as const,
  pendingSync: () => [...smoothingQueryKeys.all, 'pendingSync'] as const,
} as const;

export const smoothingMutationKeys = {
  logEvent: 'smoothing/logEvent' as const,
  syncEvent: 'smoothing/syncEvent' as const,
} as const;
