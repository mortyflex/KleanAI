/**
 * Key hierarchy for nutrition data. Mirrors the TanStack Query convention
 * already used in the workout feature.
 *
 *   nutritionQueryKeys.all          → ['nutrition']
 *   nutritionQueryKeys.day(date)    → ['nutrition', 'day', date]
 *   nutritionQueryKeys.pendingSync  → ['nutrition', 'pendingSync']
 */
export const nutritionQueryKeys = {
  all: ['nutrition'] as const,
  days: () => [...nutritionQueryKeys.all, 'day'] as const,
  day: (logDate: string) => [...nutritionQueryKeys.days(), logDate] as const,
  pendingSync: () => [...nutritionQueryKeys.all, 'pendingSync'] as const,
} as const;

export const nutritionMutationKeys = {
  logDay: 'nutrition/logDay' as const,
  resetDay: 'nutrition/resetDay' as const,
  syncDay: 'nutrition/syncDay' as const,
} as const;
