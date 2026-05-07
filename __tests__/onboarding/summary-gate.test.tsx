import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import "../../src/lib/i18n";

import SummaryScreen from "../../app/(onboarding)/summary";
import { OnboardingContext } from "../../src/features/onboarding/onboarding-context";
import {
  AuthContext,
  type AuthContextValue,
} from "../../src/features/auth";
import type { OnboardingProfile } from "../../src/types/profile.types";

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: jest.fn() }),
}));

const mockSave: jest.Mock = jest.fn();
jest.mock(
  "../../src/features/onboarding/onboarding-persistence.service",
  () => ({
    onboardingPersistenceService: {
      saveOnboardingProfile: (
        userId: string,
        profile: unknown,
        meta?: unknown,
      ) => mockSave(userId, profile, meta),
      loadSnapshot: jest.fn(),
    },
  }),
);

const FILLED_PROFILE: Partial<OnboardingProfile> = {
  goal: "lose_weight",
  age: 28,
  gender: "female",
  weightKg: 70,
  heightCm: 168,
  targetWeightKg: 65,
  trainingDaysPerWeek: 3,
  sessionDurationMin: 45,
  fitnessLevel: "intermediate",
  trainingLocation: "gym",
  dietaryRestrictions: ["vegetarian"],
};

function renderSummary({
  authStatus,
  user,
}: {
  authStatus: AuthContextValue["status"];
  user: AuthContextValue["user"];
}) {
  const auth: AuthContextValue = {
    status: authStatus,
    session: user
      ? ({
          access_token: "tok",
          refresh_token: "rtok",
          user,
        } as never)
      : null,
    user,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(async () => undefined),
    refresh: jest.fn(async () => undefined),
  };
  return render(
    <AuthContext.Provider value={auth}>
      <OnboardingContext.Provider
        value={{
          profile: FILLED_PROFILE,
          updateProfile: jest.fn(),
          resetProfile: jest.fn(),
        }}
      >
        <SummaryScreen />
      </OnboardingContext.Provider>
    </AuthContext.Provider>,
  );
}

describe("SummaryScreen — gated by safety-review, never auto-saves", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    mockSave.mockReset();
    mockSave.mockResolvedValue(undefined);
  });

  it("calls saveOnboardingProfile with the auth user id and routes to (tabs) when CTA pressed", async () => {
    renderSummary({
      authStatus: "authenticated",
      user: { id: "auth-user-1", email: "a@b.com" } as never,
    });
    fireEvent.press(screen.getByTestId("generate-plan-cta"));
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockSave.mock.calls[0][0]).toBe("auth-user-1");
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("does not auto-save on mount even when authenticated", async () => {
    renderSummary({
      authStatus: "authenticated",
      user: { id: "auth-user-1", email: "a@b.com" } as never,
    });
    // Give effects a tick — the user must press the CTA themselves.
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("safety-net: bounces unauthenticated user to /(auth)/register if they reach summary", async () => {
    renderSummary({ authStatus: "unauthenticated", user: null });
    fireEvent.press(screen.getByTestId("generate-plan-cta"));
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        "/(auth)/register?intent=save-onboarding",
      );
      expect(mockSave).not.toHaveBeenCalled();
    });
  });
});
