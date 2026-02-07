import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthEnabled } from "@/lib/auth";
import { Monitor, Globe, Zap } from "lucide-react";

const appName = import.meta.env.VITE_APP_NAME || "Tauri App";

function App() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold">{appName}</span>
          </div>
          <div className="flex items-center gap-2">
            {isAuthEnabled && <UserMenu />}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Welcome to {appName}
          </h1>
          <p className="text-muted-foreground text-lg">
            Built with Tauri v2, React, and shadcn/ui
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Monitor className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Desktop Native</CardTitle>
              <CardDescription>
                Powered by Tauri v2 for lightweight, secure desktop apps with native system access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                Explore
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Globe className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Web Ready</CardTitle>
              <CardDescription>
                Same codebase runs in the browser. Build once, deploy everywhere.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                Learn More
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Fast & Modern</CardTitle>
              <CardDescription>
                Vite + React 19 + Tailwind v4 + shadcn/ui for a blazing fast dev experience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                Get Started
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            Edit <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">src/App.tsx</code> to start building your app.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
