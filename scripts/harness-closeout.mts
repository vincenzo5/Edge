#!/usr/bin/env npx tsx
/**
 * Deterministic harness closeout — evidence-gated Active Work → Passing,
 * Current Verified State push, optional Session Log + roadmap status.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { appendToStatusArchive, prunePreviousVerifiedBlocks } from "./harness-archive.mts";
import {
  buildEfficiencyInputFromArgs,
  mergeEfficiencyInput,
  parseEfficiencyArgs,
  parseEfficiencyFile,
  validateEfficiencyInput,
  type EfficiencyInput,
} from "./efficiency-ledger.mts";
import {
  hasConcreteVerificationEvidence,
  hasParaphraseOnlyPass,
  hasPendingVerification,
  parseActiveWorkRows,
  sectionBetween,
  validateProjectStatusContent,
} from "./validate-project-status.mts";

export type CloseoutOptions = {
  name: string;
  evidenceText: string;
  behavior?: string;
  files?: string;
  next?: string;
  roadmap?: string;
  sessionLog?: string;
  trackName?: string;
  todayIso?: string;
  efficiency?: EfficiencyInput;
};

export type CloseoutResult = {
  statusContent: string;
  roadmapContent?: string;
  changed: string[];
};

const DEFAULT_STATUS_PATH = "docs/PROJECT-STATUS.md";

export function parseArgs(argv: string[]): {
  name?: string;
  evidenceFile?: string;
  behavior?: string;
  files?: string;
  next?: string;
  roadmap?: string;
  sessionLog?: string;
  trackName?: string;
  dryRun: boolean;
  statusPath: string;
  efficiencyFile?: string;
  userMessages?: number;
  handoffs?: number;
  reworkTurns?: number;
  spendUsd?: number;
  spendBaselineUsd?: number;
  startedAt?: string;
  tokens?: number;
  notes?: string;
  outcome?: EfficiencyInput["outcome"];
} {
  const getFlag = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    if (index === -1 || index + 1 >= argv.length) return undefined;
    return argv[index + 1];
  };

  const efficiency = parseEfficiencyArgs(argv);

  return {
    name: getFlag("--name"),
    evidenceFile: getFlag("--evidence-file"),
    behavior: getFlag("--behavior"),
    files: getFlag("--files"),
    next: getFlag("--next"),
    roadmap: getFlag("--roadmap"),
    sessionLog: getFlag("--session-log"),
    trackName: getFlag("--track-name"),
    dryRun: argv.includes("--dry-run"),
    statusPath: getFlag("--status") ?? DEFAULT_STATUS_PATH,
    efficiencyFile: efficiency.efficiencyFile,
    userMessages: efficiency.userMessages,
    handoffs: efficiency.handoffs,
    reworkTurns: efficiency.reworkTurns,
    spendUsd: efficiency.spendUsd,
    spendBaselineUsd: efficiency.spendBaselineUsd,
    startedAt: efficiency.startedAt,
    tokens: efficiency.tokens,
    notes: efficiency.notes,
    outcome: efficiency.outcome,
  };
}

export function resolveCloseoutEfficiencyInput(
  parsed: ReturnType<typeof parseArgs>,
  cwd = process.cwd(),
): { input?: EfficiencyInput; errors: string[] } {
  if (parsed.efficiencyFile) {
    try {
      const fileInput = parseEfficiencyFile(readEvidenceFile(parsed.efficiencyFile, cwd));
      if (parsed.startedAt && !fileInput.started_at) {
        fileInput.started_at = parsed.startedAt;
      }
      if (parsed.outcome && !fileInput.outcome) {
        fileInput.outcome = parsed.outcome;
      }
      if (fileInput.spend_usd === undefined) {
        fileInput.spend_usd = null;
      }
      const validationErrors = validateEfficiencyInput(fileInput);
      if (validationErrors.length > 0) return { errors: validationErrors };
      return { input: fileInput, errors: [] };
    } catch (error) {
      return {
        errors: [
          `failed to read efficiency file: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  if (!parsed.name) {
    return { errors: ["task name required for efficiency auto-fill"] };
  }

  return buildEfficiencyInputFromArgs(parsed, {
    taskName: parsed.name,
    cwd,
  });
}

export function readEvidenceFile(path: string, cwd = process.cwd()): string {
  const absolute = resolve(cwd, path);
  return readFileSync(absolute, "utf8").trim();
}

export function validateEvidenceText(evidenceText: string): string[] {
  const errors: string[] = [];
  if (!evidenceText.trim()) {
    errors.push("evidence file is empty");
    return errors;
  }
  if (hasPendingVerification(evidenceText)) {
    errors.push("evidence contains pending verification");
  }
  if (!hasConcreteVerificationEvidence(evidenceText)) {
    errors.push(
      "evidence lacks concrete verification (test count, build result, lint:instructions passed, app-level measurement)",
    );
  }
  if (hasParaphraseOnlyPass(evidenceText)) {
    errors.push("evidence is paraphrase-only pass wording without concrete result");
  }
  return errors;
}

export function formatEvidenceForCell(evidenceText: string): string {
  return evidenceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("; ");
}

export function parsePhaseFromName(name: string): number | null {
  const match = name.match(/Phase\s+(\d+)/i);
  return match ? Number.parseInt(match[1]!, 10) : null;
}

function splitTableCells(line: string): string[] {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter((_, index, arr) => index > 0 && index < arr.length - 1);
}

function buildTableRow(cells: [string, string, string, string, string]): string {
  return `| ${cells.join(" | ")} |`;
}

export function updateActiveWorkRow(
  content: string,
  featureName: string,
  updates: {
    state?: string;
    behavior?: string;
    evidence?: string;
    files?: string;
  },
): { content: string; found: boolean } {
  const activeWorkStart = content.indexOf("## Active Work");
  if (activeWorkStart === -1) {
    return { content, found: false };
  }

  const lines = content.split("\n");
  let found = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (!line.startsWith("|") || /^\|[\s-:|]+\|$/.test(line.trim())) continue;

    const cells = splitTableCells(line);
    if (cells.length < 5) continue;
    if (/^feature$/i.test(cells[0]!)) continue;

    const feature = cells[0]!.replace(/\*\*/g, "").trim();
    if (feature !== featureName.replace(/\*\*/g, "").trim()) continue;

    const nextCells: [string, string, string, string, string] = [
      cells[0]!,
      updates.behavior ?? cells[1]!,
      updates.state ?? cells[2]!,
      updates.evidence ?? cells[3]!,
      updates.files ?? cells[4]!,
    ];
    lines[index] = buildTableRow(nextCells);
    found = true;
    break;
  }

  return { content: lines.join("\n"), found };
}

