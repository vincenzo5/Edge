#!/usr/bin/env npx tsx
/**
 * Replace moved chart modules with re-exports from @edge/chart-core.
 * App-coupled modules are left untouched.
 */

import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const CHART_SRC = join(ROOT, "src/lib/chart");
const PACKAGE_SRC = join(ROOT, "packages/chart-core/src");

const KEEP_LOCAL = new Set([
  "series.ts",
  "legend.ts",
  "rangePresetTransition.ts",
  "chartHeaderMetadata.ts",
  "chartTheme.ts",
  "chartSettings.ts",
  "chartSnapshot.ts",
  "indicatorFavorites.ts",
  "intervalAdapter.ts",
  "canvas.tsx",
  "CrosshairOverlay.tsx",
  "chartClipboard.ts",
  "presets/apply.ts",
  "presets/types.ts",
  "presets/validate.ts",
  "renderer.ts",
  "viewport.ts",
  "paneHandle.ts",
  "indicatorScale.ts",
  "priceAxisAnnotations.ts",
  "goTo.ts",
  "rangePresets.ts",
  "rangeInterval.ts",
  "indicatorCompute.ts",
  "drawings/measure.ts",
  "indicators/draw.ts",
]);

function walk(dir: string, base = dir): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const rel = relative(base, full).replace(/\\/g, "/");
    if (statSync(full).isDirectory()) {
      if (entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) continue;
      files.push(...walk(full, base));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry)) continue;
    files.push(rel);
  }
  return files;
}

const packageFiles = walk(PACKAGE_SRC);
let shimCount = 0;

for (const rel of packageFiles) {
  if (KEEP_LOCAL.has(rel)) continue;
  const target = join(CHART_SRC, rel);
  const importPath = `@edge/chart-core/${rel.replace(/\.tsx?$/, "")}`;
  const content = `/** @deprecated implementation moved to @edge/chart-core */\nexport * from '${importPath}';\n`;
  writeFileSync(target, content, "utf8");
  shimCount += 1;
}

console.log(`Wrote ${shimCount} chart shims in src/lib/chart`);
