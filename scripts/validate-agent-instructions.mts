#!/usr/bin/env npx tsx
/**
 * Validates agent instruction architecture:
 * - AGENTS.md stays within line budget and routes to topic docs
 * - Cursor rules are not globally injected without allowlist
 * - Instruction files avoid duplicate-doc suffix patterns
 * - PROJECT-STATUS.md harness state is honest and complete
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import {
  validateProjectStatusContent,
  validateSessionExitContent,
  type Issue,
} from "./validate-project-status.mts";

const ROOT = join(import.meta.dirname, "..");
const AGENTS_PATH = join(ROOT, "AGENTS.md");
const PROJECT_STATUS_PATH = join(ROOT, "docs", "PROJECT-STATUS.md");
const CHECKLISTS_DIR = join(ROOT, "docs", "checklists");
const PLAN_HARNESS_RULE_PATH = join(ROOT, ".cursor", "rules", "plan-harness-awareness.mdc");
const RULES_DIR = join(ROOT, ".cursor", "rules");

const REQUIRED_PLANNING_CHECKLISTS = [
  "planning-router.md",
  "architecture-review-checklist.md",
  "feature-planning-checklist.md",
  "refactor-planning-checklist.md",
  "bugfix-planning-checklist.md",
  "testing-verification-checklist.md",
  "harness-status-checklist.md",
  "session-exit-checklist.md",
];
const MAX_AGENTS_LINES = 150;

/** Rules allowed to use alwaysApply: true (empty = none allowed). */
const ALWAYS_APPLY_ALLOWLIST = new Set<string>(["plan-harness-awareness.mdc"]);

const REQUIRED_AGENTS_LINKS = [
  "docs/CONSTRAINTS.md",
  "docs/PROJECT-STATUS.md",
  "src/lib/design-system/ARCHITECTURE.md",
  "src/lib/chart/ARCHITECTURE.md",
  "src/lib/ai/ARCHITECTURE.md",
  "src/lib/persistence/ARCHITECTURE.md",
];

const DUPLICATE_DOC_PATTERN = /[_-](fixed|new|clean)\.(md|mdc)/i;

function fail(issues: Issue[]): never {
  console.error("Instruction architecture validation failed:\n");
  for (const { file, message } of issues) {
    console.error(`  ${file}: ${message}`);
  }
  console.error(`\n${issues.length} issue(s).`);
  process.exit(1);
}

function readText(path: string): string {
  if (!existsSync(path)) {
    fail([{ file: relative(ROOT, path), message: "file not found" }]);
  }
  return readFileSync(path, "utf8");
}

function validateAgentsMd(issues: Issue[]): void {
  const rel = "AGENTS.md";
  const content = readText(AGENTS_PATH);
  const lines = content.split("\n");

  if (lines.length > MAX_AGENTS_LINES) {
    issues.push({
      file: rel,
      message: `${lines.length} lines exceeds max ${MAX_AGENTS_LINES}`,
    });
  }

  if (!/read when/i.test(content)) {
    issues.push({
      file: rel,
      message: 'missing "read when" routing language in Key Docs section',
    });
  }

  if (!/Instruction Hygiene/i.test(content)) {
    issues.push({
      file: rel,
      message: "missing Instruction Hygiene section",
    });
  }

  for (const link of REQUIRED_AGENTS_LINKS) {
    if (!content.includes(link)) {
      issues.push({
        file: rel,
        message: `missing required link to ${link}`,
      });
    }
  }
}

function validateCursorRules(issues: Issue[]): void {
  if (!existsSync(RULES_DIR)) return;

  const files = readdirSync(RULES_DIR).filter((f) => f.endsWith(".mdc"));

  for (const file of files) {
    const path = join(RULES_DIR, file);
    const content = readText(path);
    const rel = relative(ROOT, path);

    if (/alwaysApply:\s*true/i.test(content) && !ALWAYS_APPLY_ALLOWLIST.has(file)) {
      issues.push({
        file: rel,
        message:
          "uses alwaysApply: true — scope with globs or add to ALWAYS_APPLY_ALLOWLIST in validate-agent-instructions.mts",
      });
    }

    if (DUPLICATE_DOC_PATTERN.test(content)) {
      issues.push({
        file: rel,
        message: "references duplicate-doc suffix pattern (_fixed, _new, _clean)",
      });
    }
  }
}

function validateInstructionFiles(issues: Issue[]): void {
  const paths = [AGENTS_PATH, join(ROOT, "docs", "CONSTRAINTS.md")];

  for (const path of paths) {
    if (!existsSync(path)) continue;
    const content = readText(path);
    const rel = relative(ROOT, path);

    const matches = content.match(
      /[`\[(]?([^\s`\])]+\.(?:md|mdc))[`\])]?/g,
    );
    if (!matches) continue;

    for (const raw of matches) {
      const cleaned = raw.replace(/^[`[(]+|[`\])]+$/g, "");
      if (DUPLICATE_DOC_PATTERN.test(cleaned)) {
        issues.push({
          file: rel,
          message: `references duplicate-doc path: ${cleaned}`,
        });
      }
    }
  }
}

function validatePlanningChecklists(issues: Issue[]): void {
  for (const file of REQUIRED_PLANNING_CHECKLISTS) {
    const path = join(CHECKLISTS_DIR, file);
    if (!existsSync(path)) {
      issues.push({
        file: relative(ROOT, path),
        message: "required planning checklist file missing",
      });
    }
  }

  if (!existsSync(PLAN_HARNESS_RULE_PATH)) {
    issues.push({
      file: relative(ROOT, PLAN_HARNESS_RULE_PATH),
      message: "plan-harness-awareness rule missing",
    });
    return;
  }

  const ruleContent = readText(PLAN_HARNESS_RULE_PATH);
  if (!ruleContent.includes("docs/checklists/planning-router.md")) {
    issues.push({
      file: relative(ROOT, PLAN_HARNESS_RULE_PATH),
      message: "must reference docs/checklists/planning-router.md",
    });
  }
  if (!ruleContent.includes("docs/checklists/architecture-review-checklist.md")) {
    issues.push({
      file: relative(ROOT, PLAN_HARNESS_RULE_PATH),
      message: "must reference docs/checklists/architecture-review-checklist.md",
    });
  }
  if (!/Checklist Review/i.test(ruleContent)) {
    issues.push({
      file: relative(ROOT, PLAN_HARNESS_RULE_PATH),
      message: 'must require a "Checklist Review" section in plans',
    });
  }
}

function validateProjectStatus(issues: Issue[]): void {
  const rel = "docs/PROJECT-STATUS.md";
  const content = readText(PROJECT_STATUS_PATH);
  issues.push(...validateProjectStatusContent(content, rel));
  issues.push(...validateSessionExitContent(content, rel));
}

function main(): void {
  const issues: Issue[] = [];

  validateAgentsMd(issues);
  validateCursorRules(issues);
  validateInstructionFiles(issues);
  validatePlanningChecklists(issues);
  validateProjectStatus(issues);

  if (issues.length > 0) {
    fail(issues);
  }

  console.log("Instruction architecture validation passed.");
}

main();
