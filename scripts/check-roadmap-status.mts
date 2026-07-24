#!/usr/bin/env npx tsx
/**
 * Compare docs/roadmaps/README.md status table against each track file's
 * top **Status:** (or **Current focus:**) line. Exit 1 on drift.
 *
 * Usage: npm run roadmaps:status-check
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ROADMAPS = join(ROOT, "docs/roadmaps");
const README = join(ROADMAPS, "README.md");

type Issue = { track: string; message: string };

function extractTopStatus(content: string): string | null {
  const m = content.match(/^\*\*(?:Status|Current focus):\*\*\s*(.+)$/m);
  if (m) return m[1]!.trim();

  // day-classification style: ## Status table with Phase rows
  const statusSection = content.match(
    /## Status\n\n\| Phase \| Status \|\n\|[-| ]+\|\n((?:\|.+\n)+)/,
  );
  if (statusSection) {
    return statusSection[1]!
      .split("\n")
      .filter((line) => line.startsWith("|"))
      .map((line) => line.replace(/^\|/, "").trim())
      .join("; ");
  }
  return null;
}

/**
 * Compact comparable tokens from primary status claims only.
 * Ignores cross-refs like "Memory efficiency Phase 12 **Passing**".
 */
export function statusTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  // Split into clauses; only clauses that *start* with Phase(s)/Tier(s) count.
  const clauses = text
    .split(/[.;]/g)
    .map((c) => c.trim())
    .filter(Boolean);

  const phaseRe =
    /^Phase[s]?\s+([0-9A-D]+(?:\s*[–-]\s*[0-9A-D]+)?(?:\s*\+\s*[0-9A-D]+)?)\s+\*\*(Passing|Pending|Skipped|Active|Blocked)\*\*/i;
  const tierRe =
    /^Tier[s]?\s+([A-E](?:\s*[–-]\s*[A-E])?)\s+\*\*(Passing|Pending)\*\*/i;

  for (const clause of clauses) {
    const phase = clause.match(phaseRe);
    if (phase) {
      const range = phase[1]!.replace(/\s+/g, "").replace(/–/g, "-");
      tokens.add(`phase:${range.toLowerCase()}:${phase[2]!.toLowerCase()}`);
      continue;
    }
    const tier = clause.match(tierRe);
    if (tier) {
      tokens.add(
        `tier:${tier[1]!.replace(/\s+/g, "").toLowerCase()}:${tier[2]!.toLowerCase()}`,
      );
    }
  }

  if (/\btrack complete\b/i.test(text)) tokens.add("track-complete");
  if (/\bproduct complete\b/i.test(text)) tokens.add("product-complete");
  if (/\bimplementation not started\b/i.test(text)) tokens.add("not-started");
  if (/\bresearch (captured|inventory)/i.test(text)) tokens.add("research");
  return tokens;
}

export function parseReadmeRows(readme: string): Array<{ file: string; status: string }> {
  const rows: Array<{ file: string; status: string }> = [];
  for (const line of readme.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    // | Track | File | Status |
    if (cells.length < 4) continue;
    const fileCell = cells[2]!;
    const status = cells[3]!;
    if (fileCell === "File" || fileCell.startsWith("---")) continue;
    const link = fileCell.match(/\((\.\/[^)]+\.md)\)/);
    if (!link) continue;
    const file = link[1]!.replace("./", "");
    // skip functional test plan companion links — first .md link wins
    rows.push({ file, status });
  }
  return rows;
}

