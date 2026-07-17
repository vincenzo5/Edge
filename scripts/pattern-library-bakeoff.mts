#!/usr/bin/env npx tsx
/**
 * Run three-arm bake-off (few-shot VLM stub vs retrieval vs rules) on the pattern library.
 * Usage: npm run pattern-library:bakeoff
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  loadAllRecords,
  runBakeoff,
  passesProductionGates,
  loadTaxonomy,
} from "../src/lib/patternLibrary";

const records = loadAllRecords();
if (records.length < 20) {
  console.error(`Need at least 20 records; found ${records.length}. Run pattern-library:seed first.`);
  process.exit(1);
}

const result = await runBakeoff(records, { holdoutFraction: 0.2 });
const taxonomy = loadTaxonomy();
const gateResults = result.metrics.map((m) => ({
  arm: m.arm,
  gates: passesProductionGates(m, taxonomy.successMetrics),
}));

const outPath = path.join(process.cwd(), "data/pattern-library/bakeoff-results.json");
writeFileSync(
  outPath,
  JSON.stringify({ ...result, gateResults }, null, 2),
  "utf8",
);

console.log(JSON.stringify({ ...result, gateResults }, null, 2));
