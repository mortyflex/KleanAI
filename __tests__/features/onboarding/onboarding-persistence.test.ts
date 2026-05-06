import {
  buildOnboardingPayloads,
  createOnboardingPersistenceService,
} from "../../../src/features/onboarding/onboarding-persistence.service";
import type { OnboardingProfile } from "../../../src/types/profile.types";

const FULL_PROFILE: Partial<OnboardingProfile> = {
  goal: "lose_weight",
  age: 28,
  gender: "female",
  heightCm: 168,
  weightKg: 70,
  targetWeightKg: 65,
  targetTimeframe: { durationWeeks: 12, eventLabel: "vacation" },
  fitnessLevel: "intermediate",
  trainingDaysPerWeek: 3,
  sessionDurationMin: 45,
  trainingLocation: "gym",
  gymChain: "basic_fit",
  dietaryRestrictions: ["vegetarian"],
  weeklyAvailability: { slots: { 0: ["morning"], 2: ["evening"] } },
};

describe("buildOnboardingPayloads", () => {
  it("uses the auth userId for every row (never the input)", () => {
    const result = buildOnboardingPayloads("auth-user-1", FULL_PROFILE);
    expect(result.profile.id).toBe("auth-user-1");
    expect(result.goal?.user_id).toBe("auth-user-1");
    expect(result.trainingPreferences?.user_id).toBe("auth-user-1");
    expect(result.dietPreferences?.user_id).toBe("auth-user-1");
  });

  it("maps profile fields verbatim from the onboarding state", () => {
    const result = buildOnboardingPayloads("u1", FULL_PROFILE, {
      locale: "fr",
      displayName: "Lina",
    });
    expect(result.profile).toMatchObject({
      id: "u1",
      display_name: "Lina",
      locale: "fr",
      age: 28,
      gender: "female",
      height_cm: 168,
      weight_kg: 70,
      fitness_level: "intermediate",
      training_location: "gym",
      gym_chain: "basic_fit",
    });
  });

  it("maps goal fields including event label and a deterministic classification", () => {
    const result = buildOnboardingPayloads("u1", FULL_PROFILE);
    expect(result.goal).toMatchObject({
      user_id: "u1",
      goal_type: "lose_weight",
      target_weight_kg: 65,
      target_weeks: 12,
      target_event_label: "vacation",
    });
    // The classifier is deterministic — for this safe profile it should be valid.
    expect(result.goal?.classification).toBe("valid");
    // 5 kg / 12 weeks ≈ 0.42 kg/week
    expect(result.goal?.weekly_pace_kg).toBeCloseTo(0.42, 1);
  });

  it("maps training preferences with availability JSON", () => {
    const result = buildOnboardingPayloads("u1", FULL_PROFILE);
    expect(result.trainingPreferences).toEqual({
      user_id: "u1",
      days_per_week: 3,
      session_duration_min: 45,
      availability: { slots: { 0: ["morning"], 2: ["evening"] } },
    });
  });

  it("maps diet preferences with the restrictions array", () => {
    const result = buildOnboardingPayloads("u1", FULL_PROFILE);
    expect(result.dietPreferences).toEqual({
      user_id: "u1",
      restrictions: ["vegetarian"],
      notes: null,
    });
  });

  it("returns null for goal when no goal is selected yet", () => {
    const partial: Partial<OnboardingProfile> = { age: 28 };
    const result = buildOnboardingPayloads("u1", partial);
    expect(result.goal).toBeNull();
  });

  it("returns null for diet preferences when restrictions weren't collected", () => {
    const partial: Partial<OnboardingProfile> = { goal: "maintain", age: 30 };
    const result = buildOnboardingPayloads("u1", partial);
    expect(result.dietPreferences).toBeNull();
  });
});

describe("createOnboardingPersistenceService.saveOnboardingProfile", () => {
  function buildClient() {
    const upsertMock = jest.fn(async () => ({ error: null }));
    const insertMock = jest.fn(async () => ({ error: null }));
    const fromMock = jest.fn((_table: string) => ({
      upsert: upsertMock,
      insert: insertMock,
    }));
    return { fromMock, upsertMock, insertMock };
  }

  it("upserts profile/training/diet on the authed userId and inserts the goal", async () => {
    const { fromMock, upsertMock, insertMock } = buildClient();
    const factory = () => ({ from: fromMock }) as never;
    const svc = createOnboardingPersistenceService(factory);

    await svc.saveOnboardingProfile("auth-user-1", FULL_PROFILE, { locale: "fr" });

    const tablesTouched = fromMock.mock.calls.map((c) => c[0]);
    expect(tablesTouched).toEqual(
      expect.arrayContaining([
        "profiles",
        "goals",
        "training_preferences",
        "diet_preferences",
      ]),
    );
    // Profile upsert keyed on id
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "auth-user-1" }),
      { onConflict: "id" },
    );
    // Goal insert (no unique constraint on user_id so we keep history)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "auth-user-1",
        goal_type: "lose_weight",
      }),
    );
    // Training + diet upsert keyed on user_id
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "auth-user-1",
        days_per_week: 3,
      }),
      { onConflict: "user_id" },
    );
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "auth-user-1",
        restrictions: ["vegetarian"],
      }),
      { onConflict: "user_id" },
    );
  });

  it("throws if any write returns an error", async () => {
    const upsertMock = jest.fn(async () => ({
      error: { message: "rls denied" },
    }));
    const fromMock = jest.fn(() => ({
      upsert: upsertMock,
      insert: jest.fn(async () => ({ error: null })),
    }));
    const svc = createOnboardingPersistenceService(
      () => ({ from: fromMock }) as never,
    );

    await expect(
      svc.saveOnboardingProfile("u1", FULL_PROFILE),
    ).rejects.toMatchObject({ message: "rls denied" });
  });

  it("throws when called with an empty userId", async () => {
    const svc = createOnboardingPersistenceService(
      () => ({ from: jest.fn() }) as never,
    );
    await expect(svc.saveOnboardingProfile("", FULL_PROFILE)).rejects.toThrow();
  });
});
