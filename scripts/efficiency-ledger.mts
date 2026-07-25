#!/usr/bin/env npx tsx
/**
 * Task efficiency ledger — append-only JSONL store gated at harness closeout.
 * Phase 8: multi-task active registry, deferred spend reconcile via usage.jsonl.
 */

import { randomUUID } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

export const DEFAULT_LEDGER_PATH = "docs/evidence/efficiency/ledger.jsonl";
export const DEFAULT_USAGE_PATH = "docs/evidence/efficiency/usage.jsonl";
export const DEFAULT_ACTIVE_PATH = ".edge/efficiency-active.json";
export const DEFAULT_PROMPTS_PATH = ".edge/prompts.jsonl";
export const DEFAULT_SESSIONS_PATH = ".edge/sessions.jsonl";

export type EfficiencyOutcome = "Passing" | "Blocked" | "Abandoned";
export type ActiveTaskStatus = "active" | "paused";

export type EfficiencyRecord = {
  id: string;
  task_name: string;
  started_at: string;
  ended_at: string;
  outcome: EfficiencyOutcome;
  user_messages: number;
  handoffs: number;
  rework_turns: number;
  spend_usd: number | null;
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
  spend_usd?: number | null;
  spend_baseline_usd?: number;
  tokens?: number | null;
  notes?: string;
  started_at?: string;
  outcome?: EfficiencyOutcome;
};

/** @deprecated v0 single stamp — migrated to ActiveTaskRegistry on read */
export type ActiveTaskStamp = {
  task_name: string;
  started_at: string;
  spend_baseline_usd?: number;
};

export type ActiveTaskEntry = {
  id: string;
  task_name: string;
  status: ActiveTaskStatus;
  started_at: string;
  paused_at: string | null;
  /** When status is active, ms clock anchor for active_ms accumulation */
  active_since: string | null;
  active_ms: number;
  spend_baseline_usd?: number;
  session_ids: string[];
};

export type ActiveTaskRegistry = {
  version: 1;
  foreground: string | null;
  tasks: Record<string, ActiveTaskEntry>;
};

export type UsageRecord = {
  id: string;
  started_at: string;
  ended_at: string;
  spend_usd: number;
  tokens?: number | null;
  source?: string;
  imported_at: string;
};

export type PromptLogEntry = {
  ts: string;
  conversation_id: string;
  generation_id?: string;
  prompt_head?: string;
  prompt_length?: number;
};

const OUTCOMES: EfficiencyOutcome[] = ["Passing", "Blocked", "Abandoned"];

export function normalizeTaskName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[—–-]/g, "-");
}

