import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import "../../../src/lib/i18n";

import ProfileScreen from "../../../app/(tabs)/profile";
import {
  AuthContext,
  type AuthContextValue,
} from "../../../src/features/auth";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));

const mockLoadSnapshot = jest.fn();
jest.mock(
  "../../../src/features/onboarding/onboarding-persistence.service",
  () => ({
    onboardingPersistenceService: {
      saveOnboardingProfile: jest.fn(),
      loadSnapshot: (userId: string) => mockLoadSnapshot(userId),
    },
  }),
);

const mockGetUnit = jest.fn();
const mockSetUnit = jest.fn();
jest.mock(
  "../../../src/features/profile/preferences-storage",
  () => ({
    APP_VERSION: "0.7.2",
    preferencesStorage: {
      getUnitSystem: () => mockGetUnit(),
      setUnitSystem: (v: string) => mockSetUnit(v),
    },
  }),
);

const FAKE_USER = { id: "user-1", email: "user@example.com" } as never;

const SNAPSHOT_FULL = {
  profile: {
    id: "user-1",
    age: 28,
    gender: "female",
    height_cm: 168,
    weight_kg: 70,
    fitness_level: "intermediate",
    training_location: "gym",
    gym_chain: null,
    locale: "en",
    display_name: null,
    created_at: "now",
    updated_at: "now",
  },
  goal: {
    id: "g1",
    user_id: "user-1",
    goal_type: "lose_weight",
    target_weight_kg: 65,
    target_weeks: 12,
    target_event_label: null,
    target_event_date: null,
    weekly_pace_kg: 0.4,
    classification: "valid",
    created_at: "now",
    updated_at: "now",
  },
  trainingPreferences: null,
  dietPreferences: null,
};

function buildAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: "authenticated",
    session: { access_token: "tok", refresh_token: "rtok", user: FAKE_USER } as never,
    user: FAKE_USER,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(async () => undefined),
    refresh: jest.fn(async () => undefined),
    ...overrides,
  };
}

function renderProfile(overrides: Partial<AuthContextValue> = {}) {
  const auth = buildAuth(overrides);
  return {
    auth,
    ...render(
      <AuthContext.Provider value={auth}>
        <ProfileScreen />
      </AuthContext.Provider>,
    ),
  };
}

describe("ProfileScreen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockLoadSnapshot.mockReset();
    mockLoadSnapshot.mockResolvedValue(SNAPSHOT_FULL);
    mockGetUnit.mockReset();
    mockGetUnit.mockResolvedValue("metric");
    mockSetUnit.mockReset();
    mockSetUnit.mockResolvedValue(undefined);
  });

  it("shows the user email", async () => {
    renderProfile();
    await waitFor(() =>
      expect(screen.getByText("user@example.com")).toBeTruthy(),
    );
  });

  it("loads the saved snapshot and shows goal classification", async () => {
    renderProfile();
    await waitFor(() => {
      expect(mockLoadSnapshot).toHaveBeenCalledWith("user-1");
      expect(screen.getByTestId("profile-classification")).toBeTruthy();
    });
  });

  it("opens the sign-out confirmation modal when the sign-out button is pressed", async () => {
    renderProfile();
    fireEvent.press(screen.getByTestId("profile-sign-out"));
    await waitFor(() =>
      expect(screen.getByTestId("sign-out-confirm")).toBeTruthy(),
    );
    expect(screen.getByTestId("sign-out-cancel")).toBeTruthy();
    expect(screen.getByTestId("sign-out-confirm-button")).toBeTruthy();
  });

  it("dismisses the modal when 'Stay signed in' is pressed and never calls signOut", async () => {
    const { auth } = renderProfile();
    fireEvent.press(screen.getByTestId("profile-sign-out"));
    await waitFor(() =>
      expect(screen.getByTestId("sign-out-confirm")).toBeTruthy(),
    );
    fireEvent.press(screen.getByTestId("sign-out-cancel"));
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("calls signOut and redirects to landing after confirmation", async () => {
    const { auth } = renderProfile();
    fireEvent.press(screen.getByTestId("profile-sign-out"));
    await waitFor(() =>
      expect(screen.getByTestId("sign-out-confirm")).toBeTruthy(),
    );
    fireEvent.press(screen.getByTestId("sign-out-confirm-button"));
    await waitFor(() => {
      expect(auth.signOut).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith("/(auth)/landing");
    });
  });

  it("persists the unit preference when toggled", async () => {
    renderProfile();
    await waitFor(() => expect(mockGetUnit).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId("profile-unit-imperial"));
    await waitFor(() => expect(mockSetUnit).toHaveBeenCalledWith("imperial"));
  });
});
