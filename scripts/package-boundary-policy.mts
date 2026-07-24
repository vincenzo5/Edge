/**
 * Shared boundary validation helpers (used by CLI and tests).
 */

export type BoundaryIssue = { file: string; reason: string; line?: number };

export const CLOSED_APP_CHECKS: Array<{ test: (specifier: string) => boolean; reason: string }> = [
  { test: (s) => s.startsWith("@/"), reason: "imports app alias @/" },
  { test: (s) => s.startsWith("@/app/"), reason: "imports app components" },
  { test: (s) => /\/src\/app\//.test(s), reason: "imports app layer" },
  { test: (s) => /\/src\/lib\/persistence\//.test(s), reason: "imports persistence layer" },
  { test: (s) => s.startsWith("next/") || s === "next", reason: "imports Next.js runtime" },
  { test: (s) => s.includes("/lib/chartConfig"), reason: "imports app chartConfig" },
  { test: (s) => s.includes("/lib/yahoo") || s === "yahoo-finance2", reason: "imports Yahoo integration" },
  { test: (s) => s.includes("/lib/watchlist"), reason: "imports app watchlist layer" },
  { test: (s) => s.includes("/lib/persistence"), reason: "imports persistence layer" },
  { test: (s) => s.includes("/lib/auth"), reason: "imports auth layer" },
  { test: (s) => s.includes("/lib/billing"), reason: "imports billing layer" },
  {
    test: (s) =>
      (s.startsWith("../") || s.startsWith("../../")) &&
      (s.includes("/src/") || s.includes("/apps/")),
    reason: "imports closed app source via relative path",
  },
];

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

export function extractImportSpecifiers(content: string): Array<{ specifier: string; line: number }> {
  const results: Array<{ specifier: string; line: number }> = [];
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    let match: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((match = IMPORT_RE.exec(line)) !== null) {
      const specifier = match[1] ?? match[2];
      if (specifier) {
        results.push({ specifier, line: index + 1 });
      }
    }
  });
  return results;
}

export function closedAppImportIssues(
  file: string,
  content: string
): BoundaryIssue[] {
  const issues: BoundaryIssue[] = [];
  for (const { specifier, line } of extractImportSpecifiers(content)) {
    for (const { test, reason } of CLOSED_APP_CHECKS) {
      if (test(specifier)) {
        issues.push({ file, reason, line });
      }
    }
  }
  return issues;
}

/** Phase 1: fail-closed — no allowlisted lib→app imports. */
export const PHASE0_LIB_TO_APP_ALLOWLIST = new Set<string>();

const LIB_TO_APP_CHECKS: Array<{ test: (specifier: string) => boolean; reason: string }> = [
  { test: (s) => s.startsWith("@/app/"), reason: "imports app layer via @/app alias" },
  { test: (s) => /\/src\/app\//.test(s), reason: "imports app layer via absolute path" },
];

export function libToAppImportIssues(file: string, content: string): BoundaryIssue[] {
  const issues: BoundaryIssue[] = [];
  for (const { specifier, line } of extractImportSpecifiers(content)) {
    for (const { test, reason } of LIB_TO_APP_CHECKS) {
      if (test(specifier)) {
        issues.push({ file, reason, line });
      }
    }
  }
  return issues;
}

export function libToAppBoundaryViolations(
  files: Array<{ relPath: string; content: string }>,
  allowlist: Set<string> = PHASE0_LIB_TO_APP_ALLOWLIST
): BoundaryIssue[] {
  const violations: BoundaryIssue[] = [];
  for (const { relPath, content } of files) {
    const issues = libToAppImportIssues(relPath, content);
    if (issues.length === 0) continue;
    if (allowlist.has(relPath)) continue;
    violations.push(...issues);
  }
  return violations;
}

/** Phase 5: only app adapters may live under src/lib/chart — no pure @edge re-exports. */
export const CHART_ADAPTER_ALLOWLIST = new Set([
  "src/lib/chart/series.ts",
  "src/lib/chart/intervalAdapter.ts",
  "src/lib/chart/scriptSeriesResolver.ts",
  "src/lib/chart/resolveChartLiveQuotePrice.ts",
  "src/lib/chart/chartSnapshot.ts",
  "src/lib/chart/viewportPersistSketch.ts",
  "src/lib/chart/stateMapping.ts",
  "src/lib/chart/chartClipboard.ts",
  "src/lib/chart/layoutTemplates.ts",
  "src/lib/chart/layoutTemplateGrid.ts",
  "src/lib/chart/presets/apply.ts",
  "src/lib/chart/presets/types.ts",
  "src/lib/chart/presets/validate.ts",
  "src/lib/chart/activeChartTypes.ts",
  "src/lib/chart/objectTreeModel.ts",
  "src/lib/chart/chartHeaderMetadata.ts",
  "src/lib/chart/dataWindow.ts",
  "src/lib/chart/indicatorFavorites.ts",
  "src/lib/chart/chartTheme.ts",
  "src/lib/chart/scriptFixtureDev.ts",
]);

const PURE_SHIM_RE =
  /^\s*\/\*\*[\s\S]*?\*\/\s*\nexport (?:\*|\{ default \}) from ['"]@edge\/chart-(?:core|react)/m;

export function chartShimIssues(file: string, content: string): BoundaryIssue[] {
  if (!file.startsWith("src/lib/chart/")) return [];
  if (!/\.(ts|tsx)$/.test(file)) return [];
  if (/\.(test|spec)\.(ts|tsx)$/.test(file)) return [];
  if (CHART_ADAPTER_ALLOWLIST.has(file)) return [];
  if (PURE_SHIM_RE.test(content)) {
    return [
      {
        file,
        reason: "pure @edge chart re-export shim — import @edge/chart-core or @edge/chart-react directly",
      },
    ];
  }
  return [
    {
      file,
      reason: "unexpected src/lib/chart module — add to CHART_ADAPTER_ALLOWLIST or move to packages",
    },
  ];
}

export function chartShimBoundaryViolations(
  files: Array<{ relPath: string; content: string }>
): BoundaryIssue[] {
  const violations: BoundaryIssue[] = [];
  for (const { relPath, content } of files) {
    violations.push(...chartShimIssues(relPath, content));
  }
  return violations;
}
