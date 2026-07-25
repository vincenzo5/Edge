#!/usr/bin/env npx tsx

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatMemoryScorecard,
  type MemoryBaselineSnapshot,
} from "./memory-scorecard.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const fileArgIndex = process.argv.indexOf("--file");
const baselinePath =
  fileArgIndex >= 0 && process.argv[fileArgIndex + 1]
    ? path.resolve(process.argv[fileArgIndex + 1]!)
    : path.join(repoRoot, "docs/perf/memory-baseline-latest.json");

function loadBaseline(filePath: string): MemoryBaselineSnapshot {
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw) as MemoryBaselineSnapshot;
}

function main(): void {
  const baseline = loadBaseline(baselinePath);
  console.log(formatMemoryScorecard(baseline, { sourcePath: baselinePath }));
}

try {
  main();
} catch (error) {
  console.error(`Failed to read memory baseline from ${baselinePath}`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
