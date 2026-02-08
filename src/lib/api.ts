import type { ScanResult } from "@/lib/types";
import { isTauri } from "@/lib/tauri";

const API_BASE = "/api";

/**
 * Unified API layer: uses Tauri invoke in desktop mode, HTTP fetch in web mode.
 */

async function tauriInvoke<T>(
  command: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

async function httpGet<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function scanWebsite(url: string): Promise<ScanResult> {
  if (isTauri) {
    return tauriInvoke<ScanResult>("scan_website", { url });
  }
  return httpGet<ScanResult>("/scan", { url });
}

export async function proxyImage(url: string): Promise<string> {
  if (isTauri) {
    return tauriInvoke<string>("proxy_image", { url });
  }
  const res = await httpGet<{ data: string }>("/proxy-image", { url });
  return res.data;
}

export async function downloadAsset(
  url: string,
  savePath?: string,
): Promise<void> {
  if (isTauri && savePath) {
    return tauriInvoke<void>("download_asset", { url, savePath });
  }
  // Web mode: trigger browser download
  const downloadUrl = new URL(`${API_BASE}/download`, window.location.origin);
  downloadUrl.searchParams.set("url", url);
  const a = document.createElement("a");
  a.href = downloadUrl.toString();
  a.download = "";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
