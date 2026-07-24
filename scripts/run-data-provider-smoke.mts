#!/usr/bin/env npx tsx

import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { redactDiagnostic } from "../src/lib/api/redactDiagnostic.ts";

config({ path: ".env.local", quiet: true });

const dryRun = process.argv.includes("--dry-run");
const checks = [
  {
    id: "tws",
    configured: process.env.TWS_ENABLED === "true",
    script: "tws:probe",
  },
  {
    id: "ibkr",
    configured: process.env.IBKR_ENABLED === "true",
    script: "ibkr:probe",
  },
  {
    id: "fmp",
    configured: Boolean(process.env.FMP_API_KEY),
    script: "fmp:gap-probe",
  },
  {
    id: "events",
    configured: Boolean(
      process.env.FMP_API_KEY || process.env.FRED_API_KEY || process.env.SEC_USER_AGENT,
    ),
    script: "events:coverage-probe",
  },
] as const;

let failures = 0;
let passed = 0;
let skipped = 0;
for (const check of checks) {
  if (!check.configured) {
    skipped += 1;
    console.log(`SKIP ${check.id}: provider not configured`);
    continue;
  }
  if (dryRun) {
    skipped += 1;
    console.log(`READY ${check.id}: npm run ${check.script}`);
    continue;
  }

  const result = spawnSync("npm", ["run", check.script], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
    timeout: 30_000,
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
    .split(/\r?\n/)
    .map((line) => redactDiagnostic(line, { maxLength: 500 }))
    .filter(Boolean);
  for (const line of output) console.log(`[${check.id}] ${line}`);
  if (result.status === 0) {
    passed += 1;
    console.log(`PASS ${check.id}`);
  } else {
    failures += 1;
    console.error(`FAIL ${check.id}: exit=${result.status ?? "signal"}`);
  }
}

if (failures > 0) {
  console.error(
    `DATA_PROVIDER_SMOKE: FAIL passed=${passed} failed=${failures} skipped=${skipped}`,
  );
  process.exit(1);
}
console.log(
  `DATA_PROVIDER_SMOKE: PASS passed=${passed} failed=${failures} skipped=${skipped} dryRun=${dryRun}`,
);
