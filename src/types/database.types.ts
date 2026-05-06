/**
 * Placeholder for Supabase generated database types.
 *
 * Once the migrations under `supabase/migrations/` are applied to a real
 * project, regenerate this file with:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts
 *
 * Until then, we keep a minimal `Database` shape so `createClient<Database>`
 * still has type information and downstream code can import `Tables<'profiles'>`
 * etc. without compile errors.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          display_name: string | null;
          locale: string | null;
          age: number | null;
          gender: string | null;
          height_cm: number | null;
          weight_kg: number | null;
          fitness_level: string | null;
          training_location: string | null;
          gym_chain: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          goal_type: string;
          target_weight_kg: number | null;
          target_weeks: number | null;
          target_event_label: string | null;
          target_event_date: string | null;
          weekly_pace_kg: number | null;
          classification: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["goals"]["Row"]> & {
          user_id: string;
          goal_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["goals"]["Row"]>;
        Relationships: [];
      };
      training_preferences: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          days_per_week: number | null;
          session_duration_min: number | null;
          availability: Json | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["training_preferences"]["Row"]
        > & { user_id: string };
        Update: Partial<
          Database["public"]["Tables"]["training_preferences"]["Row"]
        >;
        Relationships: [];
      };
      diet_preferences: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          restrictions: string[] | null;
          notes: string | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["diet_preferences"]["Row"]
        > & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["diet_preferences"]["Row"]>;
        Relationships: [];
      };
      programs: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          template_id: string | null;
          starts_on: string | null;
          ends_on: string | null;
          status: string;
          payload: Json | null;
        };
        Insert: Partial<Database["public"]["Tables"]["programs"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["programs"]["Row"]>;
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          program_id: string | null;
          scheduled_at: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["workout_sessions"]["Row"]
        > & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["workout_sessions"]["Row"]>;
        Relationships: [];
      };
      workout_logs: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          exercise_key: string;
          set_index: number;
          reps: number | null;
          weight_kg: number | null;
          rpe: number | null;
          notes: string | null;
          logged_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["workout_logs"]["Row"]> & {
          user_id: string;
          session_id: string;
          exercise_key: string;
          set_index: number;
        };
        Update: Partial<Database["public"]["Tables"]["workout_logs"]["Row"]>;
        Relationships: [];
      };
      nutrition_plans: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          calories_target: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          status: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["nutrition_plans"]["Row"]
        > & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["nutrition_plans"]["Row"]>;
        Relationships: [];
      };
      daily_nutrition_logs: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          calories: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["daily_nutrition_logs"]["Row"]
        > & { user_id: string; log_date: string };
        Update: Partial<
          Database["public"]["Tables"]["daily_nutrition_logs"]["Row"]
        >;
        Relationships: [];
      };
      smoothing_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          delta_kcal: number | null;
          spread_days: number | null;
          payload: Json | null;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["smoothing_events"]["Row"]
        > & { user_id: string; event_type: string };
        Update: Partial<Database["public"]["Tables"]["smoothing_events"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
