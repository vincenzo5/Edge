import { describe, expect, it } from "vitest";
import { appendFileSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  appendRecord,
  attachSession,
  buildEfficiencyInputFromArgs,
  buildEfficiencyRecord,
  countPromptsInWindow,
  countReworkTurns,
  countUserMessagesFromSessions,
  getPreviousLedgerEndedAt,
  importUsageRecords,
  mergeEfficiencyInput,
  migrateV0StampToRegistry,
  normalizeTaskName,
  parseEfficiencyArgs,
  parseEfficiencyFile,
  pauseTask,
  readActiveRegistry,
  readActiveTaskEntry,
  readActiveTaskStamp,
  readLedgerRecords,
  reconcileLedgerSpend,
  reconcileTaskSpend,
  removeTaskFromRegistry,
  resolveEffectiveLedgerRecords,
  resolveTaskStartedAt,
  resumeTask,
  startTask,
  switchTask,
  validateEfficiencyInput,
  validateEfficiencyRecord,
} from "./efficiency-ledger.mts";

describe("efficiency-ledger validation", () => {
  it("accepts valid input with spend", () => {
    expect(
      validateEfficiencyInput({
        user_messages: 5,
        handoffs: 1,
        rework_turns: 0,
        spend_usd: 2.5,
      }),
    ).toEqual([]);
  });

  it("accepts null spend (deferred reconcile)", () => {
    expect(
      validateEfficiencyInput({
        user_messages: 5,
        handoffs: 0,
        rework_turns: 0,
        spend_usd: null,
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

describe("efficiency-ledger multi-task registry", () => {
  it("starts task and writes registry entry", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const activePath = ".edge/efficiency-active.json";

    const entry = startTask(
      { name: "Example — Phase 1", spendBaselineUsd: 10 },
      { activePath, cwd: dir },
    );

    expect(entry.task_name).toBe("Example — Phase 1");
    expect(readActiveTaskEntry("Example — Phase 1", activePath, dir)?.spend_baseline_usd).toBe(10);
    expect(readActiveRegistry(activePath, dir).foreground).toBe("Example — Phase 1");
  });

  it("does not overwrite when starting task B while A is open", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const activePath = ".edge/efficiency-active.json";

    startTask({ name: "Task A — Phase 1" }, { activePath, cwd: dir });
    startTask({ name: "Task B — Phase 1" }, { activePath, cwd: dir });

    const registry = readActiveRegistry(activePath, dir);
    expect(registry.tasks["Task A — Phase 1"]).toBeDefined();
    expect(registry.tasks["Task B — Phase 1"]).toBeDefined();
    expect(registry.foreground).toBe("Task B — Phase 1");
  });

  it("rejects duplicate open task name when strict", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const activePath = ".edge/efficiency-active.json";
    startTask({ name: "Example — Phase 1" }, { activePath, cwd: dir });
    expect(() =>
      startTask({ name: "Example — Phase 1", strict: true }, { activePath, cwd: dir }),
    ).toThrow(/already open/);
  });

  it("returns existing entry when starting duplicate without strict", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const activePath = ".edge/efficiency-active.json";
    const first = startTask(
      { name: "Example — Phase 1", startedAt: "2026-07-25T10:00:00.000Z" },
      { activePath, cwd: dir },
    );
    const second = startTask({ name: "Example — Phase 1" }, { activePath, cwd: dir });
    expect(second.started_at).toBe(first.started_at);
    expect(Object.keys(readActiveRegistry(activePath, dir).tasks)).toHaveLength(1);
  });

  it("pause and resume switch foreground", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const activePath = ".edge/efficiency-active.json";

    startTask({ name: "Task A" }, { activePath, cwd: dir });
    startTask({ name: "Task B" }, { activePath, cwd: dir });
    pauseTask("Task B", { activePath, cwd: dir, now: "2026-07-25T13:00:00.000Z" });
    resumeTask("Task A", { activePath, cwd: dir, now: "2026-07-25T13:05:00.000Z" });

    const registry = readActiveRegistry(activePath, dir);
    expect(registry.foreground).toBe("Task A");
    expect(registry.tasks["Task B"]?.status).toBe("paused");
  });

  it("switch pauses foreground and resumes target", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const activePath = ".edge/efficiency-active.json";

    startTask({ name: "Task A" }, { activePath, cwd: dir });
    startTask({ name: "Task B" }, { activePath, cwd: dir });
    switchTask("Task A", { activePath, cwd: dir });

    const registry = readActiveRegistry(activePath, dir);
    expect(registry.foreground).toBe("Task A");
    expect(registry.tasks["Task B"]?.status).toBe("paused");
  });

  it("migrates v0 single stamp to registry", () => {
    const registry = migrateV0StampToRegistry({
      task_name: "Legacy task",
      started_at: "2026-07-25T10:00:00.000Z",
    });
    expect(registry.version).toBe(1);
    expect(registry.tasks["Legacy task"]?.status).toBe("active");
  });

  it("attach adds session id", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const activePath = ".edge/efficiency-active.json";
    startTask({ name: "Example" }, { activePath, cwd: dir });
    attachSession("Example", "session-abc", { activePath, cwd: dir });
    expect(readActiveTaskEntry("Example", activePath, dir)?.session_ids).toEqual(["session-abc"]);
  });
});

