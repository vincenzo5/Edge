#!/usr/bin/env npx tsx
/**
 * Local docs updater — invoked manually or from .githooks/pre-push.
 * Runs a Cursor SDK local agent against the pending diff and blocks push when docs change.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Agent, CursorAgentError } from "@cursor/sdk";

config({ path: ".env.local" });

export type DiffRange = { base: string; head: string; remoteRef?: string };

export type PrePushLine = {
  localRef: string;
  localSha: string;
  remoteRef: string;
  remoteSha: string;
};

const DOCS_STATUS_PATHS = ["docs/", "AGENTS.md", ".cursor/rules/"] as const;

const SKIP_DIFF_PATTERNS: RegExp[] = [
  /^docs\//,
  /^AGENTS\.md$/,
  /^\.cursor\/rules\//,
  /^\.githooks\//,
  /^scripts\/update-docs-for-diff\.(mts|test\.ts)$/,
  /^package\.json$/,
  /^package-lock\.json$/,
];

/** Parse one pre-push stdin line: `<local ref> <local sha> <remote ref> <remote sha>`. */
export function parsePrePushLine(line: string): PrePushLine | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/);
  if (parts.length < 4) return null;

  return {
    localRef: parts[0]!,
    localSha: parts[1]!,
    remoteRef: parts[2]!,
    remoteSha: parts[3]!,
  };
}

/** Parse pre-push stdin into diff ranges (localSha vs remoteSha when remote exists). */
export function parsePrePushInput(input: string): DiffRange[] {
  const ranges: DiffRange[] = [];

  for (const line of input.split("\n")) {
    const parsed = parsePrePushLine(line);
    if (!parsed) continue;

    const { localSha, remoteRef, remoteSha } = parsed;
    const isNewBranch = /^0+$/.test(remoteSha);
    const base = isNewBranch ? findMergeBase(localSha) : remoteSha;

    ranges.push({ base, head: localSha, remoteRef });
  }

  return ranges;
}

/** True when every changed file matches skip patterns (docs-only, hook metadata, etc.). */
export function shouldSkipDiff(changedFiles: string[]): boolean {
  if (changedFiles.length === 0) return true;
  return changedFiles.every((file) => SKIP_DIFF_PATTERNS.some((pattern) => pattern.test(file)));
}

/** Filter git status porcelain lines to docs-related paths. */
export function getDocsStatusLines(porcelainLines: string[]): string[] {
  return porcelainLines.filter((line) => {
    const path = line.slice(3).trim();
    return DOCS_STATUS_PATHS.some(
      (prefix) => path === prefix.replace(/\/$/, "") || path.startsWith(prefix),
    );
  });
}

/** Exit code for hook: 0 allow push, 2 block push (docs changed). */
export function hookExitCodeForDocsChange(docsLines: string[]): number {
  return docsLines.length > 0 ? 2 : 0;
}

export function findMergeBase(head: string): string {
  try {
    return execGit(["merge-base", "HEAD", head]).trim();
  } catch {
    try {
      return execGit(["rev-parse", `${head}^`]).trim();
    } catch {
      return execGit(["rev-parse", "HEAD~1"]).trim();
    }
  }
}

export function execGit(args: string[], cwd = process.cwd()): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

