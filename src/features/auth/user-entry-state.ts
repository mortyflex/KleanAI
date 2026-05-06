import type { User } from "@supabase/supabase-js";

import type { AuthStatus } from "./auth-context";
import type { SavedOnboardingSnapshot } from "../onboarding/onboarding-persistence.service";
import type { OnboardingProfile } from "../../types/profile.types";

/**
 * Discrete, deterministic states the routing layer keys against to decide
 * which screen group the user belongs in. Computed from the auth session,
 * the persisted onboarding snapshot, and the in-memory onboarding draft.
 *
 * The function is intentionally pure — no I/O, no React — so it can be
 * unit-tested exhaustively and reused by any router/gate without coupling
 * to expo-router internals.
 */
export type UserEntryStateKind =
  | "loading"
  | "unauthenticated"
  | "onboarding_in_progress"
  | "requires_account_creation_after_onboarding"
  | "authenticated_profile_complete"
  | "authenticated_profile_incomplete"
  | "error";

export interface UserEntryState {
  kind: UserEntryStateKind;
  user: User | null;
  reason?: string;
}

export interface ResolveUserEntryStateInput {
  authStatus: AuthStatus;
  user: User | null;
  /**
   * Snapshot loaded from Supabase. `undefined` means we have not started
   * loading yet (still loading); `null` means we loaded but found nothing.
   */
  snapshot?: SavedOnboardingSnapshot | null;
  /** Whether the snapshot fetch is still in flight. */
  snapshotLoading?: boolean;
  /** In-memory onboarding draft (null/undefined when not started). */
  onboardingDraft?: Partial<OnboardingProfile> | null;
  /** Last error from snapshot fetch, if any. */
  error?: Error | null;
}

const REQUIRED_PROFILE_FIELDS = [
  "age",
  "gender",
  "height_cm",
  "weight_kg",
  "fitness_level",
  "training_location",
] as const;

/**
 * A profile snapshot is "complete" when the core onboarding answers are
 * saved AND there is a goal recorded. Goal classification ('inconsistent'
 * is still considered saved here — UI surfaces the issue elsewhere).
 */
export function isProfileComplete(snapshot: SavedOnboardingSnapshot): boolean {
  if (!snapshot.profile) return false;
  if (!snapshot.goal) return false;
  for (const field of REQUIRED_PROFILE_FIELDS) {
    if (snapshot.profile[field] === null || snapshot.profile[field] === undefined) {
      return false;
    }
  }
  return true;
}

function hasOnboardingDraft(draft: Partial<OnboardingProfile> | null | undefined): boolean {
  if (!draft) return false;
  // Any meaningful onboarding answer counts as in-progress.
  return Boolean(
    draft.goal ||
      draft.age !== undefined ||
      draft.heightCm !== undefined ||
      draft.weightKg !== undefined ||
      draft.fitnessLevel ||
      draft.trainingLocation ||
      draft.trainingDaysPerWeek !== undefined,
  );
}

/**
 * Pure resolver — no React, no I/O. Returns a single discrete state based
 * solely on its inputs so the routing layer can render predictably.
 */
export function resolveUserEntryState(
  input: ResolveUserEntryStateInput,
): UserEntryState {
  const { authStatus, user, snapshot, snapshotLoading, onboardingDraft, error } =
    input;

  if (error) {
    return { kind: "error", user, reason: error.message };
  }

  if (authStatus === "loading") {
    return { kind: "loading", user };
  }

  if (authStatus === "unauthenticated" || !user) {
    if (hasOnboardingDraft(onboardingDraft)) {
      // Draft completed but no account yet → ask for sign up.
      if (onboardingDraft?.isComplete) {
        return { kind: "requires_account_creation_after_onboarding", user };
      }
      return { kind: "onboarding_in_progress", user };
    }
    return { kind: "unauthenticated", user };
  }

  // authStatus === 'authenticated'
  if (snapshotLoading || snapshot === undefined) {
    return { kind: "loading", user };
  }

  if (snapshot && isProfileComplete(snapshot)) {
    return { kind: "authenticated_profile_complete", user };
  }

  return { kind: "authenticated_profile_incomplete", user };
}