describe("efficiency-ledger storage", () => {
  it("appends record and removes only closed task from registry", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const ledgerPath = "docs/evidence/efficiency/ledger.jsonl";
    const activePath = ".edge/efficiency-active.json";

    startTask({ name: "Task A" }, { activePath, cwd: dir });
    startTask({ name: "Task B" }, { activePath, cwd: dir });

    const record = mergeEfficiencyInput({
      taskName: "Task A",
      input: {
        user_messages: 8,
        handoffs: 1,
        rework_turns: 0,
        spend_usd: null,
      },
      ledgerPath,
      activePath,
      cwd: dir,
      endedAt: "2026-07-25T18:00:00.000Z",
    });

    expect(record.outcome).toBe("Passing");
    expect(record.spend_usd).toBeNull();
    expect(readLedgerRecords(ledgerPath, dir)).toHaveLength(1);
    expect(readActiveTaskEntry("Task A", activePath, dir)).toBeNull();
    expect(readActiveTaskEntry("Task B", activePath, dir)).not.toBeNull();
  });

  it("parses efficiency file JSON with null spend", () => {
    const input = parseEfficiencyFile(
      JSON.stringify({
        user_messages: 3,
        handoffs: 0,
        rework_turns: 1,
      }),
    );
    expect(input.user_messages).toBe(3);
    expect(input.spend_usd).toBeNull();
  });

  it("auto-builds input from registry without spend", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const activePath = ".edge/efficiency-active.json";
    startTask(
      { name: "Example — Phase 1", startedAt: "2026-07-25T10:00:00.000Z" },
      { activePath, cwd: dir },
    );
    attachSession("Example — Phase 1", "s1", { activePath, cwd: dir });
    attachSession("Example — Phase 1", "s2", { activePath, cwd: dir });

    const { input, errors } = buildEfficiencyInputFromArgs(
      parseEfficiencyArgs(["--name", "Example — Phase 1", "--user-messages", "5"]),
      { taskName: "Example — Phase 1", cwd: dir, activePath },
    );
    expect(errors).toEqual([]);
    expect(input?.handoffs).toBe(1);
    expect(input?.spend_usd).toBeNull();
    expect(input?.started_at).toBe("2026-07-25T10:00:00.000Z");
  });

  it("requires started_at when no registry entry", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    expect(() =>
      mergeEfficiencyInput({
        taskName: "Example — Phase 1",
        input: {
          user_messages: 1,
          handoffs: 0,
          rework_turns: 0,
          spend_usd: null,
        },
        cwd: dir,
      }),
    ).toThrow(/started_at is required/);
  });

  it("counts user messages from transcript fixtures", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-transcripts-"));
    const sessionDir = join(dir, "session-1");
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, "0.jsonl"),
      [
        '{"role":"user","message":{"content":[{"type":"text","text":"hi"}]}}',
        '{"role":"assistant","message":{"content":[{"type":"text","text":"hello"}]}}',
        '{"role":"user","message":{"content":[{"type":"text","text":"again"}]}}',
      ].join("\n"),
      "utf8",
    );

    expect(
      countUserMessagesFromSessions({
        sessionIds: ["session-1"],
        sinceIso: "2026-01-01T00:00:00.000Z",
        transcriptsDir: dir,
      }),
    ).toBe(2);
  });

  it("readActiveTaskStamp returns foreground entry", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const activePath = ".edge/efficiency-active.json";
    startTask({ name: "Example — Phase 1" }, { activePath, cwd: dir });
    expect(readActiveTaskStamp(activePath, dir)?.task_name).toBe("Example — Phase 1");
  });

  it("removeTaskFromRegistry deletes file when empty", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-ledger-"));
    const activePath = ".edge/efficiency-active.json";
    startTask({ name: "Only task" }, { activePath, cwd: dir });
    removeTaskFromRegistry("Only task", activePath, dir);
    expect(readActiveRegistry(activePath, dir).tasks).toEqual({});
  });
});

