#!/usr/bin/env npx tsx

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { validateDataStateGovernance } from "../src/lib/marketData/state/governanceValidation.ts";

const ROOT = join(import.meta.dirname, "..");
const API_ROOT = join(ROOT, "src/app/api");
const PROVIDERS_ROOT = join(ROOT, "src/lib/marketData/providers");

function walkRoutes(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const routes: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      routes.push(...walkRoutes(fullPath));
    } else if (entry === "route.ts") {
      routes.push(relative(API_ROOT, fullPath));
    }
  }
  return routes.sort();
}

function providerAdapters(): string[] {
  if (!existsSync(PROVIDERS_ROOT)) return [];
  return readdirSync(PROVIDERS_ROOT)
    .filter((entry) => existsSync(join(PROVIDERS_ROOT, entry, "adapter.ts")))
    .sort();
}

const report = validateDataStateGovernance({
  apiRoutes: walkRoutes(API_ROOT),
  providerAdapters: providerAdapters(),
});

if (report.issues.length > 0) {
  console.error("Data-state contract validation failed:\n");
  for (const issue of report.issues) {
    console.error(`  - ${issue}`);
  }
  console.error(`\n${report.issues.length} issue(s).`);
  process.exit(1);
}

console.log(
  `Data-state contracts valid: datasets=${report.datasets} providers=${report.providers} routes=${report.routes} exclusions=${report.exclusions} issues=0`,
);
