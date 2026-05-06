import React from "react";
import { Text } from "react-native";
import { render, act, waitFor } from "@testing-library/react-native";

import {
  AuthContext,
  AuthProvider,
  useAuth,
  type AuthContextValue,
  type AuthService,
} from "../../../src/features/auth";

function buildService(overrides: Partial<AuthService> = {}): AuthService {
  const base: AuthService = {
    signInWithPassword: jest.fn(),
    signUpWithPassword: jest.fn(),
    signOut: jest.fn(async () => undefined),
    getSession: jest.fn(async () => null),
    getCurrentUser: jest.fn(async () => null),
    onAuthStateChange: jest.fn(() => ({
      unsubscribe: jest.fn(),
    })) as unknown as AuthService["onAuthStateChange"],
  };
  return { ...base, ...overrides };
}

const FAKE_USER = { id: "u1", email: "a@b.com" } as const;
const FAKE_SESSION = {
  access_token: "tok",
  refresh_token: "rtok",
  user: FAKE_USER,
} as const;

interface Handle {
  status: string;
  ctx: React.MutableRefObject<AuthContextValue | null>;
}

function Probe({ handle }: { handle: Handle }) {
  const ctx = useAuth();
  handle.ctx.current = ctx;
  return <Text testID="probe-status">{ctx.status}</Text>;
}

function setup(service: AuthService) {
  const ctxRef: React.MutableRefObject<AuthContextValue | null> = {
    current: null,
  };
  const handle: Handle = { status: "loading", ctx: ctxRef };
  const utils = render(
    <AuthProvider service={service}>
      <Probe handle={handle} />
    </AuthProvider>,
  );
  return { ...utils, ctxRef };
}

describe("AuthProvider", () => {
  it("starts in loading and resolves to unauthenticated when no session", async () => {
    const service = buildService();
    const { getByTestId } = setup(service);
    await waitFor(() => {
      expect(getByTestId("probe-status").props.children).toBe("unauthenticated");
    });
    expect(service.getSession).toHaveBeenCalled();
    expect(service.onAuthStateChange).toHaveBeenCalled();
  });

  it("resolves to authenticated when getSession returns a session", async () => {
    const service = buildService({
      getSession: jest.fn(async () => FAKE_SESSION as never),
    });
    const { getByTestId, ctxRef } = setup(service);
    await waitFor(() => {
      expect(getByTestId("probe-status").props.children).toBe("authenticated");
    });
    expect(ctxRef.current?.user?.email).toBe("a@b.com");
  });

  it("signIn delegates to the service and flips status to authenticated", async () => {
    const signInMock = jest.fn(async () => ({
      user: FAKE_USER as never,
      session: FAKE_SESSION as never,
    }));
    const service = buildService({
      signInWithPassword:
        signInMock as unknown as AuthService["signInWithPassword"],
    });
    const { getByTestId, ctxRef } = setup(service);

    await waitFor(() =>
      expect(getByTestId("probe-status").props.children).toBe(
        "unauthenticated",
      ),
    );

    await act(async () => {
      await ctxRef.current!.signIn("a@b.com", "secret123");
    });

    expect(signInMock).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "secret123",
    });
    await waitFor(() =>
      expect(getByTestId("probe-status").props.children).toBe("authenticated"),
    );
  });

  it("signOut delegates to the service and flips status to unauthenticated", async () => {
    const signOutMock = jest.fn(async () => undefined);
    const service = buildService({
      getSession: jest.fn(async () => FAKE_SESSION as never),
      signOut: signOutMock,
    });
    const { getByTestId, ctxRef } = setup(service);

    await waitFor(() =>
      expect(getByTestId("probe-status").props.children).toBe("authenticated"),
    );

    await act(async () => {
      await ctxRef.current!.signOut();
    });

    expect(signOutMock).toHaveBeenCalled();
    await waitFor(() =>
      expect(getByTestId("probe-status").props.children).toBe(
        "unauthenticated",
      ),
    );
  });

  it("throws if useAuth is used without a provider", () => {
    function Bare() {
      useAuth();
      return null;
    }
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow(/AuthProvider/);
    errorSpy.mockRestore();
  });

  it("AuthContext value can be injected directly for tests", () => {
    const fake: AuthContextValue = {
      status: "unauthenticated",
      session: null,
      user: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(async () => undefined),
      refresh: jest.fn(async () => undefined),
    };
    function Bare() {
      const ctx = useAuth();
      return <Text>{ctx.status}</Text>;
    }
    const { getByText } = render(
      <AuthContext.Provider value={fake}>
        <Bare />
      </AuthContext.Provider>,
    );
    expect(getByText("unauthenticated")).toBeTruthy();
  });
});
