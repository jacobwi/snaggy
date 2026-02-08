import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useScanStore } from "@/hooks/use-scan";
import { FaviconGrid } from "@/components/favicon-grid";
import { FontList } from "@/components/font-list";

type View = "favicons" | "fonts" | "all";

export function ScanResults() {
  const {
    result,
    selectedFavicons,
    selectedFonts,
    selectAllFavicons,
    deselectAllFavicons,
    selectAllFonts,
    deselectAllFonts,
    downloadSelected,
    downloading,
  } = useScanStore();

  const [activeView, setActiveView] = useState<View>("all");

  if (!result) return null;

  const faviconCount = result.favicons.length;
  const fontCount = result.fonts.length;
  const totalSelected = selectedFavicons.size + selectedFonts.size;

  const allFaviconsSelected =
    faviconCount > 0 && selectedFavicons.size === faviconCount;
  const allFontsSelected = fontCount > 0 && selectedFonts.size === fontCount;

  const showFavicons = activeView === "all" || activeView === "favicons";
  const showFonts = activeView === "all" || activeView === "fonts";

  const tabs: { id: View; label: string; count?: number }[] = [
    { id: "all", label: "All" },
    { id: "favicons", label: "Favicons", count: faviconCount },
    { id: "fonts", label: "Fonts", count: fontCount },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-border/50 mb-6">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                activeView === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70"
              }`}
            >
              {tab.label}
              {tab.count != null && (
                <span
                  className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium ${
                    activeView === tab.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {activeView === tab.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Select all (contextual) */}
        <div className="flex gap-3">
          {showFavicons && !showFonts && faviconCount > 0 && (
            <button
              onClick={
                allFaviconsSelected ? deselectAllFavicons : selectAllFavicons
              }
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {allFaviconsSelected ? "Deselect all" : "Select all"}
            </button>
          )}
          {showFonts && !showFavicons && fontCount > 0 && (
            <button
              onClick={allFontsSelected ? deselectAllFonts : selectAllFonts}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {allFontsSelected ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[200px] space-y-8">
        {showFavicons && (
          <section>
            {activeView === "all" && (
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Favicons
                  <span className="ml-1.5 text-muted-foreground/60">
                    {faviconCount}
                  </span>
                </h3>
                {faviconCount > 0 && (
                  <button
                    onClick={
                      allFaviconsSelected
                        ? deselectAllFavicons
                        : selectAllFavicons
                    }
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {allFaviconsSelected ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
            )}
            <FaviconGrid />
          </section>
        )}
        {showFonts && (
          <section>
            {activeView === "all" && (
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fonts
                  <span className="ml-1.5 text-muted-foreground/60">
                    {fontCount}
                  </span>
                </h3>
                {fontCount > 0 && (
                  <button
                    onClick={
                      allFontsSelected ? deselectAllFonts : selectAllFonts
                    }
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {allFontsSelected ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
            )}
            <FontList />
          </section>
        )}
      </div>

      {/* Floating download bar */}
      {totalSelected > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3 rounded-full border border-border/50 bg-background/95 pl-5 pr-2 py-2 shadow-lg backdrop-blur-xl">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {totalSelected} selected
            </span>
            <button
              onClick={downloadSelected}
              disabled={downloading}
              className="flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {downloading ? "Downloading..." : "Download"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
