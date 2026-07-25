import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  appendRecord,
  buildEfficiencyRecord,
  normalizeTaskName,
} from "./efficiency-ledger.mts";
import {
  findNewlyPassingFeatures,
  isPassingState,
  ledgerHasTask,
  lintEfficiencyLedger,
} from "./lint-efficiency-ledger.mts";

const ACTIVE_WORK = `## Active Work

| Feature | Behavior | State | Completion evidence / latest result | Files |
|---------|----------|-------|-------------------------------------|-------|
| Task efficiency ledger — Phase 9 | Timeline partition | **Passing** | **Focused:** 50 tests passed | \`scripts/efficiency-ledger.mts\` |
| Other task | Still active | **Active** | pending | \`src/example.ts\` |
`;

const HEAD_ACTIVE_WORK = `## Active Work

| Feature | Behavior | State | Completion evidence / latest result | Files |
|---------|----------|-------|-------------------------------------|-------|
| Task efficiency ledger — Phase 9 | Timeline partition | **Active** | pending | \`scripts/efficiency-ledger.mts\` |
| Other task | Still active | **Active** | pending | \`src/example.ts\` |
`;

describe("lint-efficiency-ledger", () => {
  it("detects Passing state", () => {
    expect(isPassingState("**Passing**")).toBe(true);
    expect(isPassingState("**Active**")).toBe(false);
  });

  it("finds newly Passing features vs HEAD", () => {
    const current = `# Status\n\n${ACTIVE_WORK}`;
    const head = `# Status\n\n${HEAD_ACTIVE_WORK}`;
    expect(findNewlyPassingFeatures(current, head)).toEqual([
      "Task efficiency ledger — Phase 9",
    ]);
  });

  it("matches ledger rows with normalizeTaskName", () => {
    const dir = mkdtempSync(join(tmpdir(), "lint-efficiency-"));
    const ledgerPath = "ledger.jsonl";

    appendRecord(
      buildEfficiencyRecord({
        taskName: "Task efficiency ledger — Phase 9",
        input: {
          user_messages: 1,
          handoffs: 0,
          rework_turns: 0,
          spend_usd: null,
          started_at: "2026-07-25T10:00:00.000Z",
        },
        endedAt: "2026-07-25T11:00:00.000Z",
      }),
      { ledgerPath, cwd: dir },
    );

    expect(
      ledgerHasTask("Task efficiency ledger - Phase 9", ledgerPath, dir),
    ).toBe(true);
    expect(normalizeTaskName("Task efficiency ledger — Phase 9")).toBe(
      normalizeTaskName("Task efficiency ledger - Phase 9"),
    );
  });

  it("reports missing ledger row for newly Passing feature", () => {
    const dir = mkdtempSync(join(tmpdir(), "lint-efficiency-missing-"));
    const statusPath = "PROJECT-STATUS.md";
    writeFileSync(join(dir, statusPath), `# Status\n\n${ACTIVE_WORK}`, "utf8");

    const issues = lintEfficiencyLedger({
      statusPath,
      ledgerPath: "ledger.jsonl",
      cwd: dir,
      headRef: "INVALID_REF",
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.feature).toBe("Task efficiency ledger — Phase 9");
  });

  it("passes when ledger row exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "lint-efficiency-ok-"));
    const statusPath = "PROJECT-STATUS.md";
    const ledgerPath = "ledger.jsonl";

    writeFileSync(join(dir, statusPath), `# Status\n\n${ACTIVE_WORK}`, "utf8");
    appendRecord(
      buildEfficiencyRecord({
        taskName: "Task efficiency ledger — Phase 9",
        input: {
          user_messages: 1,
          handoffs: 0,
          rework_turns: 0,
          spend_usd: null,
          started_at: "2026-07-25T10:00:00.000Z",
        },
        endedAt: "2026-07-25T11:00:00.000Z",
      }),
      { ledgerPath, cwd: dir },
    );

    const issues = lintEfficiencyLedger({
      statusPath,
      ledgerPath,
      cwd: dir,
      headRef: "INVALID_REF",
    });

    expect(issues).toEqual([]);
  });
});
