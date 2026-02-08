import { create } from "zustand";
import type { ScanResult, FaviconInfo, FontInfo } from "@/lib/types";
import { isTauri } from "@/lib/tauri";
import { scanWebsite, proxyImage, downloadAsset } from "@/lib/api";

interface ScanState {
  url: string;
  status: "idle" | "scanning" | "done" | "error";
  error: string | null;
  result: ScanResult | null;
  selectedFavicons: Set<string>;
  selectedFonts: Set<string>;
  faviconDataUrls: Record<string, string>;
  downloading: boolean;

  setUrl: (url: string) => void;
  scan: () => Promise<void>;
  toggleFavicon: (url: string) => void;
  toggleFont: (family: string) => void;
  selectAllFavicons: () => void;
  deselectAllFavicons: () => void;
  selectAllFonts: () => void;
  deselectAllFonts: () => void;
  downloadSingleFavicon: (favicon: FaviconInfo) => Promise<void>;
  downloadSingleFont: (font: FontInfo) => Promise<void>;
  downloadSelected: () => Promise<void>;
  loadFaviconPreview: (url: string) => Promise<void>;
  reset: () => void;
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function filenameFromUrl(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split("/").pop();
    if (last && last.includes(".")) return last;
  } catch {
    // ignore
  }
  return fallback;
}

function formatExt(format: string): string {
  if (format === "truetype") return "ttf";
  if (format === "opentype") return "otf";
  return format;
}

function fontFilename(
  family: string,
  v: { weight: string; style: string; format: string },
): string {
  const ext = formatExt(v.format);
  return `${family.replace(/\s+/g, "-")}-${v.weight}${v.style === "italic" ? "i" : ""}.${ext}`;
}

export const useScanStore = create<ScanState>((set, get) => ({
  url: "",
  status: "idle",
  error: null,
  result: null,
  selectedFavicons: new Set(),
  selectedFonts: new Set(),
  faviconDataUrls: {},
  downloading: false,

  setUrl: (url) => set({ url }),

  scan: async () => {
    const { url } = get();
    const normalized = normalizeUrl(url);
    if (!normalized) {
      set({ error: "Please enter a URL", status: "error" });
      return;
    }

    set({
      status: "scanning",
      error: null,
      result: null,
      selectedFavicons: new Set(),
      selectedFonts: new Set(),
      faviconDataUrls: {},
    });

    try {
      const result = await scanWebsite(normalized);
      set({ status: "done", result });

      // Load favicon previews in background
      for (const favicon of result.favicons) {
        get().loadFaviconPreview(favicon.url);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ status: "error", error: message });
    }
  },

  loadFaviconPreview: async (url: string) => {
    try {
      const dataUrl = await proxyImage(url);
      set((state) => ({
        faviconDataUrls: { ...state.faviconDataUrls, [url]: dataUrl },
      }));
    } catch {
      // Silently skip failed previews
    }
  },

  toggleFavicon: (url) =>
    set((state) => {
      const next = new Set(state.selectedFavicons);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return { selectedFavicons: next };
    }),

  toggleFont: (family) =>
    set((state) => {
      const next = new Set(state.selectedFonts);
      if (next.has(family)) next.delete(family);
      else next.add(family);
      return { selectedFonts: next };
    }),

  selectAllFavicons: () =>
    set((state) => ({
      selectedFavicons: new Set(state.result?.favicons.map((f) => f.url) ?? []),
    })),

  deselectAllFavicons: () => set({ selectedFavicons: new Set() }),

  selectAllFonts: () =>
    set((state) => ({
      selectedFonts: new Set(state.result?.fonts.map((f) => f.family) ?? []),
    })),

  deselectAllFonts: () => set({ selectedFonts: new Set() }),

  downloadSingleFavicon: async (favicon) => {
    if (isTauri) {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const filename = filenameFromUrl(favicon.url, "favicon.ico");
      const ext = filename.split(".").pop() || "ico";
      const savePath = await save({
        defaultPath: filename,
        filters: [{ name: "Image", extensions: [ext] }],
      });
      if (savePath) {
        await downloadAsset(favicon.url, savePath);
      }
    } else {
      await downloadAsset(favicon.url);
    }
  },

  downloadSingleFont: async (font) => {
    if (font.variants.length === 0) return;

    if (isTauri) {
      const { save, open } = await import("@tauri-apps/plugin-dialog");

      if (font.variants.length === 1) {
        const v = font.variants[0];
        const filename = fontFilename(font.family, v);
        const ext = formatExt(v.format);
        const savePath = await save({
          defaultPath: filename,
          filters: [{ name: "Font", extensions: [ext] }],
        });
        if (savePath) {
          await downloadAsset(v.url, savePath);
        }
      } else {
        const folder = await open({
          directory: true,
          title: "Select download folder",
        });
        if (folder) {
          for (const v of font.variants) {
            const filename = fontFilename(font.family, v);
            const savePath = `${folder}\\${filename}`;
            await downloadAsset(v.url, savePath);
          }
        }
      }
    } else {
      // Web mode: download each variant via browser
      for (const v of font.variants) {
        await downloadAsset(v.url);
      }
    }
  },

  downloadSelected: async () => {
    const { result, selectedFavicons, selectedFonts } = get();
    if (!result) return;

    const hasSelection = selectedFavicons.size > 0 || selectedFonts.size > 0;
    if (!hasSelection) return;

    set({ downloading: true });

    try {
      if (isTauri) {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const folder = await open({
          directory: true,
          title: "Select download folder",
        });
        if (!folder) {
          set({ downloading: false });
          return;
        }

        for (const favicon of result.favicons) {
          if (!selectedFavicons.has(favicon.url)) continue;
          const filename = filenameFromUrl(favicon.url, "favicon.ico");
          const savePath = `${folder}\\${filename}`;
          try {
            await downloadAsset(favicon.url, savePath);
          } catch {
            // Continue with next file
          }
        }

        for (const font of result.fonts) {
          if (!selectedFonts.has(font.family)) continue;
          for (const v of font.variants) {
            const filename = fontFilename(font.family, v);
            const savePath = `${folder}\\${filename}`;
            try {
              await downloadAsset(v.url, savePath);
            } catch {
              // Continue with next file
            }
          }
        }
      } else {
        // Web mode: trigger browser downloads
        for (const favicon of result.favicons) {
          if (!selectedFavicons.has(favicon.url)) continue;
          try {
            await downloadAsset(favicon.url);
          } catch {
            // Continue
          }
        }

        for (const font of result.fonts) {
          if (!selectedFonts.has(font.family)) continue;
          for (const v of font.variants) {
            try {
              await downloadAsset(v.url);
            } catch {
              // Continue
            }
          }
        }
      }
    } finally {
      set({ downloading: false });
    }
  },

  reset: () =>
    set({
      url: "",
      status: "idle",
      error: null,
      result: null,
      selectedFavicons: new Set(),
      selectedFonts: new Set(),
      faviconDataUrls: {},
      downloading: false,
    }),
}));
