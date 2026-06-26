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
