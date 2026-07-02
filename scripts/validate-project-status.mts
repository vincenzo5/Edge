/**
 * PROJECT-STATUS.md validation helpers — shared by lint:instructions and Vitest.
 */

export type Issue = { file: string; message: string };

const CROSS_COMPONENT_PREFIXES = [
  "src/lib/",
  "src/app/api/",
  "src/app/components/",
  "services/",
] as const;

/** True when text mentions incomplete verification (any "pending" substring). */
export function hasPendingVerification(text: string): boolean {
  return /\bpending\b/i.test(text);
}

/**
 * True when evidence cites a concrete verification result (test count, build, startup, or app-level measurement).
 */
export function hasConcreteVerificationEvidence(text: string): boolean {
  if (/\d+\s+tests?\s+passed/i.test(text)) return true;
  if (/passed\s*\([^)]*\d+\s+tests?[^)]*\)/i.test(text)) return true;
  if (/npm run build[^\n|]*passed/i.test(text)) return true;
  if (/npm run lint:instructions[^\n|]*passed/i.test(text)) return true;
  if (/check:startup[^\n|]*passed/i.test(text)) return true;
  if (/npm run check:startup[^\n|]*passed/i.test(text)) return true;
  if (/\*\*Full:\*\*[^\n|]*\d+\s+tests?/i.test(text)) return true;

  const appLevelPatterns = [
    /\*\*App-level:\*\*([^\n|]+)/i,
    /App-level:([^\n|]+)/i,
  ];
  for (const pattern of appLevelPatterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const detail = match[1];
    if (/\bpending\b/i.test(detail)) continue;
    if (/\d/.test(detail) || /\bms\b/i.test(detail) || /meta\.source:/i.test(detail)) {
      return true;
    }
  }

  return false;
}

/** True when text uses "pass(ed)" without a nearby digit-bearing result (paraphrase-only). */
export function hasParaphraseOnlyPass(text: string): boolean {
  if (hasConcreteVerificationEvidence(text)) return false;
  return /\b(passed|passes|pass)\b/i.test(text);
}

export function sectionBetween(
  content: string,
  heading: string,
  nextHeadingLevel = 2,
): string {
  const start = content.indexOf(heading);
  if (start === -1) return "";

  const rest = content.slice(start + heading.length);
  const nextHeading = new RegExp(`\\n#{${nextHeadingLevel}}\\s+`);
  const next = rest.search(nextHeading);
  return next === -1 ? rest : rest.slice(0, next);
}

export type ActiveWorkRow = {
  feature: string;
  state: string;
  evidence: string;
  files: string;
};

export function parseActiveWorkRows(activeWorkSection: string): ActiveWorkRow[] {
  const lines = activeWorkSection
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|[\s-:|]+\|$/.test(line.trim()));

  const rows: ActiveWorkRow[] = [];
  for (const line of lines) {
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter((_, index, arr) => index > 0 && index < arr.length - 1);

    if (cells.length < 5) continue;
    if (/^feature$/i.test(cells[0])) continue;

    rows.push({
      feature: cells[0],
      state: cells[2],
      evidence: cells[3],
      files: cells[4],
    });
  }

  return rows;
}

function extractLatestVerificationBlock(currentState: string): string {
  const match = currentState.match(/\*\*Latest verification:\*\*([\s\S]*?)(?=\n- \*\*|$)/);
  return match?.[1]?.trim() ?? "";
}

function extractStateSummaryLine(currentState: string): string {
  const match = currentState.match(/\*\*State:\*\*[^\n]*/);
  return match?.[0] ?? "";
}

function todayEntryInSessionLog(sessionLog: string, isoDate: string): boolean {
  return new RegExp(`### ${isoDate.replace(/[-]/g, "[-]")}\\s+`).test(sessionLog);
}

function countCrossComponentAreas(filesCell: string): number {
  return CROSS_COMPONENT_PREFIXES.filter((prefix) => filesCell.includes(prefix)).length;
}

function assertPassingEvidence(
  issues: Issue[],
  rel: string,
  context: string,
  evidence: string,
): void {
  if (hasPendingVerification(evidence)) {
    issues.push({
      file: rel,
      message: `${context} marked Passing while evidence contains pending`,
    });
  }

  if (!hasConcreteVerificationEvidence(evidence)) {
    issues.push({
      file: rel,
      message: `${context} marked Passing but evidence lacks a concrete verification result (test count / build result / app-level measurement)`,
    });
  }

  if (hasParaphraseOnlyPass(evidence)) {
    issues.push({
      file: rel,
      message: `${context} marked Passing with paraphrase-only pass wording and no concrete verification result`,
    });
  }
}

