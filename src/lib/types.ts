export interface ScanResult {
  url: string;
  favicons: FaviconInfo[];
  fonts: FontInfo[];
}

export interface FaviconInfo {
  url: string;
  rel: string;
  sizes: string | null;
  mime_type: string | null;
}

export interface FontInfo {
  family: string;
  variants: FontVariant[];
  source: string;
}

export interface FontVariant {
  style: string;
  weight: string;
  url: string;
  format: string;
}
