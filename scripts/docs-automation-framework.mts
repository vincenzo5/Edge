/**
 * Documentation automation framework — deterministic routing, typed lanes,
 * allowlists, and lane-specific Cursor SDK prompts.
 */

export type DocType =
  | "operational_harness"
  | "area_architecture"
  | "feature_inventory"
  | "tool_inventory"
  | "product_roadmap"
  | "process_checklist"
  | "generated_report";

export type AutomationLane = "architecture" | "harness" | "drift-audit";

export type OwnerArea =
  | "chart"
  | "marketData"
  | "ui"
  | "ai"
  | "persistence"
  | "screener"
  | "brokerage"
  | "options"
  | "scripts";

export type DocTarget = {
  path: string;
  type: DocType;
  ownerAreas: OwnerArea[];
};

export type DocImpactMap = {
  changedFiles: string[];
  ownerAreas: OwnerArea[];
  lanes: AutomationLane[];
  allowedDocPaths: string[];
  architectureTargets: DocTarget[];
  harnessAllowed: boolean;
  evidenceProvided: boolean;
};

export type AgentSummary = {
  kind: "no_update" | "updated" | "drift_report" | "unknown";
  paths: string[];
  raw: string;
};

export type ValidationIssue = {
  code: string;
  message: string;
};

const AREA_PATH_RULES: { area: OwnerArea; pattern: RegExp }[] = [
  { area: "chart", pattern: /^(packages\/chart-(react|core)\/|src\/lib\/chart\/)/ },
  { area: "marketData", pattern: /^(src\/lib\/marketData\/|src\/lib\/chartDataFeed\/|services\/tws-sidecar\/)/ },
  { area: "ui", pattern: /^(src\/app\/components\/|src\/lib\/design-system\/)/ },
  { area: "ai", pattern: /^src\/lib\/ai\// },
  { area: "persistence", pattern: /^(src\/lib\/persistence\/|src\/app\/api\/me\/)/ },
  { area: "screener", pattern: /^(src\/lib\/screener\/|src\/app\/components\/screener\/|src\/app\/api\/screener\/)/ },
  { area: "brokerage", pattern: /^(src\/lib\/brokerage\/|src\/app\/api\/brokerage\/)/ },
  { area: "options", pattern: /^(src\/lib\/options\/|src\/lib\/risk\/|src\/app\/components\/options\/)/ },
  { area: "scripts", pattern: /^scripts\// },
];

const DOC_TARGETS: DocTarget[] = [
  {
    path: "docs/PROJECT-STATUS.md",
    type: "operational_harness",
    ownerAreas: ["chart", "marketData", "ui", "ai", "persistence", "screener", "brokerage", "options", "scripts"],
  },
  {
    path: "src/lib/chart/ARCHITECTURE.md",
    type: "area_architecture",
    ownerAreas: ["chart"],
  },
  {
    path: "docs/chart/features.md",
    type: "feature_inventory",
    ownerAreas: ["chart"],
  },
  {
    path: "docs/chart/context-menu-reference.md",
    type: "feature_inventory",
    ownerAreas: ["chart"],
  },
  {
    path: "src/lib/marketData/ARCHITECTURE.md",
    type: "area_architecture",
    ownerAreas: ["marketData"],
  },
  {
    path: "src/lib/chartDataFeed/ARCHITECTURE.md",
    type: "area_architecture",
    ownerAreas: ["marketData", "chart"],
  },
  {
    path: "src/lib/design-system/ARCHITECTURE.md",
    type: "area_architecture",
    ownerAreas: ["ui"],
  },
  {
    path: "src/lib/ai/ARCHITECTURE.md",
    type: "area_architecture",
    ownerAreas: ["ai"],
  },
  {
    path: "docs/ai-tools-architecture.md",
    type: "tool_inventory",
    ownerAreas: ["ai"],
  },
  {
    path: "src/lib/persistence/ARCHITECTURE.md",
    type: "area_architecture",
    ownerAreas: ["persistence"],
  },
  {
    path: "docs/roadmaps/screener-roadmap.md",
    type: "product_roadmap",
    ownerAreas: ["screener"],
  },
  {
    path: "docs/roadmaps/journal-roadmap.md",
    type: "product_roadmap",
    ownerAreas: ["journal"],
  },
  {
    path: "docs/roadmaps/trading-execution-roadmap.md",
    type: "product_roadmap",
    ownerAreas: ["trading"],
  },
  {
    path: "docs/roadmaps/dual-connection-roadmap.md",
    type: "product_roadmap",
    ownerAreas: ["trading", "marketData"],
  },
  {
    path: "docs/ROADMAP.md",
    type: "product_roadmap",
    ownerAreas: ["chart", "marketData", "ai", "screener"],
  },
  {
    path: "docs/perf/market-data-performance.md",
    type: "generated_report",
    ownerAreas: ["marketData"],
  },
];

const DRIFT_SYNC_CLUSTERS: { id: string; codePaths: RegExp[]; docPaths: string[] }[] = [
  {
    id: "indicators",
    codePaths: [/^packages\/chart-core\/src\/indicators\//],
    docPaths: ["docs/chart/features.md", "docs/ai-tools-architecture.md"],
  },
  {
    id: "ai_tools",
    codePaths: [/^src\/lib\/ai\//],
    docPaths: ["docs/ai-tools-architecture.md", "src/lib/ai/ARCHITECTURE.md"],
  },
  {
    id: "chart_features",
    codePaths: [/^(packages\/chart-react\/|src\/lib\/chart\/|src\/app\/components\/chart)/],
    docPaths: ["docs/chart/features.md", "docs/chart/context-menu-reference.md"],
  },
];

/** Classify changed file paths into owner areas. */
export function classifyOwnerAreas(changedFiles: string[]): OwnerArea[] {
  const areas = new Set<OwnerArea>();
  for (const file of changedFiles) {
    for (const rule of AREA_PATH_RULES) {
      if (rule.pattern.test(file)) {
        areas.add(rule.area);
      }
    }
  }
  return [...areas];
}

/** Resolve doc targets for the given owner areas. */
export function resolveDocTargets(ownerAreas: OwnerArea[]): DocTarget[] {
  if (ownerAreas.length === 0) {
    return [];
  }

  const areaSet = new Set(ownerAreas);
  const targets = DOC_TARGETS.filter((target) =>
    target.ownerAreas.some((area) => areaSet.has(area)),
  );

  const byPath = new Map<string, DocTarget>();
  for (const target of targets) {
    byPath.set(target.path, target);
  }
  return [...byPath.values()];
}

/** Build the automation impact map for a diff. */
export function buildDocImpactMap(options: {
  changedFiles: string[];
  lane?: AutomationLane;
  evidenceProvided?: boolean;
}): DocImpactMap {
  const ownerAreas = classifyOwnerAreas(options.changedFiles);
  const architectureTargets = resolveDocTargets(ownerAreas);
  const evidenceProvided = options.evidenceProvided ?? false;
  const requestedLane = options.lane;

  const lanes: AutomationLane[] = [];
  if (requestedLane === "drift-audit") {
    lanes.push("drift-audit");
  } else if (requestedLane === "architecture") {
    lanes.push("architecture");
  } else if (requestedLane === "harness") {
    if (evidenceProvided) {
      lanes.push("harness");
    }
  } else {
    if (architectureTargets.length > 0 || ownerAreas.length > 0) {
      lanes.push("architecture");
    }
    if (evidenceProvided) {
      lanes.push("harness");
    }
  }

  const allowedDocPaths = new Set<string>();
  if (lanes.includes("architecture")) {
    for (const target of architectureTargets) {
      if (target.type !== "operational_harness") {
        allowedDocPaths.add(target.path);
      }
    }
  }
  if (lanes.includes("harness")) {
    allowedDocPaths.add("docs/PROJECT-STATUS.md");
  }

  return {
    changedFiles: options.changedFiles,
    ownerAreas,
    lanes,
    allowedDocPaths: [...allowedDocPaths],
    architectureTargets,
    harnessAllowed: lanes.includes("harness"),
    evidenceProvided,
  };
}

/** Parse the agent's one-line summary reply. */
export function parseAgentSummary(text: string | undefined): AgentSummary {
  const raw = (text ?? "").trim();
  if (!raw) {
    return { kind: "unknown", paths: [], raw: "" };
  }

  const noUpdate = /^no docs update needed$/i.test(raw);
  if (noUpdate) {
    return { kind: "no_update", paths: [], raw };
  }

  const updatedMatch = /^updated:\s*(.+)$/i.exec(raw);
  if (updatedMatch) {
    const paths = updatedMatch[1]!
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    return { kind: "updated", paths, raw };
  }

  const driftMatch = /^drift report:\s*(.+)$/i.exec(raw);
  if (driftMatch) {
    const paths = driftMatch[1]!
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    return { kind: "drift_report", paths, raw };
  }

  return { kind: "unknown", paths: [], raw };
}

/** Normalize porcelain/git path for comparison. */
export function normalizeRepoPath(path: string): string {
  return path.replace(/^\.\/+/, "").trim();
}

/** Extract changed paths from git porcelain lines. */
export function pathsFromPorcelain(lines: string[]): string[] {
  return lines
    .map((line) => normalizeRepoPath(line.slice(3)))
    .filter(Boolean);
}

/** True when every changed path is within the computed allowlist. */
export function validateAllowlist(changedPaths: string[], allowedDocPaths: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allowed = new Set(allowedDocPaths.map(normalizeRepoPath));

  for (const path of changedPaths.map(normalizeRepoPath)) {
    if (!allowed.has(path)) {
      issues.push({
        code: "allowlist_violation",
        message: `Agent edited disallowed path: ${path}`,
      });
    }
  }

  return issues;
}

/** Compare agent summary to actual doc changes. */
export function validateSummaryAgainstChanges(
  summary: AgentSummary,
  changedPaths: string[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const normalizedChanged = changedPaths.map(normalizeRepoPath).sort();

  if (summary.kind === "no_update" && normalizedChanged.length > 0) {
    issues.push({
      code: "summary_mismatch",
      message: "Agent reported no docs update but files changed",
    });
    return issues;
  }

  if (summary.kind === "updated" && normalizedChanged.length === 0) {
    issues.push({
      code: "summary_mismatch",
      message: "Agent reported updated docs but no doc files changed",
    });
    return issues;
  }

  if (summary.kind === "updated" && normalizedChanged.length > 0) {
    const reported = summary.paths.map(normalizeRepoPath).sort();
    const missingFromSummary = normalizedChanged.filter((path) => !reported.includes(path));
    const extraInSummary = reported.filter((path) => !normalizedChanged.includes(path));

    if (missingFromSummary.length > 0 || extraInSummary.length > 0) {
      issues.push({
        code: "summary_paths_mismatch",
        message: `Summary paths do not match actual changes (missing: ${missingFromSummary.join(", ") || "none"}; extra: ${extraInSummary.join(", ") || "none"})`,
      });
    }
  }

  return issues;
}

/** Paths that require lint:instructions after edit. */
export function requiresInstructionValidation(changedPaths: string[]): boolean {
  return changedPaths.some((path) => {
    const normalized = normalizeRepoPath(path);
    return (
      normalized === "docs/PROJECT-STATUS.md" ||
      normalized === "AGENTS.md" ||
      normalized.startsWith("docs/checklists/") ||
      normalized.startsWith(".cursor/rules/")
    );
  });
}

/** Drift clusters triggered by changed files. */
export function resolveDriftClusters(changedFiles: string[]): typeof DRIFT_SYNC_CLUSTERS {
  return DRIFT_SYNC_CLUSTERS.filter((cluster) =>
    changedFiles.some((file) => cluster.codePaths.some((pattern) => pattern.test(file))),
  );
}

export type DiffRange = { base: string; head: string; remoteRef?: string };

function formatRangeText(ranges: DiffRange[]): string {
  return ranges.map((range) => `- base: ${range.base}, head: ${range.head}`).join("\n");
}

function formatAllowedPaths(impact: DocImpactMap): string {
  if (impact.allowedDocPaths.length === 0) {
    return "- (none — report only)";
  }
  return impact.allowedDocPaths.map((path) => `- ${path}`).join("\n");
}

function formatArchitectureTargets(impact: DocImpactMap): string {
  if (impact.architectureTargets.length === 0) {
    return "- (none detected from diff)";
  }
  return impact.architectureTargets
    .map((target) => `- ${target.path} (${target.type})`)
    .join("\n");
}

const SHARED_RULES = `Rules:
- Do not create new documentation files unless absolutely necessary.
- Do not edit source code, tests, or config outside docs/.
- Leave all changes unstaged.
- If docs are already current, make no edits.
- Reply with exactly one summary line (see lane instructions).`;

/** Lane A — architecture and inventory docs. */
export function buildArchitectureLanePrompt(ranges: DiffRange[], impact: DocImpactMap): string {
  return `You are updating architecture and inventory documentation for a local git push in the Edge charting repo.

Lane: architecture (Lane A)
Owner areas detected: ${impact.ownerAreas.join(", ") || "none"}

Inspect the diff for these commit ranges:
${formatRangeText(ranges)}

Use git to inspect changes, for example:
git diff --stat <base>...<head>
git log --oneline <base>..<head>

Allowed doc paths (edit ONLY these if updates are required):
${formatAllowedPaths(impact)}

Suggested targets from routing:
${formatArchitectureTargets(impact)}

Harness restrictions:
- Do NOT edit docs/PROJECT-STATUS.md in this lane.
- Do NOT mark any work Passing or create Active Work rows.

${SHARED_RULES}

When finished, reply with exactly one line:
- "no docs update needed"
- or "updated: <comma-separated paths>"`;
}

/** Lane B — harness docs (evidence-gated). */
export function buildHarnessLanePrompt(
  ranges: DiffRange[],
  impact: DocImpactMap,
  evidenceText: string,
): string {
  return `You are updating harness documentation for a local git push in the Edge charting repo.

Lane: harness (Lane B — evidence-gated)
Allowed doc paths (edit ONLY these):
${formatAllowedPaths(impact)}

Verification evidence supplied by the implementing session (quote verbatim in Completion evidence / Latest verification):
---
${evidenceText.trim()}
---

Inspect the diff for these commit ranges:
${formatRangeText(ranges)}

Harness rules (mandatory):
- WIP=1: at most one Active Work row may be Active — do NOT create a second Active row.
- Do NOT mark **Passing** unless the supplied evidence contains concrete quoted output (test counts, build exit, ms timings, meta.source).
- If app-level verification is still pending/deferred, keep state **Pending**, not Passing.
- Update Files and Behavior columns when the diff clearly maps to an existing row.
- Append a Session Log entry dated today only when evidence supports the update.
- Update Current Verified State only when evidence supports the state transition.

${SHARED_RULES}

When finished, reply with exactly one line:
- "no docs update needed"
- or "updated: docs/PROJECT-STATUS.md"`;
}

/** Lane C — drift audit (report-only). */
export function buildDriftAuditPrompt(ranges: DiffRange[], impact: DocImpactMap): string {
  const clusters = resolveDriftClusters(impact.changedFiles);
  const clusterText =
    clusters.length === 0
      ? "- (none — perform a general stale-doc scan for changed areas)"
      : clusters
          .map((cluster) => `- ${cluster.id}: check ${cluster.docPaths.join(", ")}`)
          .join("\n");

  return `You are performing a read-only documentation drift audit for the Edge charting repo.

Lane: drift-audit (Lane C — report only)
Owner areas detected: ${impact.ownerAreas.join(", ") || "none"}

Inspect the diff for these commit ranges:
${formatRangeText(ranges)}

Sync clusters to check:
${clusterText}

Rules:
- Do NOT edit any files.
- Compare code sources of truth (registries, exports, feature behavior) to existing docs.
- Report stale, missing, or conflicting documentation.

When finished, reply with exactly one line:
- "drift report: none"
- or "drift report: <comma-separated doc paths that appear stale>"`;
}

/** Combined prompt when multiple lanes run in one agent invocation. */
export function buildCombinedDocsPrompt(
  ranges: DiffRange[],
  impact: DocImpactMap,
  evidenceText?: string,
): string {
  if (impact.lanes.length === 1 && impact.lanes[0] === "drift-audit") {
    return buildDriftAuditPrompt(ranges, impact);
  }

  const sections: string[] = [];

  if (impact.lanes.includes("architecture")) {
    sections.push(buildArchitectureLanePrompt(ranges, impact));
  }

  if (impact.lanes.includes("harness")) {
    sections.push(buildHarnessLanePrompt(ranges, impact, evidenceText ?? ""));
  }

  if (sections.length === 1) {
    return sections[0]!;
  }

  return `${sections.join("\n\n---\n\n")}

Run all applicable lanes above in one pass. When finished, reply with exactly one line:
- "no docs update needed"
- or "updated: <comma-separated paths>"`;
}
