#!/usr/bin/env npx tsx
/**
 * Seed the personal pattern library with deterministic synthetic records.
 * Usage: npm run pattern-library:seed [-- --count=100]
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  createDefaultTaxonomy,
  generateSeedRecords,
  saveRecord,
  ensureLibraryDirs,
  TAXONOMY_PATH,
  libraryStats,
} from "../src/lib/patternLibrary";

const countArg = process.argv.find((a) => a.startsWith("--count="));
const count = countArg ? Number.parseInt(countArg.split("=")[1]!, 10) : 100;

ensureLibraryDirs();
writeFileSync(TAXONOMY_PATH, JSON.stringify(createDefaultTaxonomy(), null, 2), "utf8");

const records = generateSeedRecords(count, 42);
for (const record of records) {
  saveRecord(record, true);
}

const stats = libraryStats();
console.log(
  JSON.stringify(
    {
      seeded: records.length,
      taxonomy: path.relative(process.cwd(), TAXONOMY_PATH),
      stats,
    },
    null,
    2,
  ),
);
