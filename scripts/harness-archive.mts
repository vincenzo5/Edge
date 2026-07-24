/**
 * Harness archive helpers — move overflow Previous Verified, Active Work,
 * and Task Contract sections from the hot PROJECT-STATUS file into status-archive/.
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const DEFAULT_MAX_PREVIOUS_VERIFIED = 0;
export const DEFAULT_MAX_PASSING_ACTIVE_WORK = 10;

const PREVIOUS_HEADING_RE = /^## Previous Verified State \(/m;

export function extractPreviousVerifiedBlocks(content: string): string[] {
  const blocks: string[] = [];
  const lines = content.split("\n");
  let current: string[] | null = null;

  for (const line of lines) {
    if (PREVIOUS_HEADING_RE.test(line)) {
      if (current !== null) {
        blocks.push(current.join("\n").trimEnd());
      }
      current = [line];
      continue;
    }
    if (current !== null) {
      if (line.startsWith("## ") && !PREVIOUS_HEADING_RE.test(line)) {
        blocks.push(current.join("\n").trimEnd());
        current = null;
        if (
          line === "## Startup Readiness" ||
          line === "## Shipped Foundations" ||
          line === "## Harness Retention" ||
          line === "## Active Work" ||
          line === "## Session Log" ||
          line.startsWith("## Task Contract")
        ) {
          continue;
        }
      } else {
        current.push(line);
      }
    }
  }

  if (current !== null) {
    blocks.push(current.join("\n").trimEnd());
  }

  return blocks;
}

export function appendToStatusArchive(
  archivePath: string,
  sectionTitle: string,
  body: string,
  todayIso: string,
): void {
  const header = existsSync(archivePath)
    ? ""
    : `# Project Status Archive — ${todayIso.slice(0, 7)}\n\n_Pruned from \`docs/PROJECT-STATUS.md\` on ${todayIso}. Hot file retains operational context only._\n\n`;

  const chunk = [
    header,
    `## ${sectionTitle} (${todayIso})`,
    "",
    body.trim(),
    "",
  ]
    .filter((part, index) => !(index === 0 && part === ""))
    .join("\n");

  appendFileSync(archivePath, chunk, "utf8");
}

export function prunePreviousVerifiedBlocks(
  content: string,
  options: {
    maxKeep?: number;
    archivePath: string;
    todayIso: string;
  },
): { content: string; archivedCount: number } {
  const maxKeep = options.maxKeep ?? DEFAULT_MAX_PREVIOUS_VERIFIED;
  const blocks = extractPreviousVerifiedBlocks(content);
  if (blocks.length <= maxKeep) {
    return { content, archivedCount: 0 };
  }

  const keep = blocks.slice(0, maxKeep);
  const overflow = blocks.slice(maxKeep);

  appendToStatusArchive(
    options.archivePath,
    "Previous Verified State (overflow)",
    overflow.join("\n\n"),
    options.todayIso,
  );

  const firstPreviousIndex = content.search(PREVIOUS_HEADING_RE);
  if (firstPreviousIndex === -1) {
    return { content, archivedCount: 0 };
  }

  const tailMarkers = [
    "## Startup Readiness",
    "## Shipped Foundations",
    "## Harness Retention",
    "## Active Work",
  ];
  let tailStart = content.length;
  for (const marker of tailMarkers) {
    const idx = content.indexOf(`\n${marker}`);
    if (idx !== -1 && idx < tailStart) {
      tailStart = idx + 1;
    }
  }

  const before = content.slice(0, firstPreviousIndex).trimEnd();
  const tail = content.slice(tailStart);
  const middle = keep.length > 0 ? `${keep.join("\n\n")}\n\n` : "";

  return {
    content: `${before}\n\n${middle}${tail}`.replace(/\n{3,}/g, "\n\n"),
    archivedCount: overflow.length,
  };
}

function splitTableCells(line: string): string[] {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter((_, index, arr) => index > 0 && index < arr.length - 1);
}

export function pruneActiveWorkPassingRows(
  content: string,
  options: {
    maxPassing?: number;
    archivePath: string;
    todayIso: string;
    alwaysKeepFeatures?: string[];
  },
): { content: string; archivedCount: number } {
  const maxPassing = options.maxPassing ?? DEFAULT_MAX_PASSING_ACTIVE_WORK;
  const alwaysKeep = new Set(
    (options.alwaysKeepFeatures ?? []).map((name) =>
      name.replace(/\*\*/g, "").trim(),
    ),
  );

  const heading = "## Active Work";
  const start = content.indexOf(heading);
  if (start === -1) {
    return { content, archivedCount: 0 };
  }

  const afterHeading = content.slice(start + heading.length);
  const nextSectionMatch = afterHeading.match(/\n## /);
  const end =
    nextSectionMatch?.index !== undefined
      ? start + heading.length + nextSectionMatch.index
      : content.length;

  const section = content.slice(start, end);
  const lines = section.split("\n");
  const headerLines: string[] = [];
  const dataRows: string[] = [];
  let inTable = false;

  for (const line of lines) {
    if (line.startsWith("|")) {
      inTable = true;
      if (/^\|[\s-:|]+\|$/.test(line.trim()) || /^feature$/i.test(splitTableCells(line)[0] ?? "")) {
        headerLines.push(line);
      } else {
        dataRows.push(line);
      }
    } else if (!inTable) {
      headerLines.push(line);
    }
  }

  const parsed = dataRows.map((line) => {
    const cells = splitTableCells(line);
    return {
      line,
      feature: cells[0]?.replace(/\*\*/g, "").trim() ?? "",
      state: cells[2] ?? "",
    };
  });

  const nonPassing = parsed.filter(
    (row) =>
      alwaysKeep.has(row.feature) ||
      /\*\*(Active|Pending|Blocked)\*\*/.test(row.state),
  );
  const passing = parsed.filter(
    (row) =>
      !alwaysKeep.has(row.feature) && /\*\*Passing\*\*/.test(row.state),
  );

  const keepPassing = passing.slice(0, maxPassing);
  const overflowPassing = passing.slice(maxPassing);

  if (overflowPassing.length > 0) {
    appendToStatusArchive(
      options.archivePath,
      "Active Work Passing rows (overflow)",
      overflowPassing.map((row) => row.line).join("\n"),
      options.todayIso,
    );
  }

  const keptRows = [...nonPassing, ...keepPassing].map((row) => row.line);
  const newSection = [...headerLines, ...keptRows].join("\n");
  const newContent =
    content.slice(0, start) + newSection + content.slice(end);

  return { content: newContent, archivedCount: overflowPassing.length };
}

