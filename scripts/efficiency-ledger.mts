#!/usr/bin/env npx tsx
/**
 * Task efficiency ledger — append-only JSONL store gated at harness closeout.
 */

import { randomUUID } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

export const DEFAULT_LEDGER_PATH = "docs/evidence/efficiency/ledger.jsonl";
export const DEFAULT_ACTIVE_PATH = ".edge/efficiency-active.json";

export type EfficiencyOutcome = "Passing" | "Blocked" | "Abandoned";

export type EfficiencyRecord = {
  id: string;
  task_name: string;
  started_at: string;
  ended_at: string;
  outcome: EfficiencyOutcome;
  user_messages: number;
  handoffs: number;
  rework_turns: number;
  spend_usd: number;
  spend_baseline_usd?: number;
  tokens?: number | null;
  notes?: string;
  corrects?: string;
  void?: boolean;
};

export type EfficiencyInput = {
  user_messages: number;
  handoffs: number;
  rework_turns: number;
  spend_usd: number;
  spend_baseline_usd?: number;
  tokens?: number | null;
  notes?: string;
  started_at?: string;
  outcome?: EfficiencyOutcome;
};

export type ActiveTaskStamp = {
  task_name: string;
  started_at: string;
  spend_baseline_usd?: number;
};

const OUTCOMES: EfficiencyOutcome[] = ["Passing", "Blocked", "Abandoned"];

function isIsoDate(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

export function validateEfficiencyInput(input: EfficiencyInput): string[] {
  const errors: string[] = [];
  const requiredNumbers: Array<[keyof EfficiencyInput, string]> = [
    ["user_messages", "user_messages"],
    ["handoffs", "handoffs"],
    ["rework_turns", "rework_turns"],
    ["spend_usd", "spend_usd"],
  ];

  for (const [key, label] of requiredNumbers) {
    const value = input[key];
    if (value === undefined || value === null) {
      errors.push(`${label} is required`);
      continue;
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      errors.push(`${label} must be a non-negative number`);
    }
  }

  if (input.spend_baseline_usd !== undefined) {
    if (
      typeof input.spend_baseline_usd !== "number" ||
      !Number.isFinite(input.spend_baseline_usd) ||
      input.spend_baseline_usd < 0
    ) {
      errors.push("spend_baseline_usd must be a non-negative number");
    }
  }

  if (input.tokens !== undefined && input.tokens !== null) {
    if (
      typeof input.tokens !== "number" ||
      !Number.isFinite(input.tokens) ||
      input.tokens < 0
    ) {
      errors.push("tokens must be a non-negative number or null");
    }
  }

  if (input.started_at !== undefined && !isIsoDate(input.started_at)) {
    errors.push("started_at must be a valid ISO 8601 date");
  }

  if (input.outcome !== undefined && !OUTCOMES.includes(input.outcome)) {
    errors.push(`outcome must be one of: ${OUTCOMES.join(", ")}`);
  }

  return errors;
}

export function validateEfficiencyRecord(record: EfficiencyRecord): string[] {
  const errors = validateEfficiencyInput({
    user_messages: record.user_messages,
    handoffs: record.handoffs,
    rework_turns: record.rework_turns,
    spend_usd: record.spend_usd,
    spend_baseline_usd: record.spend_baseline_usd,
    tokens: record.tokens,
    started_at: record.started_at,
    outcome: record.outcome,
  });

  if (!record.id?.trim()) errors.push("id is required");
  if (!record.task_name?.trim()) errors.push("task_name is required");
  if (!record.started_at?.trim()) errors.push("started_at is required");
  if (!record.ended_at?.trim()) errors.push("ended_at is required");
  if (!record.ended_at || !isIsoDate(record.ended_at)) {
    errors.push("ended_at must be a valid ISO 8601 date");
  }
  if (!OUTCOMES.includes(record.outcome)) {
    errors.push(`outcome must be one of: ${OUTCOMES.join(", ")}`);
  }
  if (
    record.started_at &&
    record.ended_at &&
    isIsoDate(record.started_at) &&
    isIsoDate(record.ended_at) &&
    Date.parse(record.ended_at) < Date.parse(record.started_at)
  ) {
    errors.push("ended_at must be >= started_at");
  }

  return errors;
}

export function readLedgerRecords(
  ledgerPath = DEFAULT_LEDGER_PATH,
  cwd = process.cwd(),
): EfficiencyRecord[] {
  const absolute = resolve(cwd, ledgerPath);
  if (!existsSync(absolute)) return [];

  return readFileSync(absolute, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as EfficiencyRecord;
      } catch {
        throw new Error(`invalid JSON on ledger line ${index + 1}`);
      }
    });
}

export function hasDuplicateTaskEnd(
  records: EfficiencyRecord[],
  taskName: string,
  endedAt: string,
  excludeId?: string,
): boolean {
  const normalizedTask = taskName.trim();
  return records.some(
    (record) =>
      record.id !== excludeId &&
      record.task_name.trim() === normalizedTask &&
      record.ended_at === endedAt,
  );
}

