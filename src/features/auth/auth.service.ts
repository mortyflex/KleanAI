import type {
  AuthChangeEvent,
  Session,
  Subscription,
  User,
} from "@supabase/supabase-js";

import { getSupabase, type KleanSupabaseClient } from "../../lib/supabase";

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
}

/**
 * Auth service — thin wrapper around Supabase Auth that returns plain results
 * instead of Supabase's `{ data, error }` shape and throws on failure so
 * callers can use try/catch + react-query naturally.
 *
 * The Supabase client is resolved lazily through `clientFactory` so the same
 * helpers work in tests with a fully mocked client.
 */
export interface AuthService {
  signInWithPassword: (creds: AuthCredentials) => Promise<AuthResult>;
  signUpWithPassword: (creds: AuthCredentials) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  getSession: () => Promise<Session | null>;
  getCurrentUser: () => Promise<User | null>;
  onAuthStateChange: (
    handler: (event: AuthChangeEvent, session: Session | null) => void,
  ) => Subscription;
}

export function createAuthService(
  clientFactory: () => KleanSupabaseClient = getSupabase,
): AuthService {
  return {
    async signInWithPassword({ email, password }) {
      const { data, error } = await clientFactory().auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { user: data.user, session: data.session };
    },

    async signUpWithPassword({ email, password }) {
      const { data, error } = await clientFactory().auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return { user: data.user, session: data.session };
    },

    async signOut() {
      const { error } = await clientFactory().auth.signOut();
      if (error) throw error;
    },

    async getSession() {
      const { data, error } = await clientFactory().auth.getSession();
      if (error) throw error;
      return data.session;
    },

    async getCurrentUser() {
      const { data, error } = await clientFactory().auth.getUser();
      // `getUser()` errors with "Auth session missing!" when nobody is signed
      // in — that's not a real error for our callers, so swallow it.
      if (error) {
        if (error.message?.toLowerCase().includes("session missing")) {
          return null;
        }
        throw error;
      }
      return data.user;
    },

    onAuthStateChange(handler) {
      const { data } = clientFactory().auth.onAuthStateChange(handler);
      return data.subscription;
    },
  };
}

/**
 * Default singleton wired to the real Supabase client. Screens and hooks
 * should import this. Tests should call `createAuthService` with a fake
 * client factory instead.
 */
export const authService: AuthService = createAuthService();
