#!/usr/bin/env node
/**
 * beforeSubmitPrompt — append ambient prompt log for efficiency ledger.
 * Fail-open; skip when cwd is not the repo root.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const PROMPTS_PATH = ".edge/prompts.jsonl";
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

function extractPrompt(input) {
  if (typeof input.prompt === "string") return input.prompt;
  if (typeof input.user_message === "string") return input.user_message;
  if (typeof input.message === "string") return input.message;
  if (input.messages && Array.isArray(input.messages)) {
    for (let i = input.messages.length - 1; i >= 0; i -= 1) {
      const msg = input.messages[i];
      if (msg && typeof msg.content === "string") return msg.content;
      if (msg && typeof msg.text === "string") return msg.text;
    }
  }
  return "";
}

function main() {
  try {
    const raw = readStdin();
    if (!raw.trim()) {
      process.exit(0);
    }

    const input = JSON.parse(raw);
    const root = resolveWorkspaceRoot(input);
    if (!isRepoRoot(root)) {
      process.exit(0);
    }

    const prompt = extractPrompt(input);
    const row = {
      ts: new Date().toISOString(),
      conversation_id: String(input.conversation_id ?? input.conversationId ?? ""),
      generation_id: String(input.generation_id ?? input.generationId ?? ""),
      prompt_head: prompt.slice(0, 200),
      prompt_length: prompt.length,
    };

    const absolute = join(root, PROMPTS_PATH);
    mkdirSync(dirname(absolute), { recursive: true });
    appendFileSync(absolute, `${JSON.stringify(row)}\n`, "utf8");
  } catch {
    // fail-open
  }
  process.exit(0);
}

main();