export function extractCurrentVerifiedBlock(content: string): string {
  const section = sectionBetween(content, "## Current Verified State");
  return section.trim();
}

export function buildCurrentVerifiedStateBlock(options: {
  name: string;
  stateSummary: string;
  evidenceText: string;
  files?: string;
  next?: string;
}): string {
  const evidenceCell = formatEvidenceForCell(options.evidenceText);
  const filesLine = options.files?.trim()
    ? options.files
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => (part.startsWith("`") ? part : `\`${part}\``))
        .join(", ")
    : "see Active Work row";

  return [
    "## Current Verified State",
    "",
    `- **Current task:** ${options.name}.`,
    `- **State:** **Passing** — ${options.stateSummary}`,
    `- **Latest verification:** ${evidenceCell}`,
    `- **Evidence:** ${filesLine}`,
    `- **Current blocker:** none`,
    `- **Next best step:** ${options.next?.trim() || "none"}`,
  ].join("\n");
}

export function extractPreviousVerifiedHeading(oldBlock: string): string {
  const match = oldBlock.match(/\*\*Current task:\*\*\s+([^\n.]+)/);
  return match?.[1]?.trim() ?? "Unknown";
}

export function replaceCurrentVerifiedState(
  content: string,
  newBlock: string,
  options?: {
    previousName?: string;
    archivePath?: string;
    todayIso?: string;
  },
): string {
  const oldBlock = extractCurrentVerifiedBlock(content);
  const heading = "## Current Verified State";
  const start = content.indexOf(heading);
  if (start === -1) {
    throw new Error("missing Current Verified State section");
  }

  const afterHeading = content.slice(start + heading.length);
  const nextSectionMatch = afterHeading.match(/\n## /);
  const endOffset =
    nextSectionMatch?.index !== undefined
      ? start + heading.length + nextSectionMatch.index
      : content.length;

  const before = content.slice(0, start);
  const after = content.slice(endOffset);

  if (options?.archivePath && oldBlock.trim()) {
    const previousHeadingName =
      options.previousName ?? extractPreviousVerifiedHeading(oldBlock);
    appendToStatusArchive(
      options.archivePath,
      `Previous Verified State (${previousHeadingName})`,
      oldBlock,
      options.todayIso ?? new Date().toISOString().slice(0, 10),
    );
  }

  return `${before}${newBlock}${after}`.replace(/\n{3,}/g, "\n\n");
}

export function bumpLastUpdated(content: string, todayIso: string): string {
  if (/\*\*Last updated:\*\* \d{4}-\d{2}-\d{2}/.test(content)) {
    return content.replace(
      /\*\*Last updated:\*\* \d{4}-\d{2}-\d{2}/,
      `**Last updated:** ${todayIso}`,
    );
  }
  return content;
}

export function prependSessionLogEntry(
  content: string,
  entry: string,
  todayIso: string,
): string {
  const heading = "## Session Log";
  const start = content.indexOf(heading);
  if (start === -1) return content;

  const insertAt = start + heading.length;
  const normalized = entry.trim().startsWith("-")
    ? entry.trim()
    : `- **${todayIso} — ${entry.trim()}**`;

  return `${content.slice(0, insertAt)}\n\n${normalized}${content.slice(insertAt)}`;
}

export function updateRoadmapPhaseStatus(
  content: string,
  phaseNumber: number,
  fromStatus: "Pending" | "Passing" = "Pending",
): string {
  const phasePattern = new RegExp(
    `Phase ${phaseNumber}\\s+\\*\\*${fromStatus}\\*\\*`,
    "g",
  );
  let updated = content.replace(
    phasePattern,
    `Phase ${phaseNumber} **Passing**`,
  );

  const sectionMarker = `### Phase ${phaseNumber} —`;
  const sectionStart = updated.indexOf(sectionMarker);
  if (sectionStart !== -1) {
    const sectionSlice = updated.slice(sectionStart, sectionStart + 400);
    if (sectionSlice.includes(`Phase ${phaseNumber} **Pending**`)) {
      updated =
        updated.slice(0, sectionStart) +
        sectionSlice.replace(
          `Phase ${phaseNumber} **Pending**`,
          `Phase ${phaseNumber} **Passing**`,
        ) +
        updated.slice(sectionStart + 400);
    }
  }

  return updated;
}

export function applyCloseout(
  statusContent: string,
  options: CloseoutOptions,
  roadmapContent?: string,
): CloseoutResult {
  const todayIso = options.todayIso ?? new Date().toISOString().slice(0, 10);
  const evidenceCell = formatEvidenceForCell(options.evidenceText);
  const changed: string[] = [];

  let content = statusContent;

  const activeWorkSection = sectionBetween(content, "## Active Work");
  const rows = parseActiveWorkRows(activeWorkSection);
  const targetRow = rows.find(
    (row) =>
      row.feature.replace(/\*\*/g, "").trim() ===
      options.name.replace(/\*\*/g, "").trim(),
  );
  if (!targetRow) {
    throw new Error(`Active Work row not found for "${options.name}"`);
  }

  const rowUpdate = updateActiveWorkRow(content, options.name, {
    state: "**Passing**",
    behavior: options.behavior ?? undefined,
    evidence: evidenceCell,
    files: options.files ?? undefined,
  });
  if (!rowUpdate.found) {
    throw new Error(`failed to update Active Work row for "${options.name}"`);
  }
  content = rowUpdate.content;
  changed.push("Active Work row");

  if (options.trackName) {
    const trackEvidence = `Track complete — ${options.name} **Passing**; ${evidenceCell}`;
    const trackUpdate = updateActiveWorkRow(content, options.trackName, {
      state: "**Passing**",
      evidence: trackEvidence,
    });
    if (!trackUpdate.found) {
      throw new Error(`Active Work track row not found for "${options.trackName}"`);
    }
    content = trackUpdate.content;
    changed.push("track Active Work row");
  }

  const stateSummary =
    options.behavior?.trim() ||
    targetRow.feature.replace(/\*\*/g, "").trim() + " closeout via harness:closeout";

  const newCurrentBlock = buildCurrentVerifiedStateBlock({
    name: options.name,
    stateSummary,
    evidenceText: options.evidenceText,
    files: options.files,
    next: options.next,
  });

  const archivePath = resolve(
    process.cwd(),
    `docs/status-archive/${todayIso.slice(0, 7)}.md`,
  );
  content = replaceCurrentVerifiedState(content, newCurrentBlock, {
    previousName: options.name,
    archivePath,
    todayIso,
  });
  changed.push("Current Verified State");
  if (extractCurrentVerifiedBlock(statusContent).trim()) {
    changed.push("status archive");
  }

  const pruned = prunePreviousVerifiedBlocks(content, {
    archivePath,
    todayIso,
  });
  content = pruned.content;
  if (pruned.archivedCount > 0) {
    changed.push(`archived ${pruned.archivedCount} Previous Verified block(s)`);
  }

  content = bumpLastUpdated(content, todayIso);
  changed.push("Last updated");

  if (options.sessionLog) {
    content = prependSessionLogEntry(content, options.sessionLog, todayIso);
    changed.push("Session Log");
  }

  const validationIssues = validateProjectStatusContent(
    content,
    DEFAULT_STATUS_PATH,
    todayIso,
  );
  if (validationIssues.length > 0) {
    throw new Error(
      `closeout validation failed:\n${validationIssues.map((issue) => `- ${issue.message}`).join("\n")}`,
    );
  }

  let updatedRoadmap: string | undefined;
  if (roadmapContent) {
    const phaseNumber = parsePhaseFromName(options.name);
    if (phaseNumber !== null) {
      updatedRoadmap = updateRoadmapPhaseStatus(roadmapContent, phaseNumber);
      changed.push(`roadmap Phase ${phaseNumber}`);
    } else {
      updatedRoadmap = roadmapContent;
    }
  }

  return {
    statusContent: content,
    roadmapContent: updatedRoadmap,
    changed,
  };
}

export function runCloseout(options: {
  statusPath: string;
  closeout: CloseoutOptions;
  roadmapPath?: string;
  dryRun?: boolean;
  cwd?: string;
}): CloseoutResult {
  const cwd = options.cwd ?? process.cwd();
  const statusPath = resolve(cwd, options.statusPath);
  const statusContent = readFileSync(statusPath, "utf8");

  let roadmapContent: string | undefined;
  if (options.roadmapPath) {
    roadmapContent = readFileSync(resolve(cwd, options.roadmapPath), "utf8");
  }

  if (!options.closeout.efficiency) {
    throw new Error("closeout requires efficiency input");
  }

  const result = applyCloseout(statusContent, options.closeout, roadmapContent);

  mergeEfficiencyInput({
    taskName: options.closeout.name,
    input: options.closeout.efficiency,
    cwd,
    dryRun: options.dryRun,
    clearActive: !options.dryRun,
  });
  result.changed.push("efficiency ledger");

  if (!options.dryRun) {
    writeFileSync(statusPath, result.statusContent, "utf8");
    if (options.roadmapPath && result.roadmapContent) {
      writeFileSync(resolve(cwd, options.roadmapPath), result.roadmapContent, "utf8");
    }
  }

  return result;
}

function main(): void {
  const parsed = parseArgs(process.argv.slice(2));

  if (!parsed.name || !parsed.evidenceFile) {
    console.error(
      "Usage: npm run harness:closeout -- --name \"Feature name\" --evidence-file path [--files ...] [--behavior ...] [--next ...] [--roadmap path] [--track-name ...] [--session-log ...] [--user-messages N] [--handoffs N] [--rework-turns N] [--spend-usd X] [--efficiency-file path] [--dry-run]",
    );
    process.exit(1);
  }

  let evidenceText: string;
  try {
    evidenceText = readEvidenceFile(parsed.evidenceFile);
  } catch (error) {
    console.error(
      `harness:closeout failed to read evidence file: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }

  const evidenceErrors = validateEvidenceText(evidenceText);
  if (evidenceErrors.length > 0) {
    console.error("harness:closeout blocked — invalid evidence:");
    for (const message of evidenceErrors) {
      console.error(`  - ${message}`);
    }
    process.exit(1);
  }

  const { input: efficiencyInput, errors: efficiencyErrors } =
    resolveCloseoutEfficiencyInput(parsed);
  if (efficiencyErrors.length > 0 || !efficiencyInput) {
    console.error("harness:closeout blocked — invalid efficiency input:");
    for (const message of efficiencyErrors) {
      console.error(`  - ${message}`);
    }
    process.exit(1);
  }

  try {
    const result = runCloseout({
      statusPath: parsed.statusPath,
      closeout: {
        name: parsed.name,
        evidenceText,
        behavior: parsed.behavior,
        files: parsed.files,
        next: parsed.next,
        roadmap: parsed.roadmap,
        sessionLog: parsed.sessionLog,
        trackName: parsed.trackName,
        efficiency: efficiencyInput,
      },
      roadmapPath: parsed.roadmap,
      dryRun: parsed.dryRun,
    });

    const mode = parsed.dryRun ? "dry-run" : "complete";
    console.log(`harness:closeout ${mode} — updated: ${result.changed.join(", ")}`);
  } catch (error) {
    console.error(
      `harness:closeout failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("harness-closeout.mts") ||
    process.argv[1].endsWith("harness-closeout.mjs"));

if (isMain) {
  main();
}
