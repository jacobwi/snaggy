// ---------------------------------------------------------------------------
// Mock Authentication Service
// ---------------------------------------------------------------------------
// ⚠️  REPLACE THIS FILE with real API calls for production.
//
// This mock accepts ANY email + password and returns a fake JWT.
// The token payload is a base64-encoded JSON object that the auth store
// can decode to extract user info — exactly like a real JWT, minus the
// cryptographic signature verification.
//
// Example replacement:
//   import { api } from "@/lib/api";
//   export async function login(creds: LoginCredentials): Promise<AuthResponse> {
//     const { data } = await api.post<AuthResponse>("/auth/login", creds);
//     return data;
//   }
// ---------------------------------------------------------------------------

import type { AuthResponse, AuthUser, LoginCredentials } from "@/lib/auth";

/** Simulated network delay in ms. */
const MOCK_DELAY = 600;

/**
 * Fake login — returns a JWT-shaped token for any valid-looking credentials.
 * Replace this function body with a real API call.
 */
export async function mockLogin(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));

  if (!credentials.email || !credentials.password) {
    throw new Error("Email and password are required");
  }

  // Build a minimal user from the email
  const user: AuthUser = {
    id: "usr_demo_001",
    email: credentials.email,
    name: credentials.email.split("@")[0],
  };

  // Construct a JWT-shaped string: header.payload.signature
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    })
  );
  const signature = btoa("mock-signature-do-not-trust");

  return { token: `${header}.${payload}.${signature}`, user };
}
