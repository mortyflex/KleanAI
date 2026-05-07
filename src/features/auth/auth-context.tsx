import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { authService, type AuthService } from "./auth.service";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface SignUpResult {
  user: User | null;
  session: Session | null;
}

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
  /** Test seam — defaults to the singleton wired to real Supabase. */
  service?: AuthService;
}

/**
 * Wraps the app so screens can read/refresh the Supabase session through a
 * single source of truth. Loads the initial session and listens for auth
 * state changes (sign in / sign out / token refresh) for the lifetime of
 * the provider.
 */
export function AuthProvider({
  children,
  service = authService,
}: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let subscription: { unsubscribe: () => void } | null = null;

    (async () => {
      try {
        const initial = await service.getSession();
        if (!mounted.current) return;
        setSession(initial);
        setStatus(initial ? "authenticated" : "unauthenticated");
      } catch {
        if (!mounted.current) return;
        setSession(null);
        setStatus("unauthenticated");
      }

      subscription = service.onAuthStateChange((_event, next) => {
        if (!mounted.current) return;
        setSession(next);
        setStatus(next ? "authenticated" : "unauthenticated");
      });
    })();

    return () => {
      mounted.current = false;
      subscription?.unsubscribe();
    };
  }, [service]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await service.signInWithPassword({ email, password });
      if (!result.user) {
        throw new Error("Sign-in returned no user");
      }
      setSession(result.session);
      setStatus(result.session ? "authenticated" : "unauthenticated");
      return result.user;
    },
    [service],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<SignUpResult> => {
      const result = await service.signUpWithPassword({ email, password });
      // Supabase may return a user but no session if email confirmation is on
      // (or if the email is already registered — Supabase masks that case for
      // security). The caller MUST check `session` before assuming sign-up
      // succeeded; only a non-null session means the user is actually in.
      setSession(result.session);
      setStatus(result.session ? "authenticated" : "unauthenticated");
      return { user: result.user, session: result.session };
    },
    [service],
  );

  const signOut = useCallback(async () => {
    await service.signOut();
    setSession(null);
    setStatus("unauthenticated");
  }, [service]);

  const refresh = useCallback(async () => {
    const next = await service.getSession();
    setSession(next);
    setStatus(next ? "authenticated" : "unauthenticated");
  }, [service]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      signIn,
      signUp,
      signOut,
      refresh,
    }),
    [status, session, signIn, signUp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
