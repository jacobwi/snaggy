import { useAuthStore } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{user.name}</span>
      <Button variant="ghost" size="icon" onClick={logout}>
        <LogOut className="h-4 w-4" />
        <span className="sr-only">Log out</span>
      </Button>
    </div>
  );
}
