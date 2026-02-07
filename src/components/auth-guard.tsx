// ---------------------------------------------------------------------------
// Auth Guard
// ---------------------------------------------------------------------------
// Wraps protected content. Shows a loading spinner while hydrating auth state,
// then either renders children (authenticated) or the login page (not).
//
// If you add a router later, you can replace this with a <Navigate to="/login" />
// redirect inside a ProtectedRoute wrapper instead.
// ---------------------------------------------------------------------------

import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/hooks/use-auth";
import { LoginPage } from "@/components/login-page";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();

  // Hydrate auth state from localStorage on first mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
