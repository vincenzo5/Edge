#!/usr/bin/env npx tsx
/**
 * Validates src/lib → src/app layering:
 * - Phase 0: allowlist known leaks; fail only on new production imports
 * - Phase 1: flip to fail-closed (empty allowlist)
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  libToAppBoundaryViolations,
  libToAppImportIssues,
  PHASE0_LIB_TO_APP_ALLOWLIST,
  type BoundaryIssue,
} from "./package-boundary-policy.mts";

const ROOT = join(import.meta.dirname, "..");
const LIB_DIR = join(ROOT, "src/lib");

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (/\.(ts|tsx|mts)$/.test(entry) && !/\.(test|spec)\.(ts|tsx|mts)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(LIB_DIR).map((absPath) => ({
  relPath: relative(ROOT, absPath),
  content: readFileSync(absPath, "utf8"),
}));

const allIssues: BoundaryIssue[] = [];
for (const { relPath, content } of files) {
  allIssues.push(...libToAppImportIssues(relPath, content));
}

const violations = libToAppBoundaryViolations(files, PHASE0_LIB_TO_APP_ALLOWLIST);
const allowlistedCount = new Set(
  allIssues.map((issue) => issue.file).filter((file) => PHASE0_LIB_TO_APP_ALLOWLIST.has(file))
).size;

console.log(
  `App-lib boundary scan: ${allIssues.length} import(s) in ${allowlistedCount} allowlisted file(s); ${violations.length} new violation(s).`
);

if (violations.length > 0) {
  console.error("\nNew src/lib → src/app imports (not in Phase 0 allowlist):\n");
  for (const issue of violations) {
    const loc = issue.line != null ? `${issue.file}:${issue.line}` : issue.file;
    console.error(`  ${loc} — ${issue.reason}`);
  }
  console.error(`\n${violations.length} issue(s). Phase 1 will fail-closed on all leaks.`);
  process.exit(1);
}

console.log("App-lib boundary validation passed (Phase 0 allowlist mode).");