export function getMaxGapHours(): number {
  const raw = process.env.EDGE_EFFICIENCY_MAX_GAP_HOURS?.trim();
  if (raw) {
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 8;
}

function isIsoDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function emptyRegistry(): ActiveTaskRegistry {
  return { version: 1, foreground: null, tasks: {} };
}

function isV0Stamp(parsed: unknown): parsed is ActiveTaskStamp {
  if (!parsed || typeof parsed !== "object") return false;
  const obj = parsed as Record<string, unknown>;
  return (
    typeof obj.task_name === "string" &&
    typeof obj.started_at === "string" &&
    obj.version === undefined
  );
}

export function migrateV0StampToRegistry(stamp: ActiveTaskStamp): ActiveTaskRegistry {
  const name = stamp.task_name.trim();
  return {
    version: 1,
    foreground: name,
    tasks: {
      [name]: {
        id: randomUUID(),
        task_name: name,
        status: "active",
        started_at: stamp.started_at,
        paused_at: null,
        active_since: stamp.started_at,
        active_ms: 0,
        spend_baseline_usd: stamp.spend_baseline_usd,
        session_ids: [],
      },
    },
  };
}

export function readActiveRegistry(
  activePath = DEFAULT_ACTIVE_PATH,
  cwd = process.cwd(),
): ActiveTaskRegistry {
  const absolute = resolve(cwd, activePath);
  if (!existsSync(absolute)) return emptyRegistry();

  const parsed: unknown = JSON.parse(readFileSync(absolute, "utf8"));
  if (isV0Stamp(parsed)) {
    return migrateV0StampToRegistry(parsed);
  }

  const registry = parsed as ActiveTaskRegistry;
  if (registry.version !== 1 || !registry.tasks) {
    throw new Error("active registry has unsupported schema");
  }
  return registry;
}

export function writeActiveRegistry(
  registry: ActiveTaskRegistry,
  activePath = DEFAULT_ACTIVE_PATH,
  cwd = process.cwd(),
): void {
  const absolute = resolve(cwd, activePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export function readActiveTaskEntry(
  taskName: string,
  activePath = DEFAULT_ACTIVE_PATH,
  cwd = process.cwd(),
): ActiveTaskEntry | null {
  const registry = readActiveRegistry(activePath, cwd);
  return registry.tasks[taskName.trim()] ?? null;
}

export function startTask(
  options: {
    name: string;
    spendBaselineUsd?: number;
    startedAt?: string;
    sessionId?: string;
    strict?: boolean;
  },
  paths?: { activePath?: string; cwd?: string },
): ActiveTaskEntry {
  const cwd = paths?.cwd ?? process.cwd();
  const activePath = paths?.activePath ?? DEFAULT_ACTIVE_PATH;
  const name = options.name.trim();
  let registry = readActiveRegistry(activePath, cwd);

  if (registry.tasks[name]) {
    if (options.strict) {
      throw new Error(`task "${name}" is already open in efficiency registry`);
    }
    const existing = registry.tasks[name]!;
    if (options.sessionId && !existing.session_ids.includes(options.sessionId)) {
      attachSession(name, options.sessionId, { activePath, cwd });
    }
    registry.foreground = name;
    if (existing.status === "paused") {
      return resumeTask(name, { activePath, cwd });
    }
    writeActiveRegistry(registry, activePath, cwd);
    return readActiveTaskEntry(name, activePath, cwd)!;
  }

  if (registry.foreground && registry.foreground !== name) {
    pauseTask(registry.foreground, { activePath, cwd });
    registry = readActiveRegistry(activePath, cwd);
  }

  const now = options.startedAt ?? new Date().toISOString();
  const entry: ActiveTaskEntry = {
    id: randomUUID(),
    task_name: name,
    status: "active",
    started_at: now,
    paused_at: null,
    active_since: now,
    active_ms: 0,
    session_ids: options.sessionId ? [options.sessionId] : [],
  };
  if (options.spendBaselineUsd !== undefined) {
    entry.spend_baseline_usd = options.spendBaselineUsd;
  }

  registry.tasks[name] = entry;
  registry.foreground = name;
  writeActiveRegistry(registry, activePath, cwd);
  return entry;
}

export function pauseTask(
  taskName: string,
  paths?: { activePath?: string; cwd?: string; now?: string },
): ActiveTaskEntry {
  const cwd = paths?.cwd ?? process.cwd();
  const activePath = paths?.activePath ?? DEFAULT_ACTIVE_PATH;
  const name = taskName.trim();
  const registry = readActiveRegistry(activePath, cwd);
  const entry = registry.tasks[name];
  if (!entry) throw new Error(`task "${name}" not found in efficiency registry`);
  if (entry.status === "paused") return entry;

  const now = paths?.now ?? new Date().toISOString();
  if (entry.active_since) {
    entry.active_ms += Math.max(0, Date.parse(now) - Date.parse(entry.active_since));
  }
  entry.status = "paused";
  entry.paused_at = now;
  entry.active_since = null;
  if (registry.foreground === name) registry.foreground = null;
  writeActiveRegistry(registry, activePath, cwd);
  return entry;
}

export function resumeTask(
  taskName: string,
  paths?: { activePath?: string; cwd?: string; now?: string },
): ActiveTaskEntry {
  const cwd = paths?.cwd ?? process.cwd();
  const activePath = paths?.activePath ?? DEFAULT_ACTIVE_PATH;
  const name = taskName.trim();
  const registry = readActiveRegistry(activePath, cwd);
  const entry = registry.tasks[name];
  if (!entry) throw new Error(`task "${name}" not found in efficiency registry`);
  if (entry.status === "active") {
    registry.foreground = name;
    writeActiveRegistry(registry, activePath, cwd);
    return entry;
  }

  entry.status = "active";
  entry.paused_at = null;
  entry.active_since = paths?.now ?? new Date().toISOString();
  registry.foreground = name;
  writeActiveRegistry(registry, activePath, cwd);
  return entry;
}

export function switchTask(
  taskName: string,
  paths?: { activePath?: string; cwd?: string; sessionId?: string },
): ActiveTaskEntry {
  const cwd = paths?.cwd ?? process.cwd();
  const activePath = paths?.activePath ?? DEFAULT_ACTIVE_PATH;
  const name = taskName.trim();
  const registry = readActiveRegistry(activePath, cwd);

  if (registry.foreground && registry.foreground !== name) {
    pauseTask(registry.foreground, { activePath, cwd });
  }

  if (registry.tasks[name]) {
    const entry = resumeTask(name, { activePath, cwd });
    if (paths?.sessionId && !entry.session_ids.includes(paths.sessionId)) {
      attachSession(name, paths.sessionId, { activePath, cwd });
    }
    return readActiveTaskEntry(name, activePath, cwd)!;
  }

  return startTask(
    { name, sessionId: paths?.sessionId },
    { activePath, cwd },
  );
}

export function attachSession(
  taskName: string,
  sessionId: string,
  paths?: { activePath?: string; cwd?: string },
): ActiveTaskEntry {
  const cwd = paths?.cwd ?? process.cwd();
  const activePath = paths?.activePath ?? DEFAULT_ACTIVE_PATH;
  const name = taskName.trim();
  const registry = readActiveRegistry(activePath, cwd);
  const entry = registry.tasks[name];
  if (!entry) throw new Error(`task "${name}" not found in efficiency registry`);

  const sid = sessionId.trim();
  if (!entry.session_ids.includes(sid)) {
    entry.session_ids.push(sid);
  }
  writeActiveRegistry(registry, activePath, cwd);
  return entry;
}

export function listOpenTasks(
  activePath = DEFAULT_ACTIVE_PATH,
  cwd = process.cwd(),
): ActiveTaskEntry[] {
  const registry = readActiveRegistry(activePath, cwd);
  return Object.values(registry.tasks);
}

export function removeTaskFromRegistry(
  taskName: string,
  activePath = DEFAULT_ACTIVE_PATH,
  cwd = process.cwd(),
): void {
  const registry = readActiveRegistry(activePath, cwd);
  const name = taskName.trim();
  if (!registry.tasks[name]) return;

  delete registry.tasks[name];
  if (registry.foreground === name) {
    registry.foreground =
      Object.values(registry.tasks).find((t) => t.status === "active")?.task_name ?? null;
  }

  if (Object.keys(registry.tasks).length === 0) {
    const absolute = resolve(cwd, activePath);
    if (existsSync(absolute)) unlinkSync(absolute);
    return;
  }

  writeActiveRegistry(registry, activePath, cwd);
}

/** @deprecated use readActiveTaskEntry */
export function readActiveTaskStamp(
  activePath = DEFAULT_ACTIVE_PATH,
  cwd = process.cwd(),
): ActiveTaskStamp | null {
  const registry = readActiveRegistry(activePath, cwd);
  if (!registry.foreground) {
    const first = Object.values(registry.tasks)[0];
    if (!first) return null;
    return {
      task_name: first.task_name,
      started_at: first.started_at,
      spend_baseline_usd: first.spend_baseline_usd,
    };
  }
  const fg = registry.tasks[registry.foreground];
  if (!fg) return null;
  return {
    task_name: fg.task_name,
    started_at: fg.started_at,
    spend_baseline_usd: fg.spend_baseline_usd,
  };
}

export function clearActiveTaskStamp(
  activePath = DEFAULT_ACTIVE_PATH,
  cwd = process.cwd(),
): void {
  const absolute = resolve(cwd, activePath);
  if (existsSync(absolute)) unlinkSync(absolute);
}

export function defaultTranscriptsDir(cwd = process.cwd()): string {
  const envDir = process.env.EDGE_AGENT_TRANSCRIPTS_DIR?.trim();
  if (envDir) return envDir;
  const slug = cwd.replace(/[/\\:]/g, "-");
  return join(homedir(), ".cursor", "projects", slug, "agent-transcripts");
}

export function readPromptLog(
  promptsPath = DEFAULT_PROMPTS_PATH,
  cwd = process.cwd(),
): PromptLogEntry[] {
  const absolute = resolve(cwd, promptsPath);
  if (!existsSync(absolute)) return [];

  return readFileSync(absolute, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as PromptLogEntry;
      } catch {
        throw new Error(`invalid JSON on prompts line ${index + 1}`);
      }
    });
}

export function getPreviousLedgerEndedAt(
  ledgerPath = DEFAULT_LEDGER_PATH,
  cwd = process.cwd(),
): string | null {
  const records = resolveEffectiveLedgerRecords(readLedgerRecords(ledgerPath, cwd));
  if (records.length === 0) return null;

  const sorted = [...records].sort(
    (a, b) => Date.parse(b.ended_at) - Date.parse(a.ended_at),
  );
  return sorted[0]?.ended_at ?? null;
}

export function getPriorTaskEndedAt(
  taskName: string,
  ledgerPath = DEFAULT_LEDGER_PATH,
  cwd = process.cwd(),
): string | null {
  const normalized = normalizeTaskName(taskName);
  const records = resolveEffectiveLedgerRecords(readLedgerRecords(ledgerPath, cwd));
  const matching = records
    .filter((record) => normalizeTaskName(record.task_name) === normalized)
    .sort((a, b) => Date.parse(b.ended_at) - Date.parse(a.ended_at));
  return matching[0]?.ended_at ?? null;
}

export function resolveTaskStartedAt(options: {
  explicitStartedAt?: string;
  registryStartedAt?: string;
  ledgerPath?: string;
  promptsPath?: string;
  cwd?: string;
  endedAt?: string;
}): string | null {
  const cwd = options.cwd ?? process.cwd();
  const ledgerPath = options.ledgerPath ?? DEFAULT_LEDGER_PATH;
  const promptsPath = options.promptsPath ?? DEFAULT_PROMPTS_PATH;

  let anchor =
    options.explicitStartedAt ??
    getPreviousLedgerEndedAt(ledgerPath, cwd) ??
    options.registryStartedAt ??
    undefined;

  if (!anchor) return null;

  const anchorMs = Date.parse(anchor);
  if (!Number.isFinite(anchorMs)) return anchor;

  const endedAtMs = options.endedAt ? Date.parse(options.endedAt) : Date.now();
  const maxGapMs = getMaxGapHours() * 60 * 60 * 1000;

  const promptsAfterAnchor = readPromptLog(promptsPath, cwd)
    .filter((entry) => {
      const ts = Date.parse(entry.ts);
      return Number.isFinite(ts) && ts >= anchorMs && ts <= endedAtMs;
    })
    .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));

  if (promptsAfterAnchor.length === 0) return anchor;

  const firstPromptMs = Date.parse(promptsAfterAnchor[0]!.ts);
  if (firstPromptMs - anchorMs > maxGapMs) {
    return promptsAfterAnchor[0]!.ts;
  }

  return anchor;
}

