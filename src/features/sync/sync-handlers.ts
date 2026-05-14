import type { Json } from '../../types/database.types';
import { getSupabase } from '../../lib/supabase';
import type { SyncResourceKind } from './types';

/**
 * A handler pushes a single queued payload to Supabase and resolves on
 * success. Throwing (or rejecting) signals the runner to mark the item as
 * `failed` and try again later.
 */
export type SyncHandler = (payload: Json) => Promise<void>;

interface WorkoutSessionPayload {
  user_id: string;
  session_id: string;
  day_id: string;
  status: 'in_progress' | 'completed' | 'missed';
  scheduled_at?: string | null;
  finished_at?: string | null;
  missed_at?: string | null;
}

interface WorkoutLogPayload {
  user_id: string;
  session_id: string;
  exercise_key: string;
  set_index: number;
  reps?: number | null;
  weight_kg?: number | null;
  rpe?: number | null;
  notes?: string | null;
  logged_at: string;
}

interface NutritionLogPayload {
  user_id: string;
  log_date: string;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  notes?: string | null;
}

interface SmoothingEventPayload {
  user_id: string;
  event_type: string;
  delta_kcal?: number | null;
  spread_days?: number | null;
  payload?: Json | null;
}

const handlers: Record<SyncResourceKind, SyncHandler> = {
  workout_session: async (payload) => {
    const p = payload as unknown as WorkoutSessionPayload;
    const { error } = await getSupabase()
      .from('workout_sessions')
      .upsert(
        {
          id: p.session_id,
          user_id: p.user_id,
          status: p.status,
          scheduled_at: p.scheduled_at ?? null,
        },
        { onConflict: 'id' },
      );
    if (error) throw new Error(error.message);
  },

  workout_log: async (payload) => {
    const p = payload as unknown as WorkoutLogPayload;
    const { error } = await getSupabase()
      .from('workout_logs')
      .insert({
        user_id: p.user_id,
        session_id: p.session_id,
        exercise_key: p.exercise_key,
        set_index: p.set_index,
        reps: p.reps ?? null,
        weight_kg: p.weight_kg ?? null,
        rpe: p.rpe ?? null,
        notes: p.notes ?? null,
        logged_at: p.logged_at,
      });
    if (error) throw new Error(error.message);
  },

  nutrition_log: async (payload) => {
    const p = payload as unknown as NutritionLogPayload;
    const { error } = await getSupabase()
      .from('daily_nutrition_logs')
      .upsert(
        {
          user_id: p.user_id,
          log_date: p.log_date,
          calories: p.calories ?? null,
          protein_g: p.protein_g ?? null,
          carbs_g: p.carbs_g ?? null,
          fat_g: p.fat_g ?? null,
          notes: p.notes ?? null,
        },
        { onConflict: 'user_id,log_date' },
      );
    if (error) throw new Error(error.message);
  },

  smoothing_event: async (payload) => {
    const p = payload as unknown as SmoothingEventPayload;
    const { error } = await getSupabase()
      .from('smoothing_events')
      .insert({
        user_id: p.user_id,
        event_type: p.event_type,
        delta_kcal: p.delta_kcal ?? null,
        spread_days: p.spread_days ?? null,
        payload: p.payload ?? null,
      });
    if (error) throw new Error(error.message);
  },
};

export function getSyncHandler(kind: SyncResourceKind): SyncHandler {
  const handler = handlers[kind];
  if (!handler) {
    throw new Error(`No sync handler registered for resource "${kind}"`);
  }
  return handler;
}

/** @internal — replace handlers in tests to mock Supabase calls. */
export function __setSyncHandlerForTests(
  kind: SyncResourceKind,
  fn: SyncHandler,
): () => void {
  const previous = handlers[kind];
  handlers[kind] = fn;
  return () => {
    handlers[kind] = previous;
  };
}