export function checkRoadmapStatus(options?: {
  readmeContent?: string;
  readTrack?: (file: string) => string | null;
}): Issue[] {
  const readme = options?.readmeContent ?? readFileSync(README, "utf8");
  const readTrack =
    options?.readTrack ??
    ((file: string) => {
      try {
        return readFileSync(join(ROADMAPS, file), "utf8");
      } catch {
        return null;
      }
    });

  const issues: Issue[] = [];
  const rows = parseReadmeRows(readme);
  const readmeFiles = new Set(rows.map((r) => r.file));

  for (const row of rows) {
    const content = readTrack(row.file);
    if (content === null) {
      issues.push({ track: row.file, message: "file missing" });
      continue;
    }
    const top = extractTopStatus(content);
    if (!top) {
      issues.push({ track: row.file, message: "no top Status / Current focus line" });
      continue;
    }
    const readmeTok = statusTokens(row.status);
    const trackTok = statusTokens(top);

    // Soft compare: every Pending/Passing phase token in README should appear in track
    // (or track may be more specific). Flag when README claims Passing for a phase
    // the track still marks Pending, and vice versa for headline Pending/complete.
    for (const tok of readmeTok) {
      if (tok.startsWith("phase:") && tok.endsWith(":pending")) {
        const passing = tok.replace(":pending", ":passing");
        if (trackTok.has(passing) && !trackTok.has(tok)) {
          issues.push({
            track: row.file,
            message: `README says Pending but track is Passing (${tok})`,
          });
        }
      }
      if (tok.startsWith("phase:") && tok.endsWith(":passing")) {
        const pending = tok.replace(":passing", ":pending");
        if (trackTok.has(pending) && !trackTok.has(tok)) {
          issues.push({
            track: row.file,
            message: `README says Passing but track is Pending (${tok})`,
          });
        }
      }
    }

    if (readmeTok.has("track-complete") && !trackTok.has("track-complete")) {
      // Track may say "Phases 0–N Passing" without the words "track complete"
      const hasOpenPending = [...trackTok].some((t) => t.endsWith(":pending"));
      if (hasOpenPending) {
        issues.push({
          track: row.file,
          message: "README says track complete but track still has Pending phases",
        });
      }
    }

    if (!readmeTok.has("track-complete") && trackTok.has("track-complete")) {
      const hasOpenPendingInReadme = [...readmeTok].some((t) => t.endsWith(":pending"));
      if (hasOpenPendingInReadme) {
        issues.push({
          track: row.file,
          message: "track is complete but README still lists Pending",
        });
      }
    }

    // Stale README: track has higher Passing phases than README mentions at all
    const readmePassingMax = maxPhaseNumber(readmeTok, "passing");
    const trackPassingMax = maxPhaseNumber(trackTok, "passing");
    if (
      readmePassingMax !== null &&
      trackPassingMax !== null &&
      trackPassingMax > readmePassingMax + 0
    ) {
      // Only flag when gap >= 1 and README doesn't say track-complete covering it
      if (trackPassingMax - readmePassingMax >= 1 && !readmeTok.has("track-complete")) {
        issues.push({
          track: row.file,
          message: `README max Passing phase ~${readmePassingMax} but track ~${trackPassingMax}`,
        });
      }
    }
  }

  // Orphan track files (roadmap md not in README) — warn only for *-roadmap.md
  for (const name of readdirSync(ROADMAPS)) {
    if (!name.endsWith("-roadmap.md")) continue;
    if (name === "README.md") continue;
    if (!readmeFiles.has(name)) {
      issues.push({ track: name, message: "track file not listed in README table" });
    }
  }

  return issues;
}

function maxPhaseNumber(tokens: Set<string>, state: string): number | null {
  let max: number | null = null;
  for (const tok of tokens) {
    if (!tok.startsWith("phase:") || !tok.endsWith(`:${state}`)) continue;
    const body = tok.slice("phase:".length, -(state.length + 1));
    // take trailing number in ranges like 0-7 or 6-9 or 5b
    const nums = [...body.matchAll(/(\d+)/g)].map((m) => Number(m[1]));
    for (const n of nums) {
      if (max === null || n > max) max = n;
    }
  }
  return max;
}

function main(): void {
  const issues = checkRoadmapStatus();
  if (issues.length === 0) {
    console.log("roadmaps:status-check OK — README table matches track Status lines");
    process.exit(0);
  }
  console.error(`roadmaps:status-check found ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.error(`  - ${issue.track}: ${issue.message}`);
  }
  process.exit(1);
}

const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("check-roadmap-status.mts") ||
    process.argv[1].endsWith("check-roadmap-status.mjs"));

if (isMain) {
  main();
}
