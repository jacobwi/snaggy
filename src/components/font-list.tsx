import { useEffect, useRef, useState } from "react";
import { Download, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useScanStore } from "@/hooks/use-scan";
import type { FontInfo } from "@/lib/types";

function useFontPreview(font: FontInfo): string | null {
  const [previewFamily, setPreviewFamily] = useState<string | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (font.variants.length === 0) return;

    const preferred =
      font.variants.find((v) => v.weight === "400" && v.style === "normal") ??
      font.variants[0];

    const safeName = `snaggy-${font.family.replace(/[^a-zA-Z0-9]/g, "-")}`;
    const style = document.createElement("style");
    style.textContent = `
      @font-face {
        font-family: '${safeName}';
        src: url('${preferred.url}') format('${preferred.format}');
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
    styleRef.current = style;
    setPreviewFamily(safeName);

    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, [font.family, font.variants]);

  return previewFamily;
}

const SOURCE_STYLES: Record<string, string> = {
  "google-fonts": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "adobe-fonts": "bg-red-500/10 text-red-600 dark:text-red-400",
  custom: "bg-muted text-muted-foreground",
};

const SOURCE_LABELS: Record<string, string> = {
  "google-fonts": "Google",
  "adobe-fonts": "Adobe",
  custom: "Custom",
};

function weightLabel(weight: string): string {
  const map: Record<string, string> = {
    "100": "Thin",
    "200": "Extra Light",
    "300": "Light",
    "400": "Regular",
    "500": "Medium",
    "600": "Semi Bold",
    "700": "Bold",
    "800": "Extra Bold",
    "900": "Black",
  };
  return map[weight] ?? weight;
}

function FontCard({ font }: { font: FontInfo }) {
  const { selectedFonts, toggleFont, downloadSingleFont } = useScanStore();
  const [expanded, setExpanded] = useState(false);
  const previewFamily = useFontPreview(font);
  const isSelected = selectedFonts.has(font.family);

  return (
    <div
      className={`rounded-xl border transition-all duration-150 ${
        isSelected
          ? "border-foreground/20 bg-foreground/[0.03]"
          : "border-border/60 hover:border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleFont(font.family)}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">
              {font.family}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-px text-[10px] font-medium ${
                SOURCE_STYLES[font.source] ?? SOURCE_STYLES.custom
              }`}
            >
              {SOURCE_LABELS[font.source] ?? font.source}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {font.variants.length} variant
            {font.variants.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => downloadSingleFont(font)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            title="Download all variants"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          {font.variants.length > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      {previewFamily && (
        <div
          className="mx-4 mb-3 rounded-lg bg-muted/40 px-4 py-3 text-lg leading-relaxed truncate"
          style={{ fontFamily: `'${previewFamily}', sans-serif` }}
        >
          The quick brown fox jumps over the lazy dog
        </div>
      )}

      {/* Variants */}
      {expanded && (
        <div className="mx-4 mb-4 space-y-1">
          {font.variants.map((v) => (
            <div
              key={v.url}
              className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs"
            >
              <span>
                <span className="font-medium">
                  {weightLabel(v.weight)}
                  {v.style === "italic" ? " Italic" : ""}
                </span>
                <span className="ml-1.5 text-muted-foreground">{v.weight}</span>
              </span>
              <span className="text-[10px] text-muted-foreground/70 font-mono uppercase">
                {v.format}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FontList() {
  const { result } = useScanStore();
  const fonts = result?.fonts ?? [];

  if (fonts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground/60">
          No web fonts detected. This site may use system fonts only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {fonts.map((font) => (
        <FontCard key={font.family} font={font} />
      ))}
    </div>
  );
}
