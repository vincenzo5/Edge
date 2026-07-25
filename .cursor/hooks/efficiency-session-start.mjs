#!/usr/bin/env node
/**
 * sessionStart — inject open efficiency task context for execute closeout.
 * Fail-open; returns additional_context when registry has foreground task.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ACTIVE_PATH = ".edge/efficiency-active.json";
const REPO_MARKERS = ["package.json", "docs/PROJECT-STATUS.md"];
const DEFAULT_MAX_GAP_HOURS = 8;

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

function maxGapHours() {
  const raw = process.env.EDGE_EFFICIENCY_MAX_GAP_HOURS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_MAX_GAP_HOURS;
}

function readRegistry(root) {
  const absolute = join(root, ACTIVE_PATH);
  if (!existsSync(absolute)) return null;
  try {
    const parsed = JSON.parse(readFileSync(absolute, "utf8"));
    if (parsed.version === 1 && parsed.tasks && typeof parsed.tasks === "object") {
      return parsed;
    }
    if (parsed.task_name && parsed.started_at) {
      return {
        version: 1,
        foreground: parsed.task_name,
        tasks: {
          [parsed.task_name]: {
            task_name: parsed.task_name,
            started_at: parsed.started_at,
            status: "active",
          },
        },
      };
    }
  } catch {
    return null;
  }
  return null;
}

function buildContext(root, registry) {
  const foreground = registry.foreground;
  const entry =
    (foreground && registry.tasks[foreground]) ||
    Object.values(registry.tasks).find((t) => t.status === "active") ||
    Object.values(registry.tasks)[0];

  if (!entry) {
    return "Efficiency ledger: no open task. Run npm run harness:activate -- --name \"Feature — Phase N\" when starting execute work.";
  }

  const startedMs = Date.parse(entry.started_at);
  const staleMs = maxGapHours() * 60 * 60 * 1000;
  const stale =
    Number.isFinite(startedMs) && Date.now() - startedMs > staleMs;

  const closeout = `npm run harness:closeout -- --name "${entry.task_name}" --evidence-file …`;
  let context = `Efficiency ledger — open task: "${entry.task_name}" (started ${entry.started_at}). Closeout: ${closeout}. Do not pass --user-messages; prompt log auto-fills.`;

  if (stale) {
    context += ` Task stamp is stale (>${maxGapHours()}h); confirm still active or re-activate.`;
  }

  return context;
}

function main() {
  try {
    const raw = readStdin();
    const input = raw.trim() ? JSON.parse(raw) : {};
    const root = resolveWorkspaceRoot(input);

    if (!isRepoRoot(root)) {
      process.stdout.write(JSON.stringify({}));
      process.exit(0);
    }

    const registry = readRegistry(root);
    if (!registry || Object.keys(registry.tasks).length === 0) {
      process.stdout.write(
        JSON.stringify({
          additional_context:
            "Efficiency ledger: no open task. Run npm run harness:activate -- --name \"Feature — Phase N\" when starting execute work.",
        }),
      );
      process.exit(0);
    }

    process.stdout.write(
      JSON.stringify({ additional_context: buildContext(root, registry) }),
    );
  } catch {
    process.stdout.write(JSON.stringify({}));
  }
  process.exit(0);
}

main();
