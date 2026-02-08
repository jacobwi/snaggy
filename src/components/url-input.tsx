import { ArrowRight, Loader2 } from "lucide-react";
import { useScanStore } from "@/hooks/use-scan";

export function UrlInput({ compact = false }: { compact?: boolean }) {
  const { url, setUrl, scan, status, error } = useScanStore();
  const isScanning = status === "scanning";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isScanning) scan();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`w-full ${compact ? "max-w-xl" : "max-w-lg"}`}
    >
      <div
        className={`group relative flex items-center rounded-xl border bg-background shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-foreground/20 ${
          error ? "border-destructive/50" : "border-border"
        } ${compact ? "h-10" : "h-12"}`}
      >
        <input
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isScanning}
          className={`h-full w-full bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50 ${
            compact ? "text-sm" : "text-base"
          }`}
        />
        <button
          type="submit"
          disabled={isScanning}
          className={`flex shrink-0 items-center gap-1.5 rounded-r-xl border-l px-4 font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50 ${
            compact ? "h-10 text-xs" : "h-12 text-sm"
          }`}
        >
          {isScanning ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="hidden sm:inline">Scanning</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Scan</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive-foreground">{error}</p>
      )}
    </form>
  );
}
