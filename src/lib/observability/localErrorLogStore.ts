import fs from "node:fs";
import path from "node:path";
import { redactDiagnostic } from "@/lib/api/redactDiagnostic";

export const LOCAL_ERROR_LOG_RETENTION = 200;
export const LOCAL_ERROR_LOG_RELATIVE_PATH = ".edge/error-log.jsonl";

export type LocalErrorLogEntry = {
  at: number;
  source: string;
  message: string;
  stack?: string;
  detail?: string;
};

export type LocalErrorLogInput = {
  source: string;
  message: string;
  stack?: string;
  detail?: string;
};

export function resolveLocalErrorLogPath(cwd = process.cwd()): string {
  return path.join(cwd, LOCAL_ERROR_LOG_RELATIVE_PATH);
}

function sanitizeEntry(input: LocalErrorLogInput): LocalErrorLogEntry {
  const entry: LocalErrorLogEntry = {
    at: Date.now(),
    source: redactDiagnostic(input.source, { maxLength: 64 }),
    message: redactDiagnostic(input.message),
  };
  if (input.stack) {
    entry.stack = redactDiagnostic(input.stack, { maxLength: 2000 });
  }
  if (input.detail) {
    entry.detail = redactDiagnostic(input.detail);
  }
  return entry;
}

function readLines(logPath: string): string[] {
  try {
    if (!fs.existsSync(logPath)) return [];
    const raw = fs.readFileSync(logPath, "utf8");
    return raw.split("\n").filter((line) => line.trim().length > 0);
  } catch {
    return [];
  }
}

export function readLocalErrorLog(
  limit = 50,
  options: { logPath?: string } = {},
): LocalErrorLogEntry[] {
  const logPath = options.logPath ?? resolveLocalErrorLogPath();
  const lines = readLines(logPath);
  const boundedLimit = Math.max(1, limit);
  const tail = lines.slice(-boundedLimit);
  const entries: LocalErrorLogEntry[] = [];
  for (const line of tail) {
    try {
      entries.push(JSON.parse(line) as LocalErrorLogEntry);
    } catch {
      // Skip malformed lines — instrumentation must not throw.
    }
  }
  return entries;
}

export function appendLocalError(
  input: LocalErrorLogInput,
  options: { logPath?: string } = {},
): LocalErrorLogEntry | null {
  const entry = sanitizeEntry(input);
  try {
    const logPath = options.logPath ?? resolveLocalErrorLogPath();
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const lines = readLines(logPath);
    lines.push(JSON.stringify(entry));
    const trimmed = lines.slice(-LOCAL_ERROR_LOG_RETENTION);
    fs.writeFileSync(logPath, `${trimmed.join("\n")}\n`, "utf8");
  } catch {
    // JSONL write failure must not throw — durable persist still attempted below.
  }

  void import("./productionErrorPersist")
    .then((mod) =>
      mod.persistProductionError({
        at: entry.at,
        source: entry.source,
        message: entry.message,
        stack: entry.stack,
        detail: entry.detail,
      }),
    )
    .catch(() => {});

  return entry;
}
