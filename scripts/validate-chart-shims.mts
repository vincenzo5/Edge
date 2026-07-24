#!/usr/bin/env npx tsx
/**
 * Phase 5: fail-closed ban on pure chart re-export shims under src/lib/chart.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { chartShimBoundaryViolations, type BoundaryIssue } from "./package-boundary-policy.mts";

const ROOT = join(import.meta.dirname, "..");
const CHART_DIR = join(ROOT, "src/lib/chart");

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(CHART_DIR).map((absPath) => ({
  relPath: relative(ROOT, absPath),
  content: readFileSync(absPath, "utf8"),
}));

const violations = chartShimBoundaryViolations(files);

console.log(
  `Chart shim scan: ${files.length} production module(s) under src/lib/chart; ${violations.length} violation(s).`
);

if (violations.length > 0) {
  console.error("\nChart shim violations (fail-closed):\n");
  for (const issue of violations) {
    console.error(`  ${issue.file} — ${issue.reason}`);
  }
  console.error("\nImport @edge/chart-core or @edge/chart-react directly; keep only app adapters in src/lib/chart.");
  process.exit(1);
}

console.log("Chart shim validation passed (adapters only).");
