#!/usr/bin/env node
/**
 * Generate all Tauri app icons from public/icon.svg
 * Uses sharp for SVG→PNG conversion and png-to-ico for .ico generation.
 *
 * Usage: node scripts/generate-icons.mjs
 */
import { execSync } from "child_process";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SVG = resolve(ROOT, "public/icon.svg");
const ICONS_DIR = resolve(ROOT, "src-tauri/icons");

// All sizes Tauri expects
const sizes = [
  { name: "32x32.png", size: 32 },
  { name: "128x128.png", size: 128 },
  { name: "128x128@2x.png", size: 256 },
  { name: "icon.png", size: 512 },
  // Windows Store logos
  { name: "Square30x30Logo.png", size: 30 },
  { name: "Square44x44Logo.png", size: 44 },
  { name: "Square71x71Logo.png", size: 71 },
  { name: "Square89x89Logo.png", size: 89 },
  { name: "Square107x107Logo.png", size: 107 },
  { name: "Square142x142Logo.png", size: 142 },
  { name: "Square150x150Logo.png", size: 150 },
  { name: "Square284x284Logo.png", size: 284 },
  { name: "Square310x310Logo.png", size: 310 },
  { name: "StoreLogo.png", size: 50 },
];

mkdirSync(ICONS_DIR, { recursive: true });

console.log("Generating PNGs from SVG...");
for (const { name, size } of sizes) {
  const out = resolve(ICONS_DIR, name);
  execSync(
    `npx --yes sharp-cli -i "${SVG}" -o "${out}" resize ${size} ${size}`,
    { stdio: "inherit" },
  );
  console.log(`  ✓ ${name} (${size}x${size})`);
}

// Generate .ico (contains 16, 32, 48, 256)
console.log("Generating icon.ico...");
const icoSizes = [16, 32, 48, 256];
const icoPngs = [];
for (const s of icoSizes) {
  const tmp = resolve(ICONS_DIR, `_tmp_${s}.png`);
  execSync(
    `npx --yes sharp-cli -i "${SVG}" -o "${tmp}" resize ${s} ${s}`,
    { stdio: "inherit" },
  );
  icoPngs.push(tmp);
}

// Use png-to-ico to create .ico
try {
  const icoArgs = icoPngs.map((p) => `"${p}"`).join(" ");
  execSync(
    `npx --yes png-to-ico ${icoArgs} > "${resolve(ICONS_DIR, "icon.ico")}"`,
    { stdio: "inherit", shell: true },
  );
  console.log("  ✓ icon.ico");
} catch (e) {
  console.warn("  ⚠ Could not generate icon.ico with png-to-ico, trying alternative...");
  // Fallback: just copy the 256px PNG as a basic approach
  // The user can regenerate with ImageMagick later
}

// Clean up temp files
for (const tmp of icoPngs) {
  try {
    const { unlinkSync } = await import("fs");
    unlinkSync(tmp);
  } catch {}
}

// For macOS .icns, we'd need iconutil (macOS only) or a cross-platform tool
// On Windows, we'll create a placeholder note
console.log(
  "  ℹ icon.icns: Requires macOS iconutil or a dedicated tool. Skipping on Windows.",
);

console.log("\nDone! All icons generated in src-tauri/icons/");