export function archiveTaskContracts(
  content: string,
  options: {
    archivePath: string;
    todayIso: string;
    keepHeading?: (heading: string, body: string) => boolean;
  },
): { content: string; archivedCount: number } {
  const keepHeading =
    options.keepHeading ??
    ((_heading, body) => /\*\*(Active|Pending|Blocked)\*\*/.test(body));

  const headingRe = /^## Task Contract — /m;
  const first = content.search(headingRe);
  if (first === -1) {
    return { content, archivedCount: 0 };
  }

  const sessionLogIndex = content.indexOf("\n## Session Log");
  if (sessionLogIndex === -1) {
    return { content, archivedCount: 0 };
  }

  const contractsSection = content.slice(first, sessionLogIndex);
  const tail = content.slice(sessionLogIndex + 1);

  const blocks: Array<{ heading: string; body: string }> = [];
  const parts = contractsSection.split(/\n(?=## Task Contract — )/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith("## Task Contract")) continue;
    const newline = trimmed.indexOf("\n");
    const heading = newline === -1 ? trimmed : trimmed.slice(0, newline);
    const body = newline === -1 ? "" : trimmed.slice(newline + 1);
    blocks.push({ heading, body });
  }

  const keep: typeof blocks = [];
  const archive: typeof blocks = [];
  for (const block of blocks) {
    if (keepHeading(block.heading, block.body)) {
      keep.push(block);
    } else {
      archive.push(block);
    }
  }

  if (archive.length > 0) {
    appendToStatusArchive(
      options.archivePath,
      "Task Contracts (completed)",
      archive.map((b) => `${b.heading}\n${b.body}`.trim()).join("\n\n"),
      options.todayIso,
    );
  }

  const keptText =
    keep.length > 0
      ? `${keep.map((b) => `${b.heading}\n${b.body}`.trim()).join("\n\n")}\n\n`
      : "";

  const before = content.slice(0, first).trimEnd();
  return {
    content: `${before}\n\n${keptText}${tail}`.replace(/\n{3,}/g, "\n\n"),
    archivedCount: archive.length,
  };
}

export function runHarnessPrune(options: {
  statusPath?: string;
  archivePath?: string;
  todayIso?: string;
  maxPrevious?: number;
  maxPassingActiveWork?: number;
  dryRun?: boolean;
}): {
  previousArchived: number;
  activeWorkArchived: number;
  contractsArchived: number;
  sessionLogArchived: number;
  lineCountBefore: number;
  lineCountAfter: number;
} {
  const cwd = process.cwd();
  const statusPath = resolve(cwd, options.statusPath ?? "docs/PROJECT-STATUS.md");
  const todayIso = options.todayIso ?? new Date().toISOString().slice(0, 10);
  const archivePath = resolve(
    cwd,
    options.archivePath ?? `docs/status-archive/${todayIso.slice(0, 7)}.md`,
  );

  let content = readFileSync(statusPath, "utf8");
  const lineCountBefore = content.split("\n").length;

  const previous = prunePreviousVerifiedBlocks(content, {
    maxKeep: options.maxPrevious ?? DEFAULT_MAX_PREVIOUS_VERIFIED,
    archivePath,
    todayIso,
  });
  content = previous.content;

  const activeWork = pruneActiveWorkPassingRows(content, {
    maxPassing: options.maxPassingActiveWork ?? DEFAULT_MAX_PASSING_ACTIVE_WORK,
    archivePath,
    todayIso,
  });
  content = activeWork.content;

  const contracts = archiveTaskContracts(content, {
    archivePath,
    todayIso,
  });
  content = contracts.content;

  const sessionLog = pruneSessionLogEntries(content, {
    archivePath,
    todayIso,
  });
  content = sessionLog.content;

  const lineCountAfter = content.split("\n").length;

  if (!options.dryRun) {
    writeFileSync(statusPath, content, "utf8");
  }

  return {
    previousArchived: previous.archivedCount,
    activeWorkArchived: activeWork.archivedCount,
    contractsArchived: contracts.archivedCount,
    sessionLogArchived: sessionLog.archivedCount,
    lineCountBefore,
    lineCountAfter,
  };
}

export function pruneSessionLogEntries(
  content: string,
  options: {
    maxKeep?: number;
    archivePath: string;
    todayIso: string;
  },
): { content: string; archivedCount: number } {
  const maxKeep = options.maxKeep ?? 15;
  const heading = "## Session Log";
  const start = content.indexOf(heading);
  if (start === -1) {
    return { content, archivedCount: 0 };
  }

  const afterHeading = content.slice(start + heading.length);
  const nextSectionMatch = afterHeading.match(/\n## /);
  const end =
    nextSectionMatch?.index !== undefined
      ? start + heading.length + nextSectionMatch.index
      : content.length;

  const section = content.slice(start, end);
  const introLines: string[] = [];
  const entries: string[] = [];
  let currentEntry: string[] = [];
  let inIntro = true;

  for (const line of section.split("\n").slice(1)) {
    if (line.startsWith("### ")) {
      inIntro = false;
      if (currentEntry.length > 0) {
        entries.push(currentEntry.join("\n").trimEnd());
      }
      currentEntry = [line];
      continue;
    }
    if (/^- \*\*20\d{2}-\d{2}-\d{2}/.test(line)) {
      inIntro = false;
      if (currentEntry.length > 0) {
        entries.push(currentEntry.join("\n").trimEnd());
      }
      currentEntry = [line];
      continue;
    }
    if (inIntro) {
      introLines.push(line);
    } else if (currentEntry.length > 0 || line.trim()) {
      currentEntry.push(line);
    }
  }
  if (currentEntry.length > 0) {
    entries.push(currentEntry.join("\n").trimEnd());
  }

  if (entries.length <= maxKeep) {
    return { content, archivedCount: 0 };
  }

  const keep = entries.slice(0, maxKeep);
  const overflow = entries.slice(maxKeep);

  appendToStatusArchive(
    options.archivePath,
    "Session Log (overflow)",
    overflow.join("\n\n"),
    options.todayIso,
  );

  const newSection = [
    heading,
    ...introLines,
    "",
    ...keep.flatMap((entry, index) =>
      index === 0 ? [entry] : ["", entry],
    ),
  ]
    .join("\n")
    .trimEnd();

  const newContent =
    content.slice(0, start) + newSection + content.slice(end);
  return { content: newContent, archivedCount: overflow.length };
}

const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("harness-archive.mts") ||
    process.argv[1].endsWith("harness-archive.mjs"));

if (isMain) {
  const dryRun = process.argv.includes("--dry-run");
  const getFlag = (flag: string): string | undefined => {
    const index = process.argv.indexOf(flag);
    if (index === -1 || index + 1 >= process.argv.length) return undefined;
    return process.argv[index + 1];
  };
  const todayIso =
    getFlag("--today") ?? new Date().toISOString().slice(0, 10);
  const result = runHarnessPrune({
    dryRun,
    todayIso,
    statusPath: getFlag("--status"),
    archivePath: getFlag("--archive"),
    maxPrevious: getFlag("--max-previous")
      ? Number.parseInt(getFlag("--max-previous")!, 10)
      : undefined,
    maxPassingActiveWork: getFlag("--max-passing")
      ? Number.parseInt(getFlag("--max-passing")!, 10)
      : undefined,
  });
  console.log(
    `status:prune ${dryRun ? "dry-run" : "complete"} — previous=${result.previousArchived}, activeWork=${result.activeWorkArchived}, contracts=${result.contractsArchived}, sessionLog=${result.sessionLogArchived}, lines ${result.lineCountBefore}→${result.lineCountAfter}`,
  );
}