describe("efficiency usage import and reconcile", () => {
  it("imports usage records with dedupe", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-usage-"));
    const usagePath = "usage.jsonl";
    const row = {
      id: "u1",
      started_at: "2026-07-25T10:00:00.000Z",
      ended_at: "2026-07-25T11:00:00.000Z",
      spend_usd: 1.5,
      tokens: 1000,
      imported_at: "2026-07-25T12:00:00.000Z",
    };

    const first = importUsageRecords([row], { usagePath, cwd: dir });
    const second = importUsageRecords([row], { usagePath, cwd: dir });
    expect(first.imported).toBe(1);
    expect(second.skipped).toBe(1);
  });

  it("reconciles spend onto ledger row via correction", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-reconcile-"));
    const ledgerPath = "ledger.jsonl";
    const usagePath = "usage.jsonl";

    appendRecord(
      buildEfficiencyRecord({
        taskName: "Example — Phase 8",
        input: {
          user_messages: 3,
          handoffs: 0,
          rework_turns: 0,
          spend_usd: null,
          started_at: "2026-07-25T10:00:00.000Z",
        },
        endedAt: "2026-07-25T12:00:00.000Z",
        id: "task-row-1",
      }),
      { ledgerPath, cwd: dir },
    );

    importUsageRecords(
      [
        {
          id: "usage-1",
          started_at: "2026-07-25T10:30:00.000Z",
          ended_at: "2026-07-25T11:30:00.000Z",
          spend_usd: 2,
          tokens: 500,
          imported_at: "2026-07-25T13:00:00.000Z",
        },
      ],
      { usagePath, cwd: dir },
    );

    const task = readLedgerRecords(ledgerPath, dir)[0]!;
    const usageRecords = [
      {
        id: "usage-1",
        started_at: "2026-07-25T10:30:00.000Z",
        ended_at: "2026-07-25T11:30:00.000Z",
        spend_usd: 2,
        tokens: 500,
        imported_at: "2026-07-25T13:00:00.000Z",
      },
    ];
    const attributed = reconcileTaskSpend({ task, usageRecords, allTasks: [task] });
    expect(attributed.spend_usd).toBe(2);
    expect(attributed.tokens).toBe(500);

    const result = reconcileLedgerSpend({ ledgerPath, usagePath, cwd: dir });
    expect(result.reconciled).toBe(1);

    const all = readLedgerRecords(ledgerPath, dir);
    const correction = all.find((r) => r.corrects === "task-row-1");
    expect(correction?.spend_usd).toBe(2);

    const effective = resolveEffectiveLedgerRecords(all);
    expect(effective[0]?.spend_usd).toBe(2);
  });

  it("pro-rata splits usage across overlapping tasks", () => {
    const taskA = buildEfficiencyRecord({
      taskName: "Task A",
      input: {
        user_messages: 1,
        handoffs: 0,
        rework_turns: 0,
        spend_usd: null,
        started_at: "2026-07-25T10:00:00.000Z",
      },
      endedAt: "2026-07-25T12:00:00.000Z",
      id: "a",
    });
    const taskB = buildEfficiencyRecord({
      taskName: "Task B",
      input: {
        user_messages: 1,
        handoffs: 0,
        rework_turns: 0,
        spend_usd: null,
        started_at: "2026-07-25T11:00:00.000Z",
      },
      endedAt: "2026-07-25T13:00:00.000Z",
      id: "b",
    });
    const usage = {
      id: "u1",
      started_at: "2026-07-25T11:00:00.000Z",
      ended_at: "2026-07-25T12:00:00.000Z",
      spend_usd: 2,
      imported_at: "2026-07-25T14:00:00.000Z",
    };

    const aSpend = reconcileTaskSpend({
      task: taskA,
      usageRecords: [usage],
      allTasks: [taskA, taskB],
    });
    const bSpend = reconcileTaskSpend({
      task: taskB,
      usageRecords: [usage],
      allTasks: [taskA, taskB],
    });
    expect(aSpend.spend_usd + bSpend.spend_usd).toBeCloseTo(2, 5);
  });

  it("reconciles zero-spend rows when includeZero is set", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-reconcile-zero-"));
    const ledgerPath = "ledger.jsonl";
    const usagePath = "usage.jsonl";

    appendRecord(
      buildEfficiencyRecord({
        taskName: "Example — zero spend",
        input: {
          user_messages: 1,
          handoffs: 0,
          rework_turns: 0,
          spend_usd: 0,
          started_at: "2026-07-25T10:00:00.000Z",
        },
        endedAt: "2026-07-25T11:00:00.000Z",
        id: "zero-row",
      }),
      { ledgerPath, cwd: dir },
    );

    importUsageRecords(
      [
        {
          id: "usage-zero",
          started_at: "2026-07-25T10:15:00.000Z",
          ended_at: "2026-07-25T10:45:00.000Z",
          spend_usd: 1.25,
          imported_at: "2026-07-25T12:00:00.000Z",
        },
      ],
      { usagePath, cwd: dir },
    );

    const without = reconcileLedgerSpend({ ledgerPath, usagePath, cwd: dir });
    expect(without.reconciled).toBe(0);

    const withZero = reconcileLedgerSpend({
      ledgerPath,
      usagePath,
      cwd: dir,
      includeZero: true,
    });
    expect(withZero.reconciled).toBe(1);
  });
});

