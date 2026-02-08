import { ThemeToggle } from "@/components/theme-toggle";
import { UrlInput } from "@/components/url-input";
import { ScanResults } from "@/components/scan-results";
import { useScanStore } from "@/hooks/use-scan";

function App() {
  const { status, result } = useScanStore();
  const hasResults = status === "done" && result;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-4">
          <span className="text-sm font-semibold tracking-tight">snaggy</span>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4">
        {/* Hero / Input */}
        <div
          className={`flex flex-col items-center transition-all duration-500 ease-out ${
            hasResults ? "pb-8 pt-8" : "pb-0 pt-[20vh]"
          }`}
        >
          {!hasResults && (
            <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-3xl font-bold tracking-tight">
                Snag fonts & favicons
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Paste a URL to extract assets from any website
              </p>
            </div>
          )}
          <UrlInput compact={!!hasResults} />
        </div>

        {/* Results */}
        {hasResults && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            <ScanResults />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
