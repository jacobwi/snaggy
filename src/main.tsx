import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/hooks/use-theme";
import { isAuthEnabled } from "@/lib/auth";
import App from "./App";
import "./index.css";

// Auth imports — when VITE_AUTH_MODE="none", the conditional below takes the
// no-op path and a production build tree-shakes the auth modules out.
import { AuthGuard as JwtAuthGuard } from "@/components/auth-guard";

// No-op wrapper used when authentication is disabled.
function Passthrough({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const AuthGuard = isAuthEnabled ? JwtAuthGuard : Passthrough;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system">
      <AuthGuard>
        <App />
      </AuthGuard>
    </ThemeProvider>
  </StrictMode>
);
