import { Download, ImageOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useScanStore } from "@/hooks/use-scan";
import type { FaviconInfo } from "@/lib/types";

function FaviconCard({ favicon }: { favicon: FaviconInfo }) {
  const {
    selectedFavicons,
    toggleFavicon,
    faviconDataUrls,
    downloadSingleFavicon,
  } = useScanStore();

  const isSelected = selectedFavicons.has(favicon.url);
  const dataUrl = faviconDataUrls[favicon.url];

  return (
    <div
      onClick={() => toggleFavicon(favicon.url)}
      className={`group relative cursor-pointer rounded-xl border p-3 transition-all duration-150 hover:shadow-sm ${
        isSelected
          ? "border-foreground/20 bg-foreground/[0.03]"
          : "border-border/60 hover:border-border"
      }`}
    >
      {/* Top row: checkbox + download */}
      <div className="flex items-center justify-between mb-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleFavicon(favicon.url)}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadSingleFavicon(favicon);
          }}
          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground hover:bg-accent"
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Preview */}
      <div className="flex items-center justify-center h-16 mb-3 rounded-lg bg-muted/40">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Favicon"
            className="max-h-12 max-w-12 object-contain transition-transform duration-150 group-hover:scale-110"
          />
        ) : (
          <ImageOff className="h-6 w-6 text-muted-foreground/30" />
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-1">
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {favicon.rel}
        </span>
        {favicon.sizes && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            {favicon.sizes}
          </span>
        )}
      </div>
    </div>
  );
}

export function FaviconGrid() {
  const { result } = useScanStore();
  const favicons = result?.favicons ?? [];

  if (favicons.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground/60">No favicons found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {favicons.map((favicon) => (
        <FaviconCard key={favicon.url} favicon={favicon} />
      ))}
    </div>
  );
}
