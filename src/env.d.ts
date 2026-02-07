/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_API_URL: string;
  readonly VITE_DEBUG: string;
  /** Authentication mode: "none" disables auth, "jwt" enables JWT auth flow. */
  readonly VITE_AUTH_MODE: "none" | "jwt";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
