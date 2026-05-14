import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import "../../../src/lib/i18n";

import RegisterScreen from "../../../app/(auth)/register";
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

const FAKE_SESSION = {
  access_token: "tok",
  refresh_token: "rtok",
  user: { id: "u1", email: "a@b.com" },
};

function buildAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: "unauthenticated",
    session: null,
    user: null,
    signIn: jest.fn(),
    signUp: jest.fn(async () => ({
      user: { id: "u1", email: "a@b.com" },
      session: FAKE_SESSION,
    }) as never),
    signOut: jest.fn(async () => undefined),
    refresh: jest.fn(async () => undefined),
    ...overrides,
  };
}

function renderRegister(overrides: Partial<AuthContextValue> = {}) {
  const auth = buildAuth(overrides);
  return {
    auth,
    ...render(
      <AuthContext.Provider value={auth}>
        <RegisterScreen />
      </AuthContext.Provider>,
    ),
  };
}

function fillForm({
  email = "a@b.com",
  password = "secret123",
  confirm = "secret123",
}: { email?: string; password?: string; confirm?: string } = {}) {
  fireEvent.changeText(screen.getByTestId("register-email-input"), email);
  fireEvent.changeText(screen.getByTestId("register-password-input"), password);
  fireEvent.changeText(
    screen.getByTestId("register-password-confirm-input"),
    confirm,
  );
}

describe("RegisterScreen", () => {
  beforeEach(() => {
    mockIntent = undefined;
    mockReplace.mockClear();
    mockPush.mockClear();
  });

  it("renders default title, fields, confirm field, and submit button without onboarding intent", () => {
    renderRegister();
    expect(screen.getByText("Create your account")).toBeTruthy();
    expect(screen.getByTestId("register-email-input")).toBeTruthy();
    expect(screen.getByTestId("register-password-input")).toBeTruthy();
    expect(screen.getByTestId("register-password-confirm-input")).toBeTruthy();
    expect(screen.getByTestId("register-submit")).toBeTruthy();
    expect(screen.queryByTestId("register-benefits")).toBeNull();
  });

  it("shows the benefits panel when intent=save-onboarding (post-onboarding flow)", () => {
    mockIntent = "save-onboarding";
    renderRegister();
    expect(screen.getByText("Save your plan")).toBeTruthy();
    expect(screen.getByTestId("register-benefits")).toBeTruthy();
    expect(screen.getByText("Why create an account")).toBeTruthy();
  });

  it("starts both password fields masked and reveals the password when the eye is pressed", () => {
    renderRegister();
    const pw = screen.getByTestId("register-password-input");
    const confirm = screen.getByTestId("register-password-confirm-input");
    expect(pw.props.secureTextEntry).toBe(true);
    expect(confirm.props.secureTextEntry).toBe(true);

    fireEvent.press(screen.getByTestId("register-password-toggle"));
    expect(screen.getByTestId("register-password-input").props.secureTextEntry).toBe(false);
    // The confirm field is independent — still hidden.
    expect(
      screen.getByTestId("register-password-confirm-input").props.secureTextEntry,
    ).toBe(true);
  });

  it("rejects too-short passwords", async () => {
    renderRegister();
    fillForm({ password: "abc", confirm: "abc" });
    fireEvent.press(screen.getByTestId("register-submit"));
    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters."),
      ).toBeTruthy();
    });
  });

  it("rejects mismatched confirmation password", async () => {
    const { auth } = renderRegister();
    fillForm({ password: "secret123", confirm: "secret124" });
    fireEvent.press(screen.getByTestId("register-submit"));
    await waitFor(() => {
      expect(
        screen.getByText("Passwords don't match. Try again."),
      ).toBeTruthy();
    });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("requires the confirm password to be filled", async () => {
    const { auth } = renderRegister();
    fillForm({ confirm: "" });
    fireEvent.press(screen.getByTestId("register-submit"));
    await waitFor(() => {
      expect(
        screen.getByText("Please confirm your password."),
      ).toBeTruthy();
    });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("calls signUp and routes to (tabs) on success", async () => {
    const { auth } = renderRegister();
    fillForm();
    fireEvent.press(screen.getByTestId("register-submit"));

    await waitFor(() => {
      expect(auth.signUp).toHaveBeenCalledWith("a@b.com", "secret123");
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("routes to the summary recap when intent=save-onboarding so the user can review their plan", async () => {
    mockIntent = "save-onboarding";
    renderRegister();
    fillForm();
    fireEvent.press(screen.getByTestId("register-submit"));
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(onboarding)/summary");
    });
  });

  it("does NOT navigate forward when signUp returns no session (email-confirmation or already-registered)", async () => {
    mockIntent = "save-onboarding";
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const noSessionSignUp = jest.fn(async () => ({
      user: { id: "u1", email: "a@b.com" },
      session: null,
    }) as never);
    renderRegister({ signUp: noSessionSignUp });

    fillForm();
    fireEvent.press(screen.getByTestId("register-submit"));

    await waitFor(() => {
      expect(noSessionSignUp).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalled();
    });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
