/**
 * TanStack Query key hierarchy — ready to wire up when Supabase sync is added.
 *
 * Usage:
 *   useQuery({ queryKey: workoutQueryKeys.session(dayId), queryFn: ... })
 *   useMutation({ mutationKey: [workoutMutationKeys.finishWorkout], ... })
 */
export const workoutQueryKeys = {
  all: ['workout'] as const,
  sessions: () => [...workoutQueryKeys.all, 'sessions'] as const,
  session: (dayId: string) => [...workoutQueryKeys.sessions(), dayId] as const,
  program: () => [...workoutQueryKeys.all, 'program'] as const,
  pendingSync: () => [...workoutQueryKeys.all, 'pendingSync'] as const,
} as const;

export const workoutMutationKeys = {
  toggleExercise: 'workout/toggleExercise' as const,
  finishWorkout: 'workout/finishWorkout' as const,
  markMissed: 'workout/markMissed' as const,
  syncSession: 'workout/syncSession' as const,
} as const;