export function validateProjectStatusContent(
  content: string,
  rel = "docs/PROJECT-STATUS.md",
  todayIso = new Date().toISOString().slice(0, 10),
): Issue[] {
  const issues: Issue[] = [];

  if (!/\*\*Last updated:\*\* \d{4}-\d{2}-\d{2}/.test(content)) {
    issues.push({
      file: rel,
      message: "Last updated must use exact YYYY-MM-DD format",
    });
  }

  const currentState = sectionBetween(content, "## Current Verified State");
  if (!currentState) {
    issues.push({
      file: rel,
      message: "missing Current Verified State section",
    });
  }

  const requiredCurrentFields = [
    "Current task",
    "State",
    "Latest verification",
    "Evidence",
    "Current blocker",
    "Next best step",
  ];
  for (const field of requiredCurrentFields) {
    if (!currentState.includes(`**${field}:**`)) {
      issues.push({
        file: rel,
        message: `Current Verified State missing ${field}`,
      });
    }
  }

  if (/latest result not recorded yet/i.test(content)) {
    issues.push({
      file: rel,
      message: 'contains stale placeholder "latest result not recorded yet"',
    });
  }

  const activeWork = sectionBetween(content, "## Active Work");
  const activeRows = activeWork
    .split("\n")
    .filter((line) => line.startsWith("|") && /\|\s*\*\*Active\*\*\s*\|/.test(line));

  if (activeRows.length > 1) {
    issues.push({
      file: rel,
      message: `Active Work has ${activeRows.length} active rows; keep at most one`,
    });
  }

  const currentStateValue = currentState.match(
    /\*\*State:\*\*\s+\*\*(Pending|Active|Blocked|Passing)\*\*/,
  );

  if (!currentStateValue) {
    issues.push({
      file: rel,
      message: "Current Verified State has missing or invalid State value",
    });
  }

  const stateLabel = currentStateValue?.[1];
  const latestVerification = extractLatestVerificationBlock(currentState);
  const stateSummaryLine = extractStateSummaryLine(currentState);
  const currentVerificationText = `${stateSummaryLine}\n${latestVerification}`;

  if (stateLabel === "Passing") {
    if (hasPendingVerification(currentVerificationText)) {
      issues.push({
        file: rel,
        message:
          "Current Verified State cannot be Passing while Latest verification or State summary contains pending",
      });
    }

    assertPassingEvidence(
      issues,
      rel,
      "Current Verified State",
      `${latestVerification}\n${stateSummaryLine}`,
    );
  }

  const sessionLog = sectionBetween(content, "## Session Log");
  if (!sessionLog) {
    issues.push({
      file: rel,
      message: "missing Session Log section",
    });
  }

  if (
    stateLabel === "Passing" &&
    /\*\*Verification run:\*\*\s+Pending/i.test(sessionLog)
  ) {
    issues.push({
      file: rel,
      message: "Session Log cannot leave verification pending when current state is Passing",
    });
  }

  if (stateLabel === "Passing" && sessionLog) {
    const todayHeading = `### ${todayIso}`;
    const idx = sessionLog.indexOf(todayHeading);
    if (idx !== -1) {
      const todayEntry = sectionBetween(sessionLog.slice(idx), todayHeading, 3);
      const verificationRun = todayEntry.match(/\*\*Verification run:\*\*[^\n]*/)?.[0];
      if (verificationRun && hasPendingVerification(verificationRun)) {
        issues.push({
          file: rel,
          message: `Session Log entry for ${todayIso} cannot have pending verification when current state is Passing`,
        });
      }
    }
  }

  for (const row of parseActiveWorkRows(activeWork)) {
    if (!/\*\*Passing\*\*/.test(row.state)) continue;
    assertPassingEvidence(issues, rel, `Active Work row "${row.feature}"`, row.evidence);
  }

  return issues;
}

export function validateSessionExitContent(
  content: string,
  rel = "docs/PROJECT-STATUS.md",
  todayIso = new Date().toISOString().slice(0, 10),
): Issue[] {
  const issues: Issue[] = [];
  const currentState = sectionBetween(content, "## Current Verified State");
  const currentStateValue = currentState.match(
    /\*\*State:\*\*\s+\*\*(Pending|Active|Blocked|Passing)\*\*/,
  );
  const stateLabel = currentStateValue?.[1];

  if (stateLabel !== "Passing" && stateLabel !== "Pending") {
    return issues;
  }

  const sessionLog = sectionBetween(content, "## Session Log");
  if (!todayEntryInSessionLog(sessionLog, todayIso)) {
    issues.push({
      file: rel,
      message: `Session Log must include an entry dated ${todayIso} when current state is ${stateLabel}`,
    });
  }

  const activeWork = sectionBetween(content, "## Active Work");
  const parsedRows = parseActiveWorkRows(activeWork);
  const activeRow =
    parsedRows.find((row) => /\*\*Active\*\*/.test(row.state)) ??
    parsedRows.find((row) =>
      currentState.includes(row.feature.replace(/\*\*/g, "")),
    );

  if (!activeRow) return issues;

  const areaCount = countCrossComponentAreas(activeRow.files);
  if (areaCount <= 1) return issues;

  const featureName = activeRow.feature.replace(/\*\*/g, "").trim();
  const contractHeading = `## Task Contract — ${featureName}`;
  if (!content.includes(contractHeading)) {
    issues.push({
      file: rel,
      message: `cross-component Active Work row "${featureName}" requires Task Contract heading "${contractHeading}"`,
    });
  }

  return issues;
}