export function countPromptsInWindow(options: {
  sinceIso: string;
  untilIso: string;
  promptsPath?: string;
  cwd?: string;
}): { userMessages: number; handoffs: number } {
  const cwd = options.cwd ?? process.cwd();
  const promptsPath = options.promptsPath ?? DEFAULT_PROMPTS_PATH;
  const since = Date.parse(options.sinceIso);
  const until = Date.parse(options.untilIso);
  if (!Number.isFinite(since) || !Number.isFinite(until)) {
    return { userMessages: 0, handoffs: 0 };
  }

  const inWindow = readPromptLog(promptsPath, cwd).filter((entry) => {
    const ts = Date.parse(entry.ts);
    return Number.isFinite(ts) && ts >= since && ts <= until;
  });

  const conversationIds = new Set(
    inWindow.map((entry) => entry.conversation_id).filter(Boolean),
  );

  return {
    userMessages: inWindow.length,
    handoffs: Math.max(0, conversationIds.size - 1),
  };
}

export function countReworkTurns(options: {
  taskName: string;
  sinceIso: string;
  untilIso: string;
  priorEndedAt?: string | null;
  promptsPath?: string;
  ledgerPath?: string;
  cwd?: string;
}): number {
  const cwd = options.cwd ?? process.cwd();
  const promptsPath = options.promptsPath ?? DEFAULT_PROMPTS_PATH;
  const priorEndedAt =
    options.priorEndedAt ??
    getPriorTaskEndedAt(options.taskName, options.ledgerPath, cwd);

  if (!priorEndedAt) return 0;

  const priorMs = Date.parse(priorEndedAt);
  const sinceMs = Date.parse(options.sinceIso);
  const untilMs = Date.parse(options.untilIso);
  if (!Number.isFinite(priorMs) || !Number.isFinite(sinceMs) || !Number.isFinite(untilMs)) {
    return 0;
  }

  return readPromptLog(promptsPath, cwd).filter((entry) => {
    const ts = Date.parse(entry.ts);
    return Number.isFinite(ts) && ts > priorMs && ts >= sinceMs && ts <= untilMs;
  }).length;
}

