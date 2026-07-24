#!/usr/bin/env npx tsx
/**
 * Phase 5: retarget @/lib/chart/* and relative shim imports to @edge/chart-* packages.
 * Run once during chart shim sunset; does not modify shim files themselves.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const CHART_SRC = join(ROOT, "src/lib/chart");

const ADAPTER_KEEP = new Set([
  "series.ts",
  "intervalAdapter.ts",
  "scriptSeriesResolver.ts",
  "resolveChartLiveQuotePrice.ts",
  "chartSnapshot.ts",
  "viewportPersistSketch.ts",
  "stateMapping.ts",
  "chartClipboard.ts",
  "layoutTemplates.ts",
  "layoutTemplateGrid.ts",
  "presets/apply.ts",
  "presets/types.ts",
  "presets/validate.ts",
  "activeChartTypes.ts",
  "objectTreeModel.ts",
  "chartHeaderMetadata.ts",
  "dataWindow.ts",
  "indicatorFavorites.ts",
  "chartTheme.ts",
  "scriptFixtureDev.ts",
]);

function walk(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(base, full).replace(/\\/g, "/");
    if (statSync(full).isDirectory()) {
      out.push(...walk(full, base));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    out.push(rel);
  }
  return out;
}

function parseShimTarget(content: string): string | null {
  const exportStar = content.match(/export \* from ['"]([^'"]+)['"]/);
  if (exportStar) return exportStar[1]!;
  const exportDefault = content.match(/export \{ default \} from ['"]([^'"]+)['"]/);
  if (exportDefault) return exportDefault[1]!;
  return null;
}

function buildShimMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const rel of walk(CHART_SRC)) {
    if (/\.(test|spec)\.(ts|tsx)$/.test(rel)) continue;
    if (ADAPTER_KEEP.has(rel)) continue;
    const full = join(CHART_SRC, rel);
    const content = readFileSync(full, "utf8");
    const target = parseShimTarget(content);
    if (!target) continue;
    const withoutExt = rel.replace(/\.tsx?$/, "");
    map.set(`@/lib/chart/${withoutExt}`, target);
    map.set(`@/lib/chart/${rel}`, target);
  }
  return map;
}

const SHIM_MAP = buildShimMap();

const SCAN_DIRS = [
  join(ROOT, "src/app"),
  join(ROOT, "src/lib"),
  join(ROOT, "src/test"),
  join(ROOT, "examples"),
  join(ROOT, "scripts"),
];

const IMPORT_RE =
  /((?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+\s+from\s+|)|import\s*\(\s*)(['"])([^'"]+)\2/g;

function resolveRelativeShim(
  importerPath: string,
  specifier: string
): string | null {
  if (!specifier.startsWith(".")) return null;
  const importerDir = join(ROOT, importerPath.replace(/\/[^/]+$/, ""));
  let resolved = join(importerDir, specifier);
  if (!/\.(ts|tsx)$/.test(resolved)) {
    for (const ext of [".ts", ".tsx", "/index.ts"]) {
      const candidate = resolved + ext;
      try {
        if (statSync(candidate).isFile()) {
          resolved = candidate;
          break;
        }
      } catch {
        /* try next */
      }
    }
  }
  const chartRel = relative(CHART_SRC, resolved).replace(/\\/g, "/").replace(/\.tsx?$/, "");
  if (chartRel.startsWith("..")) return null;
  const alias = `@/lib/chart/${chartRel}`;
  return SHIM_MAP.get(alias) ?? null;
}

function migrateFile(relPath: string): boolean {
  const full = join(ROOT, relPath);
  let content = readFileSync(full, "utf8");
  let changed = false;

  content = content.replace(IMPORT_RE, (match, prefix, quote, specifier) => {
    let replacement: string | null = SHIM_MAP.get(specifier) ?? null;
    if (!replacement) {
      replacement = resolveRelativeShim(relPath, specifier);
    }
    if (!replacement) return match;
    changed = true;
    return `${prefix}${quote}${replacement}${quote}`;
  });

  if (changed) {
    writeFileSync(full, content, "utf8");
  }
  return changed;
}

let changedFiles = 0;
for (const dir of SCAN_DIRS) {
  for (const rel of walk(dir, ROOT)) {
    if (rel.startsWith("src/lib/chart/") && !/\.(test|spec)\./.test(rel)) {
      // Still migrate adapter internals that import shims relatively
      if (!ADAPTER_KEEP.has(rel.replace("src/lib/chart/", ""))) continue;
    }
    if (migrateFile(rel)) changedFiles += 1;
  }
}

console.log(`Shim map entries: ${SHIM_MAP.size / 2}`);
console.log(`Migrated files: ${changedFiles}`);
