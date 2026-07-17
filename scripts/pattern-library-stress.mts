#!/usr/bin/env npx tsx
/**
 * Run stress tests: look-ahead audit, style ablation, bias check, relative comparison.
 * Usage: npm run pattern-library:stress
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  loadAllRecords,
  runBakeoff,
  runStressTests,
} from "../src/lib/patternLibrary";

const records = loadAllRecords();
if (records.length < 20) {
  console.error(`Need at least 20 records; found ${records.length}. Run pattern-library:seed first.`);
  process.exit(1);
}

const bakeoff = await runBakeoff(records);
const predMap = new Map<string, "long" | "short" | "neutral">();
for (const p of bakeoff.predictions.filter((x) => x.arm === "retrieval")) {
  predMap.set(p.recordId, p.predictedDirection);
}

const report = runStressTests(records, predMap);
const outPath = path.join(process.cwd(), "data/pattern-library/stress-results.json");
writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

console.log(JSON.stringify(report, null, 2));
