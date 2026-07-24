#!/usr/bin/env npx tsx
/**
 * Fail-closed harness retention gate — hot PROJECT-STATUS dashboard limits.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseActiveWorkRows, sectionBetween } from "./validate-project-status.mts";

export const DEFAULT_MAX_HOT_LINES = 400;
export const DEFAULT_MAX_PASSING_ACTIVE_WORK = 10;
export const DEFAULT_MAX_SESSION_LOG_ENTRIES = 15;

export type RetentionIssue = { message: string };

export function countPreviousVerifiedSections(content: string): number {
  return (content.match(/^## Previous Verified State \(/gm) ?? []).length;
}

export function countPassingActiveWorkRows(content: string): number {
  const activeWork = sectionBetween(content, "## Active Work");
  return parseActiveWorkRows(activeWork).filter((row) =>
    /\*\*Passing\*\*/.test(row.state),
  ).length;
}

export function countSessionLogEntries(content: string): number {
  const sessionLog = sectionBetween(content, "## Session Log");
  if (!sessionLog) return 0;

  let count = 0;
  for (const line of sessionLog.split("\n")) {
    if (line.startsWith("### ")) count += 1;
    else if (/^- \*\*20\d{2}-\d{2}-\d{2}/.test(line)) count += 1;
  }
  return count;
}

export function validateHarnessRetention(
  content: string,
  options?: {
    maxLines?: number;
    maxPrevious?: number;
    maxPassing?: number;
    maxSessionLog?: number;
  },
): RetentionIssue[] {
  const issues: RetentionIssue[] = [];
  const maxLines = options?.maxLines ?? DEFAULT_MAX_HOT_LINES;
  const maxPrevious = options?.maxPrevious ?? 0;
  const maxPassing = options?.maxPassing ?? DEFAULT_MAX_PASSING_ACTIVE_WORK;
  const maxSessionLog = options?.maxSessionLog ?? DEFAULT_MAX_SESSION_LOG_ENTRIES;

  const lineCount = content.split("\n").length;
  if (lineCount > maxLines) {
    issues.push({
      message: `hot file has ${lineCount} lines; keep ≤${maxLines} (run npm run status:prune)`,
    });
  }

  const previousCount = countPreviousVerifiedSections(content);
  if (previousCount > maxPrevious) {
    issues.push({
      message: `hot file has ${previousCount} Previous Verified sections; keep ≤${maxPrevious} (run npm run status:prune)`,
    });
  }

  const passingCount = countPassingActiveWorkRows(content);
  if (passingCount > maxPassing) {
    issues.push({
      message: `Active Work has ${passingCount} Passing rows; keep ≤${maxPassing} (run npm run status:prune)`,
    });
  }

  const sessionLogCount = countSessionLogEntries(content);
  if (sessionLogCount > maxSessionLog) {
    issues.push({
      message: `Session Log has ${sessionLogCount} entries; keep ≤${maxSessionLog} (run npm run status:prune)`,
    });
  }

  return issues;
}

function main(): void {
  const statusPath = resolve(process.cwd(), "docs/PROJECT-STATUS.md");
  const content = readFileSync(statusPath, "utf8");
  const issues = validateHarnessRetention(content);

  if (issues.length === 0) {
    console.log("lint:harness-retention OK");
    process.exit(0);
  }

  console.error("lint:harness-retention failed:");
  for (const issue of issues) {
    console.error(`  - ${issue.message}`);
  }
  process.exit(1);
}

const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("validate-harness-retention.mts") ||
    process.argv[1].endsWith("validate-harness-retention.mjs"));

if (isMain) {
  main();
}
