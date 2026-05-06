import { createAuthService } from "../../../src/features/auth/auth.service";

type AuthMock = {
  signInWithPassword: jest.Mock;
  signUp: jest.Mock;
  signOut: jest.Mock;
  getSession: jest.Mock;
  getUser: jest.Mock;
  onAuthStateChange: jest.Mock;
};

function buildClient(): { auth: AuthMock } {
  return {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  };
}

const FAKE_USER = { id: "user-1", email: "u@x.com" };
const FAKE_SESSION = {
  access_token: "tok",
  refresh_token: "rtok",
  user: FAKE_USER,
};

describe("authService", () => {
  describe("signInWithPassword", () => {
    it("returns user + session on success", async () => {
      const client = buildClient();
      client.auth.signInWithPassword.mockResolvedValue({
        data: { user: FAKE_USER, session: FAKE_SESSION },
        error: null,
      });
      const svc = createAuthService(() => client as never);

      const result = await svc.signInWithPassword({
        email: "u@x.com",
        password: "pw",
      });

      expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "u@x.com",
        password: "pw",
      });
      expect(result).toEqual({ user: FAKE_USER, session: FAKE_SESSION });
    });

    it("throws when supabase returns an error", async () => {
      const client = buildClient();
      client.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });
      const svc = createAuthService(() => client as never);

      await expect(
        svc.signInWithPassword({ email: "u@x.com", password: "bad" }),
      ).rejects.toMatchObject({ message: "Invalid login credentials" });
    });
  });

  describe("signUpWithPassword", () => {
    it("delegates to supabase.auth.signUp and returns the data shape", async () => {
      const client = buildClient();
      client.auth.signUp.mockResolvedValue({
        data: { user: FAKE_USER, session: null },
        error: null,
      });
      const svc = createAuthService(() => client as never);

      const result = await svc.signUpWithPassword({
        email: "u@x.com",
        password: "pw",
      });

      expect(client.auth.signUp).toHaveBeenCalledWith({
        email: "u@x.com",
        password: "pw",
      });
      expect(result.user).toEqual(FAKE_USER);
      expect(result.session).toBeNull();
    });
  });

  describe("signOut", () => {
    it("resolves on success", async () => {
      const client = buildClient();
      client.auth.signOut.mockResolvedValue({ error: null });
      const svc = createAuthService(() => client as never);
      await expect(svc.signOut()).resolves.toBeUndefined();
    });

    it("throws on error", async () => {
      const client = buildClient();
      client.auth.signOut.mockResolvedValue({
        error: { message: "boom" },
      });
      const svc = createAuthService(() => client as never);
      await expect(svc.signOut()).rejects.toMatchObject({ message: "boom" });
    });
  });

  describe("getSession", () => {
    it("returns the session", async () => {
      const client = buildClient();
      client.auth.getSession.mockResolvedValue({
        data: { session: FAKE_SESSION },
        error: null,
      });
      const svc = createAuthService(() => client as never);
      await expect(svc.getSession()).resolves.toBe(FAKE_SESSION);
    });

    it("returns null when no session", async () => {
      const client = buildClient();
      client.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      const svc = createAuthService(() => client as never);
      await expect(svc.getSession()).resolves.toBeNull();
    });
  });

  describe("getCurrentUser", () => {
    it("returns the user when present", async () => {
      const client = buildClient();
      client.auth.getUser.mockResolvedValue({
        data: { user: FAKE_USER },
        error: null,
      });
      const svc = createAuthService(() => client as never);
      await expect(svc.getCurrentUser()).resolves.toBe(FAKE_USER);
    });

    it("swallows the 'session missing' error and returns null", async () => {
      const client = buildClient();
      client.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Auth session missing!" },
      });
      const svc = createAuthService(() => client as never);
      await expect(svc.getCurrentUser()).resolves.toBeNull();
    });

    it("rethrows other errors", async () => {
      const client = buildClient();
      client.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "network blew up" },
      });
      const svc = createAuthService(() => client as never);
      await expect(svc.getCurrentUser()).rejects.toMatchObject({
        message: "network blew up",
      });
    });
  });

  describe("onAuthStateChange", () => {
    it("returns the supabase subscription", () => {
      const client = buildClient();
      const subscription = { unsubscribe: jest.fn() };
      client.auth.onAuthStateChange.mockReturnValue({
        data: { subscription },
      });
      const svc = createAuthService(() => client as never);

      const handler = jest.fn();
      const result = svc.onAuthStateChange(handler);

      expect(client.auth.onAuthStateChange).toHaveBeenCalledWith(handler);
      expect(result).toBe(subscription);
    });
  });
});
