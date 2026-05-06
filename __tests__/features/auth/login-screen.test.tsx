import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import "../../../src/lib/i18n";

import LoginScreen from "../../../app/(auth)/login";
import {
  AuthContext,
  type AuthContextValue,
} from "../../../src/features/auth";

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockIntent: string | undefined;

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ intent: mockIntent }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

function buildAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: "unauthenticated",
    session: null,
    user: null,
    signIn: jest.fn(async () => ({ id: "u1", email: "a@b.com" }) as never),
    signUp: jest.fn(),
    signOut: jest.fn(async () => undefined),
    refresh: jest.fn(async () => undefined),
    ...overrides,
  };
}

function renderLogin(overrides: Partial<AuthContextValue> = {}) {
  const auth = buildAuth(overrides);
  return {
    auth,
    ...render(
      <AuthContext.Provider value={auth}>
        <LoginScreen />
      </AuthContext.Provider>,
    ),
  };
}

describe("LoginScreen", () => {
  beforeEach(() => {
    mockIntent = undefined;
    mockReplace.mockClear();
    mockPush.mockClear();
  });

  it("renders title, fields, and submit button", () => {
    renderLogin();
    expect(screen.getByText("Welcome back")).toBeTruthy();
    expect(screen.getByTestId("login-email-input")).toBeTruthy();
    expect(screen.getByTestId("login-password-input")).toBeTruthy();
    expect(screen.getByTestId("login-submit")).toBeTruthy();
    // Existing users land here directly from the auth landing — the screen
    // points new users to onboarding rather than offering a register link.
    expect(screen.getByText("Start the onboarding")).toBeTruthy();
  });

  it("shows validation errors when fields are empty", async () => {
    renderLogin();
    fireEvent.press(screen.getByTestId("login-submit"));
    await waitFor(() => {
      expect(screen.getByText("Please enter your email.")).toBeTruthy();
      expect(screen.getByText("Please enter a password.")).toBeTruthy();
    });
  });

  it("rejects an obviously invalid email", async () => {
    renderLogin();
    fireEvent.changeText(screen.getByTestId("login-email-input"), "not-an-email");
    fireEvent.changeText(screen.getByTestId("login-password-input"), "supersecret");
    fireEvent.press(screen.getByTestId("login-submit"));
    await waitFor(() => {
      expect(screen.getByText("That doesn't look like a valid email.")).toBeTruthy();
    });
  });

  it("calls signIn and navigates to (tabs) on success", async () => {
    const { auth } = renderLogin();
    fireEvent.changeText(screen.getByTestId("login-email-input"), "a@b.com");
    fireEvent.changeText(screen.getByTestId("login-password-input"), "secret123");
    fireEvent.press(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(auth.signIn).toHaveBeenCalledWith("a@b.com", "secret123");
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("navigates back to summary with autoSave when intent=save-onboarding", async () => {
    mockIntent = "save-onboarding";
    const { auth } = renderLogin();
    fireEvent.changeText(screen.getByTestId("login-email-input"), "a@b.com");
    fireEvent.changeText(screen.getByTestId("login-password-input"), "secret123");
    fireEvent.press(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(auth.signIn).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith(
        "/(onboarding)/summary?autoSave=1",
      );
    });
  });

  it("alerts when signIn rejects", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const failingSignIn = jest.fn(async () => {
      throw new Error("Invalid login credentials");
    });
    renderLogin({ signIn: failingSignIn });

    fireEvent.changeText(screen.getByTestId("login-email-input"), "a@b.com");
    fireEvent.changeText(screen.getByTestId("login-password-input"), "secret123");
    fireEvent.press(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(failingSignIn).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalled();
    });
    alertSpy.mockRestore();
  });
});
