#!/usr/bin/env npx tsx
/**
 * Fail-closed security invariant ledger gate — SEC-01..SEC-23 ownership + pins.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const LEDGER_PATH = join(ROOT, "docs", "harness", "security-invariant-ledger.md");

const VALID_LANES = new Set(["ENGINE", "DATA", "LIVE", "AGENT", "APP", "OPS"]);
const EXPECTED_IDS = Array.from({ length: 23 }, (_, i) => `SEC-${String(i + 1).padStart(2, "0")}`);

export type LedgerIssue = { message: string };

type LedgerRow = {
  id: string;
  owningLane: string;
  pin: string;
  status: string;
};

function parseLedgerRows(content: string): Map<string, LedgerRow> {
  const rows = new Map<string, LedgerRow>();

  for (const line of content.split("\n")) {
    if (!line.startsWith("| SEC-")) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 5) continue;

    const [id, , owningLane, pin, status] = cells;
    rows.set(id, { id, owningLane, pin, status });
  }

  return rows;
}

export function validateHarnessLedgerContent(content: string): LedgerIssue[] {
  const issues: LedgerIssue[] = [];
  const rows = parseLedgerRows(content);

  for (const id of EXPECTED_IDS) {
    const row = rows.get(id);
    if (!row) {
      issues.push({ message: `missing ledger row ${id}` });
      continue;
    }

    if (!VALID_LANES.has(row.owningLane)) {
      issues.push({
        message: `${id} owning lane "${row.owningLane}" must be one of ${[...VALID_LANES].join(", ")}`,
      });
    }

    const pinLower = row.pin.toLowerCase();
    if (!row.pin || pinLower === "tbd" || pinLower === "stub") {
      issues.push({ message: `${id} pinning test or doc is empty or stub` });
    }

    if (row.status.toLowerCase() === "stub") {
      issues.push({ message: `${id} status must not be stub` });
    }
  }

  return issues;
}

function main(): void {
  if (!existsSync(LEDGER_PATH)) {
    console.error(`Harness ledger validation failed:\n  ${relative(ROOT, LEDGER_PATH)}: file not found`);
    process.exit(1);
  }

  const content = readFileSync(LEDGER_PATH, "utf8");
  const issues = validateHarnessLedgerContent(content);

  if (issues.length > 0) {
    console.error("Harness ledger validation failed:\n");
    for (const { message } of issues) {
      console.error(`  docs/harness/security-invariant-ledger.md: ${message}`);
    }
    console.error(`\n${issues.length} issue(s).`);
    process.exit(1);
  }

  console.log("Harness ledger validation passed.");
}

const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("validate-harness-ledger.mts") ||
    process.argv[1].endsWith("validate-harness-ledger.mjs"));

if (isMain) {
  main();
}
