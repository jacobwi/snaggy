// ---------------------------------------------------------------------------
// Axios API Client
// ---------------------------------------------------------------------------
// Pre-configured Axios instance with:
//   • Base URL from VITE_API_URL
//   • Automatic JWT Bearer token injection (when auth is enabled)
//   • 401 response interceptor that clears tokens and reloads (when auth is enabled)
//
// Usage:
//   import { api } from "@/lib/api";
//   const { data } = await api.get<User[]>("/users");
//   const { data } = await api.post<User>("/users", { name: "Ada" });
// ---------------------------------------------------------------------------

import axios from "axios";
import { AUTH_CONFIG, isAuthEnabled } from "@/lib/auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor: attach JWT token ──────────────────────────────────
if (isAuthEnabled) {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem(AUTH_CONFIG.tokenKey);
    if (token) {
      config.headers.Authorization = `${AUTH_CONFIG.tokenPrefix} ${token}`;
    }
    return config;
  });
}

// ── Response interceptor: handle 401 Unauthorized ──────────────────────────
if (isAuthEnabled) {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem(AUTH_CONFIG.tokenKey);
        localStorage.removeItem(AUTH_CONFIG.refreshTokenKey);
        window.location.reload();
      }
      return Promise.reject(error);
    }
  );
}