describe("efficiency-ledger phase 9 timeline partition", () => {
  it("normalizeTaskName folds whitespace and dashes", () => {
    expect(normalizeTaskName("Task efficiency ledger — Phase 9")).toBe(
      "task efficiency ledger - phase 9",
    );
    expect(normalizeTaskName("Task  efficiency  ledger - Phase 9")).toBe(
      "task efficiency ledger - phase 9",
    );
  });

  it("chains started_at from previous ledger ended_at", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-chain-"));
    const ledgerPath = "ledger.jsonl";
    const activePath = ".edge/efficiency-active.json";

    appendRecord(
      buildEfficiencyRecord({
        taskName: "Prior task",
        input: {
          user_messages: 1,
          handoffs: 0,
          rework_turns: 0,
          spend_usd: null,
          started_at: "2026-07-25T08:00:00.000Z",
        },
        endedAt: "2026-07-25T09:00:00.000Z",
      }),
      { ledgerPath, cwd: dir },
    );

    startTask(
      { name: "Next task", startedAt: "2026-07-25T17:00:00.000Z" },
      { activePath, cwd: dir },
    );

    const startedAt = resolveTaskStartedAt({
      registryStartedAt: "2026-07-25T17:00:00.000Z",
      ledgerPath,
      cwd: dir,
      endedAt: "2026-07-25T18:00:00.000Z",
    });

    expect(startedAt).toBe("2026-07-25T09:00:00.000Z");
    expect(getPreviousLedgerEndedAt(ledgerPath, dir)).toBe("2026-07-25T09:00:00.000Z");
  });

  it("clamps started_at to first prompt when gap exceeds max hours", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-gap-"));
    const ledgerPath = "ledger.jsonl";
    const promptsPath = ".edge/prompts.jsonl";

    appendRecord(
      buildEfficiencyRecord({
        taskName: "Prior task",
        input: {
          user_messages: 1,
          handoffs: 0,
          rework_turns: 0,
          spend_usd: null,
          started_at: "2026-07-25T08:00:00.000Z",
        },
        endedAt: "2026-07-25T09:00:00.000Z",
      }),
      { ledgerPath, cwd: dir },
    );

    mkdirSync(join(dir, ".edge"), { recursive: true });
    appendFileSync(
      join(dir, promptsPath),
      [
        JSON.stringify({
          ts: "2026-07-25T20:00:00.000Z",
          conversation_id: "conv-1",
          generation_id: "gen-1",
          prompt_head: "start phase 9",
          prompt_length: 13,
        }),
      ].join("\n") + "\n",
      "utf8",
    );

    const startedAt = resolveTaskStartedAt({
      registryStartedAt: "2026-07-25T17:00:00.000Z",
      ledgerPath,
      promptsPath,
      cwd: dir,
      endedAt: "2026-07-25T21:00:00.000Z",
    });

    expect(startedAt).toBe("2026-07-25T20:00:00.000Z");
  });

  it("auto-fills user_messages and handoffs from prompt log", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-prompts-"));
    const activePath = ".edge/efficiency-active.json";
    const promptsPath = ".edge/prompts.jsonl";

    startTask(
      { name: "Example — Phase 9", startedAt: "2026-07-25T10:00:00.000Z" },
      { activePath, cwd: dir },
    );

    mkdirSync(join(dir, ".edge"), { recursive: true });
    appendFileSync(
      join(dir, promptsPath),
      [
        JSON.stringify({
          ts: "2026-07-25T10:05:00.000Z",
          conversation_id: "conv-a",
          generation_id: "g1",
          prompt_head: "first",
          prompt_length: 5,
        }),
        JSON.stringify({
          ts: "2026-07-25T10:10:00.000Z",
          conversation_id: "conv-b",
          generation_id: "g2",
          prompt_head: "handoff",
          prompt_length: 7,
        }),
      ].join("\n") + "\n",
      "utf8",
    );

    const counts = countPromptsInWindow({
      sinceIso: "2026-07-25T10:00:00.000Z",
      untilIso: "2026-07-25T11:00:00.000Z",
      promptsPath,
      cwd: dir,
    });
    expect(counts.userMessages).toBe(2);
    expect(counts.handoffs).toBe(1);

    const { input, errors } = buildEfficiencyInputFromArgs(
      parseEfficiencyArgs(["--name", "Example — Phase 9"]),
      {
        taskName: "Example — Phase 9",
        cwd: dir,
        activePath,
        promptsPath,
        endedAt: "2026-07-25T11:00:00.000Z",
      },
    );
    expect(errors).toEqual([]);
    expect(input?.user_messages).toBe(2);
    expect(input?.handoffs).toBe(1);
  });

  it("counts rework turns after prior same-name ledger row", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-rework-"));
    const ledgerPath = "ledger.jsonl";
    const promptsPath = ".edge/prompts.jsonl";

    appendRecord(
      buildEfficiencyRecord({
        taskName: "Example — Phase 9",
        input: {
          user_messages: 1,
          handoffs: 0,
          rework_turns: 0,
          spend_usd: null,
          started_at: "2026-07-25T08:00:00.000Z",
        },
        endedAt: "2026-07-25T09:00:00.000Z",
      }),
      { ledgerPath, cwd: dir },
    );

    mkdirSync(join(dir, ".edge"), { recursive: true });
    appendFileSync(
      join(dir, promptsPath),
      [
        JSON.stringify({
          ts: "2026-07-25T10:00:00.000Z",
          conversation_id: "conv-1",
          generation_id: "g1",
          prompt_head: "reopen",
          prompt_length: 6,
        }),
      ].join("\n") + "\n",
      "utf8",
    );

    expect(
      countReworkTurns({
        taskName: "Example — Phase 9",
        sinceIso: "2026-07-25T09:30:00.000Z",
        untilIso: "2026-07-25T11:00:00.000Z",
        promptsPath,
        ledgerPath,
        cwd: dir,
      }),
    ).toBe(1);
  });

  it("parses transcript timestamps from message wrapper", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-transcript-ts-"));
    const sessionDir = join(dir, "session-1");
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, "0.jsonl"),
      [
        '{"role":"user","message":"<timestamp>2026-07-25T12:00:00.000Z</timestamp>\\nhello"}',
        '{"role":"user","message":"<timestamp>2026-07-24T12:00:00.000Z</timestamp>\\nold"}',
      ].join("\n"),
      "utf8",
    );

    expect(
      countUserMessagesFromSessions({
        sessionIds: ["session-1"],
        sinceIso: "2026-07-25T11:00:00.000Z",
        transcriptsDir: dir,
      }),
    ).toBe(1);
  });

  it("merge uses chain-anchored started_at for meaningful window", () => {
    const dir = mkdtempSync(join(tmpdir(), "efficiency-merge-window-"));
    const ledgerPath = "ledger.jsonl";
    const activePath = ".edge/efficiency-active.json";

    appendRecord(
      buildEfficiencyRecord({
        taskName: "Prior",
        input: {
          user_messages: 1,
          handoffs: 0,
          rework_turns: 0,
          spend_usd: null,
          started_at: "2026-07-25T08:00:00.000Z",
        },
        endedAt: "2026-07-25T09:00:00.000Z",
      }),
      { ledgerPath, cwd: dir },
    );

    startTask(
      { name: "Current", startedAt: "2026-07-25T17:00:00.000Z" },
      { activePath, cwd: dir },
    );

    const record = mergeEfficiencyInput({
      taskName: "Current",
      input: {
        user_messages: 2,
        handoffs: 0,
        rework_turns: 0,
        spend_usd: null,
      },
      ledgerPath,
      activePath,
      cwd: dir,
      endedAt: "2026-07-25T18:00:00.000Z",
    });

    expect(record.started_at).toBe("2026-07-25T09:00:00.000Z");
    expect(Date.parse(record.ended_at) - Date.parse(record.started_at)).toBeGreaterThan(
      60 * 60 * 1000,
    );
  });
});