export function readActiveTaskStamp(
  activePath = DEFAULT_ACTIVE_PATH,
  cwd = process.cwd(),
): ActiveTaskStamp | null {
  const absolute = resolve(cwd, activePath);
  if (!existsSync(absolute)) return null;

  const parsed = JSON.parse(readFileSync(absolute, "utf8")) as ActiveTaskStamp;
  if (!parsed.task_name?.trim() || !parsed.started_at?.trim()) {
    throw new Error("active task stamp is missing task_name or started_at");
  }
  if (!isIsoDate(parsed.started_at)) {
    throw new Error("active task stamp started_at is invalid");
  }
  return parsed;
}

export function writeActiveTaskStamp(
  stamp: ActiveTaskStamp,
  activePath = DEFAULT_ACTIVE_PATH,
  cwd = process.cwd(),
): void {
  const absolute = resolve(cwd, activePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(stamp, null, 2)}\n`, "utf8");
}

export function clearActiveTaskStamp(
  activePath = DEFAULT_ACTIVE_PATH,
  cwd = process.cwd(),
): void {
  const absolute = resolve(cwd, activePath);
  if (existsSync(absolute)) unlinkSync(absolute);
}

export function startTask(
  options: { name: string; spendBaselineUsd?: number; startedAt?: string },
  paths?: { activePath?: string; cwd?: string },
): ActiveTaskStamp {
  const cwd = paths?.cwd ?? process.cwd();
  const activePath = paths?.activePath ?? DEFAULT_ACTIVE_PATH;
  const stamp: ActiveTaskStamp = {
    task_name: options.name.trim(),
    started_at: options.startedAt ?? new Date().toISOString(),
  };
  if (options.spendBaselineUsd !== undefined) {
    stamp.spend_baseline_usd = options.spendBaselineUsd;
  }
  writeActiveTaskStamp(stamp, activePath, cwd);
  return stamp;
}

export function buildEfficiencyRecord(options: {
  taskName: string;
  input: EfficiencyInput;
  endedAt?: string;
  id?: string;
}): EfficiencyRecord {
  const endedAt = options.endedAt ?? new Date().toISOString();
  const record: EfficiencyRecord = {
    id: options.id ?? randomUUID(),
    task_name: options.taskName.trim(),
    started_at: options.input.started_at ?? endedAt,
    ended_at: endedAt,
    outcome: options.input.outcome ?? "Passing",
    user_messages: options.input.user_messages,
    handoffs: options.input.handoffs,
    rework_turns: options.input.rework_turns,
    spend_usd: options.input.spend_usd,
  };

  if (options.input.spend_baseline_usd !== undefined) {
    record.spend_baseline_usd = options.input.spend_baseline_usd;
  }
  if (options.input.tokens !== undefined) {
    record.tokens = options.input.tokens;
  }
  if (options.input.notes?.trim()) {
    record.notes = options.input.notes.trim();
  }

  return record;
}

export function appendRecord(
  record: EfficiencyRecord,
  options?: { ledgerPath?: string; cwd?: string; dryRun?: boolean },
): EfficiencyRecord {
  const cwd = options?.cwd ?? process.cwd();
  const ledgerPath = options?.ledgerPath ?? DEFAULT_LEDGER_PATH;
  const errors = validateEfficiencyRecord(record);
  if (errors.length > 0) {
    throw new Error(`efficiency record invalid:\n${errors.map((e) => `- ${e}`).join("\n")}`);
  }

  const existing = readLedgerRecords(ledgerPath, cwd);
  if (hasDuplicateTaskEnd(existing, record.task_name, record.ended_at, record.id)) {
    throw new Error(
      `duplicate ledger row for task "${record.task_name}" at ended_at ${record.ended_at}`,
    );
  }

  if (!options?.dryRun) {
    const absolute = resolve(cwd, ledgerPath);
    mkdirSync(dirname(absolute), { recursive: true });
    appendFileSync(absolute, `${JSON.stringify(record)}\n`, "utf8");
  }

  return record;
}

export function parseEfficiencyFile(content: string): EfficiencyInput {
  const parsed = JSON.parse(content.trim()) as Partial<EfficiencyInput>;
  return {
    user_messages: parsed.user_messages as number,
    handoffs: parsed.handoffs as number,
    rework_turns: parsed.rework_turns as number,
    spend_usd: parsed.spend_usd as number,
    spend_baseline_usd: parsed.spend_baseline_usd,
    tokens: parsed.tokens,
    notes: parsed.notes,
    started_at: parsed.started_at,
    outcome: parsed.outcome,
  };
}

export function mergeEfficiencyInput(options: {
  taskName: string;
  input: EfficiencyInput;
  activePath?: string;
  ledgerPath?: string;
  cwd?: string;
  endedAt?: string;
  dryRun?: boolean;
  clearActive?: boolean;
}): EfficiencyRecord {
  const cwd = options.cwd ?? process.cwd();
  const activePath = options.activePath ?? DEFAULT_ACTIVE_PATH;

  const inputErrors = validateEfficiencyInput(options.input);
  if (inputErrors.length > 0) {
    throw new Error(`efficiency input invalid:\n${inputErrors.map((e) => `- ${e}`).join("\n")}`);
  }

  const active = readActiveTaskStamp(activePath, cwd);
  const startedAt = options.input.started_at ?? active?.started_at;
  if (!startedAt) {
    throw new Error(
      "started_at is required — run npm run efficiency:start or pass --started-at / efficiency-file started_at",
    );
  }

  const spendBaseline =
    options.input.spend_baseline_usd ?? active?.spend_baseline_usd;

  const record = buildEfficiencyRecord({
    taskName: options.taskName,
    input: {
      ...options.input,
      started_at: startedAt,
      spend_baseline_usd: spendBaseline,
      outcome: options.input.outcome ?? "Passing",
    },
    endedAt: options.endedAt,
  });

  appendRecord(record, {
    ledgerPath: options.ledgerPath,
    cwd,
    dryRun: options.dryRun,
  });

  if (options.clearActive !== false && !options.dryRun) {
    clearActiveTaskStamp(activePath, cwd);
  }

  return record;
}

export function parseEfficiencyArgs(argv: string[]): {
  name?: string;
  efficiencyFile?: string;
  userMessages?: number;
  handoffs?: number;
  reworkTurns?: number;
  spendUsd?: number;
  spendBaselineUsd?: number;
  startedAt?: string;
  tokens?: number;
  notes?: string;
  outcome?: EfficiencyOutcome;
  dryRun: boolean;
} {
  const getFlag = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    if (index === -1 || index + 1 >= argv.length) return undefined;
    return argv[index + 1];
  };

  const parseNumber = (flag: string): number | undefined => {
    const raw = getFlag(flag);
    if (raw === undefined) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };

  const outcomeRaw = getFlag("--outcome");
  const outcome =
    outcomeRaw && OUTCOMES.includes(outcomeRaw as EfficiencyOutcome)
      ? (outcomeRaw as EfficiencyOutcome)
      : undefined;

  return {
    name: getFlag("--name"),
    efficiencyFile: getFlag("--efficiency-file"),
    userMessages: parseNumber("--user-messages"),
    handoffs: parseNumber("--handoffs"),
    reworkTurns: parseNumber("--rework-turns"),
    spendUsd: parseNumber("--spend-usd"),
    spendBaselineUsd: parseNumber("--spend-baseline-usd"),
    startedAt: getFlag("--started-at"),
    tokens: parseNumber("--tokens"),
    notes: getFlag("--notes"),
    outcome,
    dryRun: argv.includes("--dry-run"),
  };
}

export function buildEfficiencyInputFromArgs(parsed: ReturnType<typeof parseEfficiencyArgs>): {
  input?: EfficiencyInput;
  errors: string[];
} {
  const errors: string[] = [];

  if (
    parsed.userMessages === undefined ||
    parsed.handoffs === undefined ||
    parsed.reworkTurns === undefined ||
    parsed.spendUsd === undefined
  ) {
    errors.push(
      "efficiency fields required: --user-messages, --handoffs, --rework-turns, --spend-usd (or --efficiency-file)",
    );
    return { errors };
  }

  const input: EfficiencyInput = {
    user_messages: parsed.userMessages,
    handoffs: parsed.handoffs,
    rework_turns: parsed.reworkTurns,
    spend_usd: parsed.spendUsd,
  };

  if (parsed.spendBaselineUsd !== undefined) input.spend_baseline_usd = parsed.spendBaselineUsd;
  if (parsed.startedAt !== undefined) input.started_at = parsed.startedAt;
  if (parsed.tokens !== undefined) input.tokens = parsed.tokens;
  if (parsed.notes !== undefined) input.notes = parsed.notes;
  if (parsed.outcome !== undefined) input.outcome = parsed.outcome;

  const validationErrors = validateEfficiencyInput(input);
  return { input, errors: validationErrors };
}

function mainStart(argv: string[]): void {
  const parsed = parseEfficiencyArgs(argv);
  if (!parsed.name) {
    console.error(
      "Usage: npm run efficiency:start -- --name \"Feature — Phase N\" [--spend-baseline-usd 12.34] [--started-at ISO]",
    );
    process.exit(1);
  }

  const stamp = startTask({
    name: parsed.name,
    spendBaselineUsd: parsed.spendBaselineUsd,
    startedAt: parsed.startedAt,
  });

  console.log(
    `efficiency:start — active task "${stamp.task_name}" started_at=${stamp.started_at}`,
  );
}

const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("efficiency-ledger.mts") ||
    process.argv[1].endsWith("efficiency-ledger.mjs"));

if (isMain) {
  const command = process.argv[2];
  if (command === "start") {
    mainStart(process.argv.slice(3));
  } else {
    console.error("Usage: npx tsx scripts/efficiency-ledger.mts start --name \"…\"");
    process.exit(1);
  }
}
