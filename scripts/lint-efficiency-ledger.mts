#!/usr/bin/env npx tsx
/**
 * lint:efficiency-ledger — newly Passing Active Work rows must have a ledger entry.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_LEDGER_PATH,
  normalizeTaskName,
  readLedgerRecords,
  resolveEffectiveLedgerRecords,
} from "./efficiency-ledger.mts";
import { parseActiveWorkRows, sectionBetween } from "./validate-project-status.mts";

const ROOT = resolve(import.meta.dirname, "..");
const STATUS_PATH = "docs/PROJECT-STATUS.md";
const ACTIVE_WORK_HEADING = "## Active Work";

export type LintIssue = { feature: string; message: string };

export function isPassingState(state: string): boolean {
  return /\*\*Passing\*\*/i.test(state);
}

export function readStatusAtRef(ref: string, cwd = ROOT): string | null {
  try {
    return execSync(`git show ${ref}:${STATUS_PATH}`, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

export function findNewlyPassingFeatures(
  currentContent: string,
  headContent: string | null,
): string[] {
  const currentSection = sectionBetween(currentContent, ACTIVE_WORK_HEADING);
  const currentRows = parseActiveWorkRows(currentSection).filter((row) =>
    isPassingState(row.state),
  );

  if (!headContent) {
    return currentRows.map((row) => row.feature);
  }

  const headSection = sectionBetween(headContent, ACTIVE_WORK_HEADING);
  const headByFeature = new Map(
    parseActiveWorkRows(headSection).map((row) => [normalizeTaskName(row.feature), row]),
  );

  return currentRows
    .filter((row) => {
      const prior = headByFeature.get(normalizeTaskName(row.feature));
      return !prior || !isPassingState(prior.state);
    })
    .map((row) => row.feature);
}

export function ledgerHasTask(
  taskName: string,
  ledgerPath = DEFAULT_LEDGER_PATH,
  cwd = ROOT,
): boolean {
  const normalized = normalizeTaskName(taskName);
  const records = resolveEffectiveLedgerRecords(readLedgerRecords(ledgerPath, cwd));
  return records.some((record) => normalizeTaskName(record.task_name) === normalized);
}

export function lintEfficiencyLedger(options?: {
  statusPath?: string;
  ledgerPath?: string;
  cwd?: string;
  headRef?: string;
}): LintIssue[] {
  const cwd = options?.cwd ?? ROOT;
  const statusPath = options?.statusPath ?? STATUS_PATH;
  const ledgerPath = options?.ledgerPath ?? DEFAULT_LEDGER_PATH;
  const headRef = options?.headRef ?? "HEAD";

  const currentContent = readFileSync(resolve(cwd, statusPath), "utf8");
  const headContent = readStatusAtRef(headRef, cwd);
  const newlyPassing = findNewlyPassingFeatures(currentContent, headContent);

  const issues: LintIssue[] = [];
  for (const feature of newlyPassing) {
    if (!ledgerHasTask(feature, ledgerPath, cwd)) {
      issues.push({
        feature,
        message: `newly Passing Active Work row "${feature}" has no matching ledger entry (normalizeTaskName)`,
      });
    }
  }

  return issues;
}

function main(): void {
  const issues = lintEfficiencyLedger();
  if (issues.length === 0) {
    console.log("lint:efficiency-ledger — ok");
    process.exit(0);
  }

  console.error("lint:efficiency-ledger — failed:");
  for (const issue of issues) {
    console.error(`- ${issue.feature}: ${issue.message}`);
  }
  process.exit(1);
}

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
