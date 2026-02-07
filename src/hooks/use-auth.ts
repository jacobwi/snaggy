// ---------------------------------------------------------------------------
// Auth Store (Zustand)
// ---------------------------------------------------------------------------
// Global auth state using Zustand — no Context provider needed.
//
// Usage:
//   import { useAuthStore } from "@/hooks/use-auth";
//   const { user, login, logout, isAuthenticated } = useAuthStore();
//
// The store is only meaningful when VITE_AUTH_MODE !== "none".
// When auth is disabled the store still works (returns safe defaults)
// but is never rendered because AuthGuard / UserMenu are gated behind
// the `isAuthEnabled` flag.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { AUTH_CONFIG, type AuthUser, type LoginCredentials } from "@/lib/auth";
import { mockLogin } from "@/lib/mock-auth";

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------
interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Authenticate with email + password. */
  login: (credentials: LoginCredentials) => Promise<void>;
  /** Clear tokens and user data. */
  logout: () => void;
  /** Re-hydrate auth state from localStorage (called once on mount). */
  hydrate: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Decode the payload segment of a JWT without verifying the signature. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Check whether a JWT has expired based on the `exp` claim. */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp * 1000 < Date.now();
}

/** Extract an AuthUser from a JWT payload. */
function userFromPayload(payload: Record<string, unknown>): AuthUser | null {
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    return null;
  }
  return {
    id: payload.sub as string,
    email: payload.email as string,
    name: (payload.name as string) ?? (payload.email as string).split("@")[0],
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (credentials) => {
    // ⚠️  Replace `mockLogin` with a real API call:
    //   import { api } from "@/lib/api";
    //   const { data } = await api.post<AuthResponse>("/auth/login", credentials);
    const { token, user } = await mockLogin(credentials);

    localStorage.setItem(AUTH_CONFIG.tokenKey, token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    localStorage.removeItem(AUTH_CONFIG.refreshTokenKey);
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: () => {
    const token = localStorage.getItem(AUTH_CONFIG.tokenKey);

    if (!token || isTokenExpired(token)) {
      localStorage.removeItem(AUTH_CONFIG.tokenKey);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    const payload = decodeJwtPayload(token);
    const user = payload ? userFromPayload(payload) : null;

    set({
      user,
      token,
      isAuthenticated: !!user,
      isLoading: false,
    });
  },
}));
