import {
  resolveUserEntryState,
  isProfileComplete,
} from "../../../src/features/auth/user-entry-state";
import type { SavedOnboardingSnapshot } from "../../../src/features/onboarding/onboarding-persistence.service";

const FAKE_USER = { id: "u1", email: "a@b.com" } as never;

const fullProfileRow = {
  id: "u1",
  created_at: "now",
  updated_at: "now",
  display_name: null,
  locale: "en",
  age: 28,
  gender: "female",
  height_cm: 168,
  weight_kg: 70,
  fitness_level: "intermediate",
  training_location: "gym",
  gym_chain: null,
};

const fullGoalRow = {
  id: "g1",
  user_id: "u1",
  created_at: "now",
  updated_at: "now",
  goal_type: "lose_weight",
  target_weight_kg: 65,
  target_weeks: 12,
  target_event_label: null,
  target_event_date: null,
  weekly_pace_kg: 0.4,
  classification: "valid",
};

const completeSnapshot: SavedOnboardingSnapshot = {
  profile: fullProfileRow,
  goal: fullGoalRow,
  trainingPreferences: null,
  dietPreferences: null,
};

describe("resolveUserEntryState", () => {
  it("returns 'loading' while auth is loading", () => {
    expect(
      resolveUserEntryState({ authStatus: "loading", user: null }).kind,
    ).toBe("loading");
  });

  it("returns 'unauthenticated' for no user with no onboarding draft", () => {
    expect(
      resolveUserEntryState({ authStatus: "unauthenticated", user: null }).kind,
    ).toBe("unauthenticated");
  });

  it("returns 'onboarding_in_progress' when draft has answers but not complete", () => {
    expect(
      resolveUserEntryState({
        authStatus: "unauthenticated",
        user: null,
        onboardingDraft: { goal: "lose_weight" },
      }).kind,
    ).toBe("onboarding_in_progress");
  });

  it("returns 'requires_account_creation_after_onboarding' when draft is complete and unauthenticated", () => {
    expect(
      resolveUserEntryState({
        authStatus: "unauthenticated",
        user: null,
        onboardingDraft: { goal: "lose_weight", isComplete: true },
      }).kind,
    ).toBe("requires_account_creation_after_onboarding");
  });

  it("returns 'loading' for authenticated user while snapshot is in flight", () => {
    expect(
      resolveUserEntryState({
        authStatus: "authenticated",
        user: FAKE_USER,
        snapshotLoading: true,
      }).kind,
    ).toBe("loading");
  });

  it("returns 'authenticated_profile_complete' for authenticated user with full snapshot", () => {
    expect(
      resolveUserEntryState({
        authStatus: "authenticated",
        user: FAKE_USER,
        snapshot: completeSnapshot,
      }).kind,
    ).toBe("authenticated_profile_complete");
  });

  it("returns 'authenticated_profile_incomplete' when profile row is missing fields", () => {
    expect(
      resolveUserEntryState({
        authStatus: "authenticated",
        user: FAKE_USER,
        snapshot: {
          ...completeSnapshot,
          profile: { ...fullProfileRow, weight_kg: null },
        },
      }).kind,
    ).toBe("authenticated_profile_incomplete");
  });

  it("returns 'authenticated_profile_incomplete' when goal is missing", () => {
    expect(
      resolveUserEntryState({
        authStatus: "authenticated",
        user: FAKE_USER,
        snapshot: { ...completeSnapshot, goal: null },
      }).kind,
    ).toBe("authenticated_profile_incomplete");
  });

  it("returns 'error' when an error is provided", () => {
    expect(
      resolveUserEntryState({
        authStatus: "authenticated",
        user: FAKE_USER,
        error: new Error("network down"),
      }).kind,
    ).toBe("error");
  });
});

describe("isProfileComplete", () => {
  it("is true for a fully filled snapshot", () => {
    expect(isProfileComplete(completeSnapshot)).toBe(true);
  });

  it("is false when any required field is null", () => {
    expect(
      isProfileComplete({
        ...completeSnapshot,
        profile: { ...fullProfileRow, age: null },
      }),
    ).toBe(false);
  });

  it("is false without a goal", () => {
    expect(isProfileComplete({ ...completeSnapshot, goal: null })).toBe(false);
  });
});
