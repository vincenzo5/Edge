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
import {
  buildCombinedDocsPrompt,
  buildDocImpactMap,
  parseAgentSummary,
  pathsFromPorcelain,
  requiresInstructionValidation,
  validateAllowlist,
  validateSummaryAgainstChanges,
  type AutomationLane,
  type DiffRange,
} from "./docs-automation-framework";

config({ path: ".env.local" });

export type { DiffRange } from "./docs-automation-framework";

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
  /^scripts\/docs-automation-framework\.(mts|test\.ts)$/,
  /^package\.json$/,
  /^package-lock\.json$/,
];

const DEFAULT_AGENT_TIMEOUT_MS = 10 * 60 * 1000;

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

export function getFullPorcelain(cwd = process.cwd()): string[] {
  const output = execGit(["status", "--porcelain"], cwd);
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

/** Paths with new or modified porcelain lines since a prior snapshot. */
export function getPathsChangedSince(before: string[], after: string[]): string[] {
  const beforeSet = new Set(before.map((line) => line.trim()));
  const newLines = after.filter((line) => !beforeSet.has(line.trim()));
  return pathsFromPorcelain(newLines);
}

export function isEditableDocPath(path: string): boolean {
  return (
    path.startsWith("docs/") ||
    path === "AGENTS.md" ||
    path.startsWith(".cursor/rules/") ||
    path.endsWith("/ARCHITECTURE.md")
  );
}

/** @deprecated Use buildCombinedDocsPrompt via runDocsUpdate. Kept for backward-compatible tests. */
export function buildDocsPrompt(ranges: DiffRange[], changedFiles: string[] = []): string {
  const impact = buildDocImpactMap({ changedFiles, evidenceProvided: false });
  return buildCombinedDocsPrompt(ranges, impact);
}

export function buildSdkSmokePrompt(): string {
  return "Reply with exactly: SDK smoke OK. Do not read or edit any files.";
}

export function parseArgs(argv: string[]): {
  mode: "pre-push" | "manual" | "sdk-smoke";
  base?: string;
  head?: string;
  prePushInput?: string;
  lane?: AutomationLane;
  evidenceFile?: string;
} {
  if (argv.includes("--sdk-smoke")) {
    return { mode: "sdk-smoke" };
  }

  const laneIndex = argv.indexOf("--lane");
  const laneRaw = laneIndex !== -1 ? argv[laneIndex + 1] : undefined;
  const lane =
    laneRaw === "architecture" || laneRaw === "harness" || laneRaw === "drift-audit"
      ? laneRaw
      : undefined;

  const evidenceIndex = argv.indexOf("--evidence-file");
  const evidenceFile =
    evidenceIndex !== -1 && argv[evidenceIndex + 1] && !argv[evidenceIndex + 1]!.startsWith("-")
      ? argv[evidenceIndex + 1]
      : undefined;

  if (argv.includes("--pre-push")) {
    const prePushIndex = argv.indexOf("--pre-push");
    const prePushInput = argv[prePushIndex + 1];
    return {
      mode: "pre-push",
      prePushInput: prePushInput && !prePushInput.startsWith("-") ? prePushInput : undefined,
      lane,
      evidenceFile,
    };
  }

  const baseIndex = argv.indexOf("--base");
  const headIndex = argv.indexOf("--head");
  if (baseIndex !== -1 && headIndex !== -1) {
    return {
      mode: "manual",
      base: argv[baseIndex + 1],
      head: argv[headIndex + 1],
      lane,
      evidenceFile,
    };
  }

  return { mode: "manual", lane, evidenceFile };
}

export function runInstructionValidation(cwd = process.cwd()): { ok: boolean; output: string } {
  try {
    const output = execFileSync("npm", ["run", "lint:instructions"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, output };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    const output = [err.stdout, err.stderr, err.message].filter(Boolean).join("\n");
    return { ok: false, output };
  }
}

async function runLocalAgent(
  prompt: string,
  cwd: string,
  timeoutMs = DEFAULT_AGENT_TIMEOUT_MS,
): Promise<{ status: string; result?: string; durationMs: number }> {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY is not set");
  }

  const model = process.env.CURSOR_DOCS_MODEL ?? "auto";
  const started = Date.now();

  const agentPromise = Agent.prompt(prompt, {
    apiKey,
    model: { id: model },
    local: { cwd, settingSources: ["project"] },
  });

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Agent timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([agentPromise, timeoutPromise]);
    return {
      status: result.status,
      result: result.result,
      durationMs: Date.now() - started,
    };
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function readEvidenceFile(path: string | undefined, cwd: string): string | undefined {
  if (!path) return undefined;
  const fullPath = path.startsWith("/") ? path : `${cwd}/${path}`;
  return readFileSync(fullPath, "utf8");
}

function logRunMeta(meta: Record<string, string | number | boolean | undefined>): void {
  const parts = Object.entries(meta)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`);
  console.log(`docs:auto-update ${parts.join(" ")}`);
}

export async function runDocsUpdate(options: {
  ranges: DiffRange[];
  cwd?: string;
  hookMode?: boolean;
  sdkSmoke?: boolean;
  lane?: AutomationLane;
  evidenceFile?: string;
  evidenceText?: string;
  changedFiles?: string[];
  runAgent?: (prompt: string, cwd: string) => Promise<{ status: string; result?: string; durationMs: number }>;
  validateInstructions?: (cwd: string) => { ok: boolean; output: string };
  getFullPorcelainFn?: (cwd: string) => string[];
  getDocsPorcelainFn?: (cwd: string) => string[];
}): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const runAgent = options.runAgent ?? runLocalAgent;
  const validateInstructions = options.validateInstructions ?? runInstructionValidation;
  const readFullPorcelain = options.getFullPorcelainFn ?? getFullPorcelain;
  const readDocsPorcelain = options.getDocsPorcelainFn ?? getDocsPorcelain;

  if (options.sdkSmoke) {
    const apiKey = process.env.CURSOR_API_KEY?.trim();
    if (!apiKey) {
      console.error("docs:auto-update SDK smoke blocked: CURSOR_API_KEY is not set");
      return 1;
    }
    try {
      const result = await runAgent(buildSdkSmokePrompt(), cwd);
      logRunMeta({ mode: "sdk-smoke", status: result.status, durationMs: result.durationMs });
      if (result.result) console.log(result.result.trim());
      return result.status === "finished" ? 0 : 2;
    } catch (error) {
      return handleAgentError(error);
    }
  }

  const changedFiles =
    options.changedFiles ??
    options.ranges.flatMap((range) => getChangedFilesInRange(range.base, range.head, cwd));
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

  const evidenceText =
    options.evidenceText ?? readEvidenceFile(options.evidenceFile, cwd);
  const evidenceProvided = Boolean(evidenceText?.trim());

  if (options.lane === "harness" && !evidenceProvided) {
    console.error("docs:auto-update blocked — harness lane requires --evidence-file or evidenceText");
    return 2;
  }

  const impact = buildDocImpactMap({
    changedFiles: uniqueChanged,
    lane: options.lane,
    evidenceProvided,
  });

  if (impact.lanes.length === 0) {
    console.log("docs:auto-update skip — no applicable automation lanes for diff");
    return 0;
  }

  if (impact.lanes.includes("harness") && !evidenceProvided) {
    console.error("docs:auto-update blocked — harness lane requires --evidence-file or evidenceText");
    return 2;
  }

  const beforeFull = readFullPorcelain(cwd);
  const beforeDocs = readDocsPorcelain(cwd);
  const prompt = buildCombinedDocsPrompt(options.ranges, impact, evidenceText);

  logRunMeta({
    mode: options.hookMode ? "pre-push" : "manual",
    lanes: impact.lanes.join("+"),
    areas: impact.ownerAreas.join(","),
    allowed: impact.allowedDocPaths.join(","),
    model: process.env.CURSOR_DOCS_MODEL ?? "auto",
  });

  let agentResult: { status: string; result?: string; durationMs: number };
  try {
    agentResult = await runAgent(prompt, cwd);
    logRunMeta({ status: agentResult.status, durationMs: agentResult.durationMs });
    if (agentResult.result) console.log(agentResult.result.trim());

    if (agentResult.status !== "finished") {
      return 2;
    }
  } catch (error) {
    return handleAgentError(error);
  }

  if (impact.lanes.includes("drift-audit") && impact.lanes.length === 1) {
    const summary = parseAgentSummary(agentResult.result);
    console.log(`docs:auto-update drift-audit complete summary=${summary.kind}`);
    return 0;
  }

  const afterFull = readFullPorcelain(cwd);
  const changedPaths = getPathsChangedSince(beforeFull, afterFull);
  const changedDocPaths = changedPaths.filter(isEditableDocPath);
  const changedNonDocPaths = changedPaths.filter((path) => !isEditableDocPath(path));

  if (changedNonDocPaths.length > 0) {
    console.error("docs:auto-update blocked — agent edited non-doc paths:");
    for (const path of changedNonDocPaths) {
      console.error(`  ${path}`);
    }
    return 2;
  }

  const allowlistIssues = validateAllowlist(changedDocPaths, impact.allowedDocPaths);
  if (allowlistIssues.length > 0) {
    console.error("docs:auto-update blocked — allowlist violations:");
    for (const issue of allowlistIssues) {
      console.error(`  ${issue.message}`);
    }
    return 2;
  }

  const summary = parseAgentSummary(agentResult.result);
  const summaryIssues = validateSummaryAgainstChanges(summary, changedDocPaths);
  if (summaryIssues.length > 0) {
    console.error("docs:auto-update blocked — agent summary mismatch:");
    for (const issue of summaryIssues) {
      console.error(`  ${issue.message}`);
    }
    return 2;
  }

  if (requiresInstructionValidation(changedDocPaths)) {
    const validation = validateInstructions(cwd);
    if (!validation.ok) {
      console.error("docs:auto-update blocked — lint:instructions failed after doc edits:");
      console.error(validation.output.trim());
      return 2;
    }
    console.log("docs:auto-update lint:instructions passed");
  }

  const afterDocs = readDocsPorcelain(cwd);
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
    lane: parsed.lane,
    evidenceFile: parsed.evidenceFile,
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
