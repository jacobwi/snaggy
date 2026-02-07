// ---------------------------------------------------------------------------
// Auth Configuration
// ---------------------------------------------------------------------------
// Central auth types and constants. Every auth-related file imports from here.
// To add a new auth mode (e.g. "oauth"), extend the AuthMode union and handle
// it in the Zustand store (src/hooks/use-auth.ts).
// ---------------------------------------------------------------------------

/** Supported authentication modes — extend this union to add new strategies. */
export type AuthMode = "none" | "jwt";

/** Current auth mode, read from the VITE_AUTH_MODE environment variable. */
export const AUTH_MODE: AuthMode =
  (import.meta.env.VITE_AUTH_MODE as AuthMode) || "none";

/** `true` when any authentication strategy is active. */
export const isAuthEnabled = AUTH_MODE !== "none";

/** `true` when the JWT strategy is active. */
export const isJwtAuth = AUTH_MODE === "jwt";

// ---------------------------------------------------------------------------
// JWT-specific configuration
// ---------------------------------------------------------------------------
export const AUTH_CONFIG = {
  /** localStorage key for the access token. */
  tokenKey: "auth_token",
  /** localStorage key for the refresh token (if your backend supports it). */
  refreshTokenKey: "auth_refresh_token",
  /** Prefix used in the Authorization header. */
  tokenPrefix: "Bearer",
} as const;

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** Minimal user shape — extend with your own fields as needed. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/** Credentials sent to the login endpoint. */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Shape returned by the login endpoint / mock service. */
export interface AuthResponse {
  token: string;
  user: AuthUser;
}
