import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  appendRecord,
  buildEfficiencyInputFromArgs,
  buildEfficiencyRecord,
  clearActiveTaskStamp,
  hasDuplicateTaskEnd,
  mergeEfficiencyInput,
  parseEfficiencyArgs,
  parseEfficiencyFile,
  readActiveTaskStamp,
  readLedgerRecords,
  startTask,
  validateEfficiencyInput,
  validateEfficiencyRecord,
} from "./efficiency-ledger.mts";

describe("efficiency-ledger validation", () => {
  it("accepts valid input", () => {
    expect(
      validateEfficiencyInput({
        user_messages: 5,
        handoffs: 1,
        rework_turns: 0,
        spend_usd: 2.5,
      }),
    ).toEqual([]);
  });

  it("rejects missing and negative fields", () => {
    const errors = validateEfficiencyInput({
      user_messages: -1,
      handoffs: 0,
      rework_turns: 0,
      spend_usd: 1,
    });
    expect(errors.some((e) => e.includes("user_messages"))).toBe(true);
  });

  it("rejects ended_at before started_at", () => {
    const record = buildEfficiencyRecord({
      taskName: "Example — Phase 1",
      input: {
        user_messages: 1,
        handoffs: 0,
        rework_turns: 0,
        spend_usd: 1,
        started_at: "2026-07-25T18:00:00.000Z",
      },
      endedAt: "2026-07-25T17:00:00.000Z",
    });
    expect(validateEfficiencyRecord(record)).toContain("ended_at must be >= started_at");
  });
});

describe("efficiency-ledger storage", () => {
  it("starts task and writes active stamp", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const activePath = ".edge/efficiency-active.json";

    const stamp = startTask(
      { name: "Example — Phase 1", spendBaselineUsd: 10 },
      { activePath, cwd: dir },
    );

    expect(stamp.task_name).toBe("Example — Phase 1");
    expect(readActiveTaskStamp(activePath, dir)?.spend_baseline_usd).toBe(10);
  });

  it("appends record to ledger and clears active stamp", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const ledgerPath = "docs/evidence/efficiency/ledger.jsonl";
    const activePath = ".edge/efficiency-active.json";

    startTask({ name: "Example — Phase 1" }, { activePath, cwd: dir });

    const record = mergeEfficiencyInput({
      taskName: "Example — Phase 1",
      input: {
        user_messages: 8,
        handoffs: 1,
        rework_turns: 0,
        spend_usd: 2.5,
      },
      ledgerPath,
      activePath,
      cwd: dir,
      endedAt: "2026-07-25T18:00:00.000Z",
    });

    expect(record.outcome).toBe("Passing");
    expect(readLedgerRecords(ledgerPath, dir)).toHaveLength(1);
    expect(readActiveTaskStamp(activePath, dir)).toBeNull();
  });

  it("rejects duplicate task_name + ended_at", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const ledgerPath = "ledger.jsonl";
    const endedAt = "2026-07-25T18:00:00.000Z";

    appendRecord(
      buildEfficiencyRecord({
        taskName: "Example — Phase 1",
        input: {
          user_messages: 1,
          handoffs: 0,
          rework_turns: 0,
          spend_usd: 1,
          started_at: "2026-07-25T17:00:00.000Z",
        },
        endedAt,
        id: "id-1",
      }),
      { ledgerPath, cwd: dir },
    );

    expect(() =>
      appendRecord(
        buildEfficiencyRecord({
          taskName: "Example — Phase 1",
          input: {
            user_messages: 2,
            handoffs: 0,
            rework_turns: 0,
            spend_usd: 1,
            started_at: "2026-07-25T17:00:00.000Z",
          },
          endedAt,
          id: "id-2",
        }),
        { ledgerPath, cwd: dir },
      ),
    ).toThrow(/duplicate ledger row/);
  });

  it("detects duplicate pairs", () => {
    const records = [
      buildEfficiencyRecord({
        taskName: "Example — Phase 1",
        input: {
          user_messages: 1,
          handoffs: 0,
          rework_turns: 0,
          spend_usd: 1,
          started_at: "2026-07-25T17:00:00.000Z",
        },
        endedAt: "2026-07-25T18:00:00.000Z",
        id: "id-1",
      }),
    ];
    expect(
      hasDuplicateTaskEnd(records, "Example — Phase 1", "2026-07-25T18:00:00.000Z"),
    ).toBe(true);
  });

  it("parses efficiency file JSON", () => {
    const input = parseEfficiencyFile(
      JSON.stringify({
        user_messages: 3,
        handoffs: 0,
        rework_turns: 1,
        spend_usd: 0.75,
      }),
    );
    expect(input.user_messages).toBe(3);
    expect(input.rework_turns).toBe(1);
  });

  it("builds input from CLI args", () => {
    const parsed = parseEfficiencyArgs([
      "--user-messages",
      "4",
      "--handoffs",
      "1",
      "--rework-turns",
      "0",
      "--spend-usd",
      "1.25",
    ]);
    const { input, errors } = buildEfficiencyInputFromArgs(parsed);
    expect(errors).toEqual([]);
    expect(input?.spend_usd).toBe(1.25);
  });

  it("requires started_at when no active stamp", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    expect(() =>
      mergeEfficiencyInput({
        taskName: "Example — Phase 1",
        input: {
          user_messages: 1,
          handoffs: 0,
          rework_turns: 0,
          spend_usd: 1,
        },
        cwd: dir,
      }),
    ).toThrow(/started_at is required/);
  });

  it("dry-run does not write ledger", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const ledgerPath = "ledger.jsonl";
    startTask({ name: "Example — Phase 1" }, { cwd: dir });

    mergeEfficiencyInput({
      taskName: "Example — Phase 1",
      input: {
        user_messages: 1,
        handoffs: 0,
        rework_turns: 0,
        spend_usd: 1,
      },
      ledgerPath,
      cwd: dir,
      dryRun: true,
    });

    expect(readLedgerRecords(ledgerPath, dir)).toHaveLength(0);
  });

  it("clearActiveTaskStamp removes file", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const activePath = ".edge/efficiency-active.json";
    startTask({ name: "Example — Phase 1" }, { activePath, cwd: dir });
    clearActiveTaskStamp(activePath, dir);
    expect(readActiveTaskStamp(activePath, dir)).toBeNull();
  });

  it("reads ledger from file", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const ledgerPath = "ledger.jsonl";
    const record = buildEfficiencyRecord({
      taskName: "Example — Phase 1",
      input: {
        user_messages: 1,
        handoffs: 0,
        rework_turns: 0,
        spend_usd: 1,
        started_at: "2026-07-25T17:00:00.000Z",
      },
      endedAt: "2026-07-25T18:00:00.000Z",
      id: "id-1",
    });
    writeFileSync(join(dir, ledgerPath), `${JSON.stringify(record)}\n`, "utf8");
    expect(readLedgerRecords(ledgerPath, dir)).toHaveLength(1);
  });
});