function parseTranscriptTimestamp(row: {
  role?: string;
  timestamp?: string;
  message?: unknown;
}): number | null {
  if (row.timestamp) {
    const parsed = Date.parse(row.timestamp);
    if (Number.isFinite(parsed)) return parsed;
  }

  const messageText =
    typeof row.message === "string"
      ? row.message
      : row.message != null
        ? JSON.stringify(row.message)
        : "";

  const match = messageText.match(/<timestamp>([^<]+)<\/timestamp>/i);
  if (match?.[1]) {
    const parsed = Date.parse(match[1].trim());
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

export function countUserMessagesFromSessions(options: {
  sessionIds: string[];
  sinceIso: string;
  transcriptsDir: string;
}): number {
  const since = Date.parse(options.sinceIso);
  if (!Number.isFinite(since)) return 0;

  let count = 0;
  for (const sessionId of options.sessionIds) {
    const sessionDir = join(options.transcriptsDir, sessionId);
    if (!existsSync(sessionDir)) continue;

    const files = readdirSync(sessionDir).filter((f) => f.endsWith(".jsonl"));
    for (const file of files) {
      const lines = readFileSync(join(sessionDir, file), "utf8").split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const row = JSON.parse(trimmed) as {
            role?: string;
            timestamp?: string;
            message?: unknown;
          };
          if (row.role !== "user") continue;
          const messageTs = parseTranscriptTimestamp(row);
          if (messageTs !== null && messageTs < since) continue;
          if (row.timestamp && Date.parse(row.timestamp) < since) continue;
          count += 1;
        } catch {
          // skip malformed lines
        }
      }
    }
  }
  return count;
}

