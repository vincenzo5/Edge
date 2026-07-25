#!/usr/bin/env node
/**
 * sessionEnd — append session idle marker for efficiency ledger.
 * Fail-open; skip when cwd is not the repo root.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const SESSIONS_PATH = ".edge/sessions.jsonl";
const REPO_MARKERS = ["package.json", "docs/PROJECT-STATUS.md"];

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function isRepoRoot(cwd) {
  try {
    return REPO_MARKERS.every((marker) => existsSync(join(cwd, marker)));
  } catch {
    return false;
  }
}

function resolveWorkspaceRoot(input) {
  const roots = input.workspace_roots ?? input.workspaceRoots;
  if (Array.isArray(roots) && roots.length > 0) {
    return resolve(String(roots[0]));
  }
  if (typeof input.cwd === "string" && input.cwd.trim()) {
    return resolve(input.cwd.trim());
  }
  return process.cwd();
}

function main() {
  try {
    const raw = readStdin();
    const input = raw.trim() ? JSON.parse(raw) : {};
    const root = resolveWorkspaceRoot(input);
    if (!isRepoRoot(root)) {
      process.exit(0);
    }

    const row = {
      ts: new Date().toISOString(),
      session_id: String(input.session_id ?? input.sessionId ?? ""),
      conversation_id: String(input.conversation_id ?? input.conversationId ?? ""),
      event: "session_end",
    };

    const absolute = join(root, SESSIONS_PATH);
    mkdirSync(dirname(absolute), { recursive: true });
    appendFileSync(absolute, `${JSON.stringify(row)}\n`, "utf8");
  } catch {
    // fail-open
  }
  process.exit(0);
}

main();
