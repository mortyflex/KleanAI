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
let mockAutoSave: string | undefined;

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ autoSave: mockAutoSave }),
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
  autoSave,
}: {
  authStatus: AuthContextValue["status"];
  user: AuthContextValue["user"];
  autoSave?: string;
}) {
  mockAutoSave = autoSave;
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

describe("SummaryScreen — onboarding gate", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    mockSave.mockReset();
    mockSave.mockResolvedValue(undefined);
    mockAutoSave = undefined;
  });

  it("redirects to /(auth)/register when unauthenticated and CTA is pressed", async () => {
    renderSummary({ authStatus: "unauthenticated", user: null });
    fireEvent.press(screen.getByTestId("generate-plan-cta"));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        "/(auth)/register?intent=save-onboarding",
      );
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  it("calls saveOnboardingProfile with the auth user id when authenticated", async () => {
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

  it("auto-saves once on mount when autoSave=1 and user is authenticated", async () => {
    renderSummary({
      authStatus: "authenticated",
      user: { id: "auth-user-1", email: "a@b.com" } as never,
      autoSave: "1",
    });
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockSave.mock.calls[0][0]).toBe("auth-user-1");
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("does not auto-save when autoSave=1 but user is still unauthenticated", async () => {
    renderSummary({
      authStatus: "unauthenticated",
      user: null,
      autoSave: "1",
    });
    // Give effects a tick; the persistence call must not fire.
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSave).not.toHaveBeenCalled();
  });
});