export function validateEfficiencyInput(input: EfficiencyInput): string[] {
  const errors: string[] = [];
  const requiredNumbers: Array<[keyof EfficiencyInput, string]> = [
    ["user_messages", "user_messages"],
    ["handoffs", "handoffs"],
    ["rework_turns", "rework_turns"],
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

  if (input.spend_usd !== undefined && input.spend_usd !== null) {
    if (typeof input.spend_usd !== "number" || !Number.isFinite(input.spend_usd) || input.spend_usd < 0) {
      errors.push("spend_usd must be a non-negative number or null");
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

export function resolveEffectiveLedgerRecords(records: EfficiencyRecord[]): EfficiencyRecord[] {
  const byId = new Map<string, EfficiencyRecord>();
  for (const record of records) {
    byId.set(record.id, record);
  }

  const voided = new Set<string>();
  const corrected = new Map<string, EfficiencyRecord>();

  for (const record of records) {
    if (record.void && record.corrects) voided.add(record.corrects);
    if (record.corrects && !record.void && record.spend_usd !== null) {
      corrected.set(record.corrects, record);
    }
  }

  const effective: EfficiencyRecord[] = [];
  for (const record of records) {
    if (record.corrects || record.void) continue;
    if (voided.has(record.id)) continue;
    effective.push(corrected.get(record.id) ?? record);
  }
  return effective;
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
      !record.corrects &&
      !record.void &&
      record.task_name.trim() === normalizedTask &&
      record.ended_at === endedAt,
  );
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
    spend_usd: options.input.spend_usd ?? null,
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
  if (
    !record.corrects &&
    hasDuplicateTaskEnd(existing, record.task_name, record.ended_at, record.id)
  ) {
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
    spend_usd: parsed.spend_usd ?? null,
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
  const ledgerPath = options.ledgerPath ?? DEFAULT_LEDGER_PATH;
  const endedAt = options.endedAt ?? new Date().toISOString();

  const inputErrors = validateEfficiencyInput(options.input);
  if (inputErrors.length > 0) {
    throw new Error(`efficiency input invalid:\n${inputErrors.map((e) => `- ${e}`).join("\n")}`);
  }

  const entry = readActiveTaskEntry(options.taskName, activePath, cwd);
  const startedAt = resolveTaskStartedAt({
    explicitStartedAt: options.input.started_at,
    registryStartedAt: entry?.started_at,
    ledgerPath,
    cwd,
    endedAt,
  });

  if (!startedAt) {
    throw new Error(
      "started_at is required — run npm run harness:activate or pass --started-at / efficiency-file started_at",
    );
  }

  const spendBaseline = options.input.spend_baseline_usd ?? entry?.spend_baseline_usd;

  const record = buildEfficiencyRecord({
    taskName: options.taskName,
    input: {
      ...options.input,
      started_at: startedAt,
      spend_baseline_usd: spendBaseline,
      spend_usd: options.input.spend_usd ?? null,
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
    removeTaskFromRegistry(options.taskName, activePath, cwd);
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
  sessionId?: string;
  transcriptsDir?: string;
  usageFile?: string;
  includeZero?: boolean;
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
    sessionId: getFlag("--session-id"),
    transcriptsDir: getFlag("--transcripts-dir"),
    usageFile: getFlag("--file"),
    includeZero: argv.includes("--include-zero"),
    dryRun: argv.includes("--dry-run"),
  };
}

export function buildEfficiencyInputFromArgs(
  parsed: ReturnType<typeof parseEfficiencyArgs>,
  options?: {
    taskName?: string;
    cwd?: string;
    activePath?: string;
    ledgerPath?: string;
    promptsPath?: string;
    transcriptsDir?: string;
    endedAt?: string;
  },
): { input?: EfficiencyInput; errors: string[] } {
  const cwd = options?.cwd ?? process.cwd();
  const activePath = options?.activePath ?? DEFAULT_ACTIVE_PATH;
  const ledgerPath = options?.ledgerPath ?? DEFAULT_LEDGER_PATH;
  const promptsPath = options?.promptsPath ?? DEFAULT_PROMPTS_PATH;
  const taskName = options?.taskName ?? parsed.name;
  const endedAt = options?.endedAt ?? new Date().toISOString();

  if (parsed.efficiencyFile) {
    return { errors: ["efficiency file path should be resolved by caller"] };
  }

  const entry = taskName ? readActiveTaskEntry(taskName, activePath, cwd) : null;

  const startedAt = resolveTaskStartedAt({
    explicitStartedAt: parsed.startedAt,
    registryStartedAt: entry?.started_at,
    ledgerPath,
    promptsPath,
    cwd,
    endedAt,
  });

  let userMessages = parsed.userMessages;
  let handoffs = parsed.handoffs;
  let reworkTurns = parsed.reworkTurns;

  if (startedAt) {
    const promptCounts = countPromptsInWindow({
      sinceIso: startedAt,
      untilIso: endedAt,
      promptsPath,
      cwd,
    });

    if (userMessages === undefined && promptCounts.userMessages > 0) {
      userMessages = promptCounts.userMessages;
    }

    if (handoffs === undefined && promptCounts.userMessages > 0) {
      handoffs = promptCounts.handoffs;
    }

    if (reworkTurns === undefined && promptCounts.userMessages > 0) {
      reworkTurns = countReworkTurns({
        taskName: taskName ?? "",
        sinceIso: startedAt,
        untilIso: endedAt,
        promptsPath,
        ledgerPath,
        cwd,
      });
    }
  }

  if (userMessages === undefined && entry && entry.session_ids.length > 0 && startedAt) {
    const transcriptsDir = parsed.transcriptsDir ?? defaultTranscriptsDir(cwd);
    userMessages = countUserMessagesFromSessions({
      sessionIds: entry.session_ids,
      sinceIso: startedAt,
      transcriptsDir,
    });
  }

  if (handoffs === undefined && entry) {
    handoffs = Math.max(0, entry.session_ids.length - 1);
  }

  if (reworkTurns === undefined) {
    reworkTurns = 0;
  }

  if (userMessages === undefined) {
    return {
      errors: [
        "user_messages required — prompt log empty; attach session (--session-id) or pass --user-messages",
      ],
    };
  }

  if (handoffs === undefined) {
    handoffs = 0;
  }

  const input: EfficiencyInput = {
    user_messages: userMessages,
    handoffs,
    rework_turns: reworkTurns,
    spend_usd: parsed.spendUsd ?? null,
  };

  if (startedAt) input.started_at = startedAt;

  if (parsed.spendBaselineUsd !== undefined) input.spend_baseline_usd = parsed.spendBaselineUsd;
  else if (entry?.spend_baseline_usd !== undefined) input.spend_baseline_usd = entry.spend_baseline_usd;

  if (parsed.tokens !== undefined) input.tokens = parsed.tokens;
  if (parsed.notes !== undefined) input.notes = parsed.notes;
  if (parsed.outcome !== undefined) input.outcome = parsed.outcome;

  const validationErrors = validateEfficiencyInput(input);
  if (!startedAt) {
    validationErrors.push(
      "started_at is required — run npm run harness:activate for this task first",
    );
  }

  return { input, errors: validationErrors };
}

export function validateUsageRecord(record: UsageRecord): string[] {
  const errors: string[] = [];
  if (!record.id?.trim()) errors.push("id is required");
  if (!isIsoDate(record.started_at)) errors.push("started_at must be valid ISO 8601");
  if (!isIsoDate(record.ended_at)) errors.push("ended_at must be valid ISO 8601");
  if (Date.parse(record.ended_at) < Date.parse(record.started_at)) {
    errors.push("ended_at must be >= started_at");
  }
  if (typeof record.spend_usd !== "number" || !Number.isFinite(record.spend_usd) || record.spend_usd < 0) {
    errors.push("spend_usd must be a non-negative number");
  }
  if (record.tokens !== undefined && record.tokens !== null) {
    if (typeof record.tokens !== "number" || !Number.isFinite(record.tokens) || record.tokens < 0) {
      errors.push("tokens must be a non-negative number or null");
    }
  }
  if (!isIsoDate(record.imported_at)) errors.push("imported_at must be valid ISO 8601");
  return errors;
}

export function readUsageRecords(
  usagePath = DEFAULT_USAGE_PATH,
  cwd = process.cwd(),
): UsageRecord[] {
  const absolute = resolve(cwd, usagePath);
  if (!existsSync(absolute)) return [];

  return readFileSync(absolute, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as UsageRecord;
      } catch {
        throw new Error(`invalid JSON on usage line ${index + 1}`);
      }
    });
}

export function overlapMs(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): number {
  const start = Math.max(Date.parse(aStart), Date.parse(bStart));
  const end = Math.min(Date.parse(aEnd), Date.parse(bEnd));
  return Math.max(0, end - start);
}

export function attributeUsageToTask(
  usage: UsageRecord,
  task: EfficiencyRecord,
  overlappingTasks: EfficiencyRecord[],
): { spend_usd: number; tokens: number } {
  const taskOverlap = overlapMs(usage.started_at, usage.ended_at, task.started_at, task.ended_at);
  if (taskOverlap <= 0) return { spend_usd: 0, tokens: 0 };

  const usageDuration = Math.max(1, Date.parse(usage.ended_at) - Date.parse(usage.started_at));
  const overlaps = overlappingTasks
    .map((t) => ({
      task: t,
      ms: overlapMs(usage.started_at, usage.ended_at, t.started_at, t.ended_at),
    }))
    .filter((o) => o.ms > 0);

  const totalOverlap = overlaps.reduce((sum, o) => sum + o.ms, 0) || 1;
  const fraction = taskOverlap / totalOverlap;

  const spend = usage.spend_usd * fraction;
  const tokens =
    usage.tokens != null ? usage.tokens * fraction : 0;

  return { spend_usd: spend, tokens };
}

export function reconcileTaskSpend(options: {
  task: EfficiencyRecord;
  usageRecords: UsageRecord[];
  allTasks: EfficiencyRecord[];
}): { spend_usd: number; tokens: number | null } {
  const overlappingTasks = options.allTasks.filter(
    (t) =>
      overlapMs(
        options.task.started_at,
        options.task.ended_at,
        t.started_at,
        t.ended_at,
      ) > 0,
  );

  let spend = 0;
  let tokens = 0;
  let hasTokens = false;

  for (const usage of options.usageRecords) {
    const attributed = attributeUsageToTask(usage, options.task, overlappingTasks);
    spend += attributed.spend_usd;
    if (usage.tokens != null) {
      hasTokens = true;
      tokens += attributed.tokens;
    }
  }

  return {
    spend_usd: Math.round(spend * 1e6) / 1e6,
    tokens: hasTokens ? Math.round(tokens) : null,
  };
}

export function importUsageRecords(
  records: UsageRecord[],
  options?: { usagePath?: string; cwd?: string; dryRun?: boolean },
): { imported: number; skipped: number } {
  const cwd = options?.cwd ?? process.cwd();
  const usagePath = options?.usagePath ?? DEFAULT_USAGE_PATH;
  const existing = readUsageRecords(usagePath, cwd);
  const existingIds = new Set(existing.map((r) => r.id));

  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    const errors = validateUsageRecord(record);
    if (errors.length > 0) {
      throw new Error(`usage record invalid:\n${errors.map((e) => `- ${e}`).join("\n")}`);
    }
    if (existingIds.has(record.id)) {
      skipped += 1;
      continue;
    }

    if (!options?.dryRun) {
      const absolute = resolve(cwd, usagePath);
      mkdirSync(dirname(absolute), { recursive: true });
      appendFileSync(absolute, `${JSON.stringify(record)}\n`, "utf8");
    }
    existingIds.add(record.id);
    imported += 1;
  }

  return { imported, skipped };
}

export function reconcileLedgerSpend(options?: {
  ledgerPath?: string;
  usagePath?: string;
  cwd?: string;
  dryRun?: boolean;
  includeZero?: boolean;
}): { reconciled: number; skipped: number; records: EfficiencyRecord[] } {
  const cwd = options?.cwd ?? process.cwd();
  const ledgerPath = options?.ledgerPath ?? DEFAULT_LEDGER_PATH;
  const usagePath = options?.usagePath ?? DEFAULT_USAGE_PATH;
  const includeZero = options?.includeZero ?? false;

  const rawRecords = readLedgerRecords(ledgerPath, cwd);
  const effective = resolveEffectiveLedgerRecords(rawRecords);
  const usageRecords = readUsageRecords(usagePath, cwd);

  const correctedIds = new Set(
    rawRecords.filter((r) => r.corrects && !r.void).map((r) => r.corrects!),
  );

  const pending = effective.filter((record) => {
    if (correctedIds.has(record.id)) return false;
    if (record.spend_usd === null) return true;
    if (includeZero && record.spend_usd === 0) return true;
    return false;
  });

  const correctionRows: EfficiencyRecord[] = [];
  let reconciled = 0;
  let skipped = 0;

  for (const task of pending) {
    const totals = reconcileTaskSpend({
      task,
      usageRecords,
      allTasks: effective,
    });

    if (totals.spend_usd === 0 && usageRecords.length === 0 && !includeZero) {
      skipped += 1;
      continue;
    }

    const correction: EfficiencyRecord = {
      ...task,
      id: randomUUID(),
      corrects: task.id,
      spend_usd: totals.spend_usd,
      tokens: totals.tokens,
      notes: "reconciled from usage.jsonl",
    };

    if (!options?.dryRun) {
      appendRecord(correction, { ledgerPath, cwd, dryRun: false });
    }
    correctionRows.push(correction);
    reconciled += 1;
  }

  return { reconciled, skipped, records: correctionRows };
}

function mainStart(argv: string[]): void {
  const parsed = parseEfficiencyArgs(argv);
  if (!parsed.name) {
    console.error(
      'Usage: npm run efficiency:start -- --name "Feature — Phase N" [--session-id UUID] [--spend-baseline-usd 12.34] [--strict]',
    );
    process.exit(1);
  }

  const entry = startTask({
    name: parsed.name,
    spendBaselineUsd: parsed.spendBaselineUsd,
    startedAt: parsed.startedAt,
    sessionId: parsed.sessionId,
    strict: argv.includes("--strict"),
  });

  console.log(
    `efficiency:start — task "${entry.task_name}" started_at=${entry.started_at} status=${entry.status}`,
  );
}

function mainPause(argv: string[]): void {
  const parsed = parseEfficiencyArgs(argv);
  if (!parsed.name) {
    console.error('Usage: npm run efficiency:pause -- --name "Feature — Phase N"');
    process.exit(1);
  }
  const entry = pauseTask(parsed.name);
  console.log(`efficiency:pause — task "${entry.task_name}" status=${entry.status}`);
}

function mainResume(argv: string[]): void {
  const parsed = parseEfficiencyArgs(argv);
  if (!parsed.name) {
    console.error('Usage: npm run efficiency:resume -- --name "Feature — Phase N"');
    process.exit(1);
  }
  const entry = resumeTask(parsed.name);
  console.log(`efficiency:resume — task "${entry.task_name}" status=${entry.status} foreground`);
}

function mainSwitch(argv: string[]): void {
  const parsed = parseEfficiencyArgs(argv);
  if (!parsed.name) {
    console.error('Usage: npm run efficiency:switch -- --name "Feature — Phase N" [--session-id UUID]');
    process.exit(1);
  }
  const entry = switchTask(parsed.name, { sessionId: parsed.sessionId });
  console.log(`efficiency:switch — foreground "${entry.task_name}" status=${entry.status}`);
}

function mainList(): void {
  const tasks = listOpenTasks();
  if (tasks.length === 0) {
    console.log("efficiency:list — no open tasks");
    return;
  }
  const registry = readActiveRegistry();
  for (const task of tasks) {
    const fg = registry.foreground === task.task_name ? " foreground" : "";
    console.log(
      `- ${task.task_name} status=${task.status}${fg} started_at=${task.started_at} sessions=${task.session_ids.length}`,
    );
  }
}

function mainAttach(argv: string[]): void {
  const parsed = parseEfficiencyArgs(argv);
  if (!parsed.name || !parsed.sessionId) {
    console.error('Usage: npm run efficiency:attach -- --name "Feature — Phase N" --session-id UUID');
    process.exit(1);
  }
  const entry = attachSession(parsed.name, parsed.sessionId);
  console.log(
    `efficiency:attach — task "${entry.task_name}" sessions=${entry.session_ids.length}`,
  );
}

function mainImportUsage(argv: string[]): void {
  const parsed = parseEfficiencyArgs(argv);
  if (!parsed.usageFile) {
    console.error("Usage: npm run efficiency:import-usage -- --file path/to/usage.jsonl [--dry-run]");
    process.exit(1);
  }

  const content = readFileSync(resolve(parsed.usageFile), "utf8");
  const records = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as UsageRecord);

  const result = importUsageRecords(records, { dryRun: parsed.dryRun });
  const mode = parsed.dryRun ? "dry-run" : "complete";
  console.log(
    `efficiency:import-usage ${mode} — imported=${result.imported} skipped=${result.skipped}`,
  );
}

function mainReconcile(argv: string[]): void {
  const parsed = parseEfficiencyArgs(argv);
  const result = reconcileLedgerSpend({
    dryRun: parsed.dryRun,
    includeZero: parsed.includeZero,
  });
  const mode = parsed.dryRun ? "dry-run" : "complete";
  console.log(
    `efficiency:reconcile ${mode} — reconciled=${result.reconciled} skipped=${result.skipped}`,
  );
}

function mainStatus(): void {
  const registry = readActiveRegistry();
  const tasks = listOpenTasks();
  const previousEndedAt = getPreviousLedgerEndedAt();

  if (tasks.length === 0) {
    console.log("efficiency:status — no open tasks");
    if (previousEndedAt) {
      console.log(`  chain anchor (previous ended_at): ${previousEndedAt}`);
    }
    return;
  }

  console.log("efficiency:status — open tasks:");
  for (const task of tasks) {
    const fg = registry.foreground === task.task_name ? " foreground" : "";
    const anchor = resolveTaskStartedAt({
      registryStartedAt: task.started_at,
      endedAt: new Date().toISOString(),
    });
    console.log(
      `- ${task.task_name} status=${task.status}${fg} registry_started_at=${task.started_at} resolved_window_start=${anchor ?? "n/a"} sessions=${task.session_ids.length}`,
    );
  }
  if (previousEndedAt) {
    console.log(`  chain anchor (previous ended_at): ${previousEndedAt}`);
  }
}

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const command = process.argv[2];
  const argv = process.argv.slice(3);
  switch (command) {
    case "start":
      mainStart(argv);
      break;
    case "pause":
      mainPause(argv);
      break;
    case "resume":
      mainResume(argv);
      break;
    case "switch":
      mainSwitch(argv);
      break;
    case "list":
      mainList();
      break;
    case "attach":
      mainAttach(argv);
      break;
    case "import-usage":
      mainImportUsage(argv);
      break;
    case "reconcile":
      mainReconcile(argv);
      break;
    case "status":
      mainStatus();
      break;
    default:
      console.error(
        "Usage: npx tsx scripts/efficiency-ledger.mts <start|pause|resume|switch|list|attach|import-usage|reconcile|status> …",
      );
      process.exit(1);
  }
}
