import type { OnboardingProfile } from "../../types/profile.types";
import type {
  Database,
  TablesInsert,
} from "../../types/database.types";
import { getSupabase, type KleanSupabaseClient } from "../../lib/supabase";
import { classifyGoal } from "../../utils/goal-classification";

export interface PersistenceMeta {
  /** Optional display name (locally derived — not collected in onboarding yet). */
  displayName?: string | null;
  /** Locale code (e.g. 'en', 'fr'). */
  locale?: string | null;
}

export interface OnboardingPersistResult {
  profile: TablesInsert<"profiles">;
  goal: TablesInsert<"goals"> | null;
  trainingPreferences: TablesInsert<"training_preferences"> | null;
  dietPreferences: TablesInsert<"diet_preferences"> | null;
}

export interface SavedOnboardingSnapshot {
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
  goal: Database["public"]["Tables"]["goals"]["Row"] | null;
  trainingPreferences:
    | Database["public"]["Tables"]["training_preferences"]["Row"]
    | null;
  dietPreferences:
    | Database["public"]["Tables"]["diet_preferences"]["Row"]
    | null;
}

/**
 * Pure mapper — turns the in-memory onboarding profile into the row payloads
 * we will write to Supabase. Kept separate from the I/O layer so it can be
 * unit-tested deterministically without mocking the network.
 *
 * `userId` always comes from the authenticated session, not from user input —
 * this is what RLS (`auth.uid() = id` / `auth.uid() = user_id`) keys against.
 */
export function buildOnboardingPayloads(
  userId: string,
  profile: Partial<OnboardingProfile>,
  meta: PersistenceMeta = {},
): OnboardingPersistResult {
  const profileRow: TablesInsert<"profiles"> = {
    id: userId,
    display_name: meta.displayName ?? null,
    locale: meta.locale ?? null,
    age: profile.age ?? null,
    gender: profile.gender ?? null,
    height_cm: profile.heightCm ?? null,
    weight_kg: profile.weightKg ?? null,
    fitness_level: profile.fitnessLevel ?? null,
    training_location: profile.trainingLocation ?? null,
    gym_chain: profile.gymChain ?? null,
  };

  let goalRow: TablesInsert<"goals"> | null = null;
  if (profile.goal) {
    let weeklyPaceKg: number | null = null;
    let classification: string | null = null;
    if (
      profile.age !== undefined &&
      profile.gender !== undefined &&
      profile.weightKg !== undefined &&
      profile.heightCm !== undefined &&
      profile.trainingDaysPerWeek !== undefined
    ) {
      const result = classifyGoal({
        goal: profile.goal,
        age: profile.age,
        gender: profile.gender,
        weightKg: profile.weightKg,
        heightCm: profile.heightCm,
        targetWeightKg: profile.targetWeightKg,
        targetTimeframeWeeks: profile.targetTimeframe?.durationWeeks,
        trainingDaysPerWeek: profile.trainingDaysPerWeek,
      });
      weeklyPaceKg = Number.isFinite(result.weeklyChangeKg)
        ? Number(result.weeklyChangeKg.toFixed(2))
        : null;
      classification = result.kind;
    }

    goalRow = {
      user_id: userId,
      goal_type: profile.goal,
      target_weight_kg: profile.targetWeightKg ?? null,
      target_weeks: profile.targetTimeframe?.durationWeeks ?? null,
      target_event_label: profile.targetTimeframe?.eventLabel ?? null,
      target_event_date: null,
      weekly_pace_kg: weeklyPaceKg,
      classification,
    };
  }

  let trainingRow: TablesInsert<"training_preferences"> | null = null;
  if (
    profile.trainingDaysPerWeek !== undefined ||
    profile.sessionDurationMin !== undefined ||
    profile.weeklyAvailability !== undefined
  ) {
    trainingRow = {
      user_id: userId,
      days_per_week: profile.trainingDaysPerWeek ?? null,
      session_duration_min: profile.sessionDurationMin ?? null,
      availability: profile.weeklyAvailability
        ? (profile.weeklyAvailability as unknown as Database["public"]["Tables"]["training_preferences"]["Row"]["availability"])
        : null,
    };
  }

  let dietRow: TablesInsert<"diet_preferences"> | null = null;
  if (profile.dietaryRestrictions !== undefined) {
    dietRow = {
      user_id: userId,
      restrictions: profile.dietaryRestrictions ?? [],
      notes: null,
    };
  }

  return {
    profile: profileRow,
    goal: goalRow,
    trainingPreferences: trainingRow,
    dietPreferences: dietRow,
  };
}

export interface OnboardingPersistenceService {
  saveOnboardingProfile: (
    userId: string,
    profile: Partial<OnboardingProfile>,
    meta?: PersistenceMeta,
  ) => Promise<OnboardingPersistResult>;
  loadSnapshot: (userId: string) => Promise<SavedOnboardingSnapshot>;
}

/**
 * Writes the onboarding profile to Supabase using the authenticated client.
 * RLS protects rows: `auth.uid()` must equal `userId` for every insert/update.
 */
export function createOnboardingPersistenceService(
  clientFactory: () => KleanSupabaseClient = getSupabase,
): OnboardingPersistenceService {
  return {
    async saveOnboardingProfile(userId, profile, meta) {
      if (!userId) throw new Error("userId required");
      const payloads = buildOnboardingPayloads(userId, profile, meta);
      const client = clientFactory();

      const profileRes = await client
        .from("profiles")
        .upsert(payloads.profile, { onConflict: "id" });
      if (profileRes.error) throw profileRes.error;

      if (payloads.goal) {
        // Goals don't have a unique on user_id (we keep history). Insert a
        // fresh row each time onboarding is finalised — the latest row wins.
        const goalRes = await client.from("goals").insert(payloads.goal);
        if (goalRes.error) throw goalRes.error;
      }

      if (payloads.trainingPreferences) {
        const trainingRes = await client
          .from("training_preferences")
          .upsert(payloads.trainingPreferences, { onConflict: "user_id" });
        if (trainingRes.error) throw trainingRes.error;
      }

      if (payloads.dietPreferences) {
        const dietRes = await client
          .from("diet_preferences")
          .upsert(payloads.dietPreferences, { onConflict: "user_id" });
        if (dietRes.error) throw dietRes.error;
      }

      return payloads;
    },

    async loadSnapshot(userId) {
      if (!userId) throw new Error("userId required");
      const client = clientFactory();

      const [profileRes, goalRes, trainingRes, dietRes] = await Promise.all([
        client.from("profiles").select("*").eq("id", userId).maybeSingle(),
        client
          .from("goals")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        client
          .from("training_preferences")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        client
          .from("diet_preferences")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (goalRes.error) throw goalRes.error;
      if (trainingRes.error) throw trainingRes.error;
      if (dietRes.error) throw dietRes.error;

      return {
        profile: profileRes.data,
        goal: goalRes.data,
        trainingPreferences: trainingRes.data,
        dietPreferences: dietRes.data,
      };
    },
  };
}

export const onboardingPersistenceService = createOnboardingPersistenceService();