export function getChangedFilesInRange(base: string, head: string, cwd = process.cwd()): string[] {
  try {
    const output = execGit(["diff", "--name-only", `${base}...${head}`], cwd);
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function getDocsPorcelain(cwd = process.cwd()): string[] {
  const output = execGit(["status", "--porcelain", ...DOCS_STATUS_PATHS], cwd);
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

export function buildDocsPrompt(ranges: DiffRange[]): string {
  const rangeText = ranges
    .map((range) => `- base: ${range.base}, head: ${range.head}`)
    .join("\n");

  return `You are updating documentation for a local git push in the Edge charting repo.

Inspect the diff for these commit ranges:
${rangeText}

Use git to inspect changes, for example:
git diff --stat <base>...<head>
git log --oneline <base>..<head>

Update existing documentation only when the code change clearly requires it. Follow this routing:
- docs/PROJECT-STATUS.md for active work, verification, and handoff state
- nearest ARCHITECTURE.md for durable architecture or API changes
- docs/chart/features.md for chart feature status
- docs/ai-tools-architecture.md for AI tool behavior
- other existing docs only when directly relevant

Rules:
- Do not create new documentation files unless absolutely necessary.
- Do not edit source code, tests, or config outside docs/.
- Leave all changes unstaged.
- If docs are already current, make no edits.

When finished, reply with a one-line summary: either "no docs update needed" or "updated: <paths>".`;
}

export function buildSdkSmokePrompt(): string {
  return "Reply with exactly: SDK smoke OK. Do not read or edit any files.";
}

export function parseArgs(argv: string[]): {
  mode: "pre-push" | "manual" | "sdk-smoke";
  base?: string;
  head?: string;
  prePushInput?: string;
} {
  if (argv.includes("--sdk-smoke")) {
    return { mode: "sdk-smoke" };
  }

  if (argv.includes("--pre-push")) {
    const prePushIndex = argv.indexOf("--pre-push");
    const prePushInput = argv[prePushIndex + 1];
    return {
      mode: "pre-push",
      prePushInput: prePushInput && !prePushInput.startsWith("-") ? prePushInput : undefined,
    };
  }

  const baseIndex = argv.indexOf("--base");
  const headIndex = argv.indexOf("--head");
  if (baseIndex !== -1 && headIndex !== -1) {
    return {
      mode: "manual",
      base: argv[baseIndex + 1],
      head: argv[headIndex + 1],
    };
  }

  return { mode: "manual" };
}

async function runLocalAgent(prompt: string, cwd: string): Promise<{ status: string; result?: string }> {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY is not set");
  }

  const result = await Agent.prompt(prompt, {
    apiKey,
    model: { id: process.env.CURSOR_DOCS_MODEL ?? "auto" },
    local: { cwd, settingSources: [] },
  });

  return { status: result.status, result: result.result };
}

export async function runDocsUpdate(options: {
  ranges: DiffRange[];
  cwd?: string;
  hookMode?: boolean;
  sdkSmoke?: boolean;
}): Promise<number> {
  const cwd = options.cwd ?? process.cwd();

  if (options.sdkSmoke) {
    const apiKey = process.env.CURSOR_API_KEY?.trim();
    if (!apiKey) {
      console.error("docs:auto-update SDK smoke blocked: CURSOR_API_KEY is not set");
      return 1;
    }
    try {
      const result = await runLocalAgent(buildSdkSmokePrompt(), cwd);
      console.log(`docs:auto-update SDK smoke status=${result.status}`);
      if (result.result) console.log(result.result.trim());
      return result.status === "finished" ? 0 : 2;
    } catch (error) {
      return handleAgentError(error);
    }
  }

  const changedFiles = options.ranges.flatMap((range) =>
    getChangedFilesInRange(range.base, range.head, cwd),
  );
  const uniqueChanged = [...new Set(changedFiles)];

  if (shouldSkipDiff(uniqueChanged)) {
    console.log("docs:auto-update skip — no non-doc changes in pending diff");
    return 0;
  }

  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      "docs:auto-update: CURSOR_API_KEY not set — skipping agent run (set in .env.local or export). Push allowed.",
    );
    return 0;
  }

  const beforeDocs = getDocsPorcelain(cwd);
  const prompt = buildDocsPrompt(options.ranges);

  try {
    const result = await runLocalAgent(prompt, cwd);
    console.log(`docs:auto-update agent status=${result.status}`);
    if (result.result) console.log(result.result.trim());

    if (result.status !== "finished") {
      return 2;
    }
  } catch (error) {
    return handleAgentError(error);
  }

  const afterDocs = getDocsPorcelain(cwd);
  if (afterDocs.join("\n") !== beforeDocs.join("\n")) {
    console.error("docs:auto-update blocked push — documentation changed locally:");
    for (const line of afterDocs) {
      console.error(`  ${line}`);
    }
    console.error("Review the edits, commit them, then push again.");
    console.error("Opt out for one push: EDGE_SKIP_DOCS_HOOK=1 git push");
    return hookExitCodeForDocsChange(afterDocs);
  }

  console.log("docs:auto-update complete — no documentation changes");
  return 0;
}

function handleAgentError(error: unknown): number {
  if (error instanceof CursorAgentError) {
    console.error(`docs:auto-update startup failed: ${error.message}`);
    return 1;
  }
  if (error instanceof Error) {
    console.error(`docs:auto-update failed: ${error.message}`);
    return 1;
  }
  throw error;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  let ranges: DiffRange[] = [];

  if (parsed.mode === "sdk-smoke") {
    process.exit(await runDocsUpdate({ ranges: [], sdkSmoke: true }));
  }

  if (parsed.mode === "pre-push") {
    let input = parsed.prePushInput ?? "";
    if (!input.trim() && !process.stdin.isTTY) {
      input = readFileSync(0, "utf8");
    }
    ranges = parsePrePushInput(input);
    if (ranges.length === 0) {
      console.log("docs:auto-update skip — no pre-push ranges parsed");
      process.exit(0);
    }
  } else {
    const base = parsed.base ?? "HEAD~1";
    const head = parsed.head ?? "HEAD";
    ranges = [{ base, head }];
  }

  const exitCode = await runDocsUpdate({
    ranges,
    hookMode: parsed.mode === "pre-push",
  });
  process.exit(exitCode);
}

const isMain =
  typeof process.argv[1] === "string" &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
