import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { closedAppImportIssues } from "../../scripts/package-boundary-policy.mts";

describe("package boundary validator", () => {
  it("passes on current package sources", () => {
    expect(() => {
      execSync("npx tsx scripts/validate-package-boundaries.mts", {
        cwd: join(import.meta.dirname, "../.."),
        stdio: "pipe",
      });
    }).not.toThrow();
  });

  it("flags closed app alias imports", () => {
    const issues = closedAppImportIssues(
      "packages/chart-core/src/bad.ts",
      `import { foo } from '@/lib/yahoo';\n`
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.reason.includes("Yahoo"))).toBe(true);
  });

  it("flags Next.js runtime imports", () => {
    const issues = closedAppImportIssues(
      "packages/ai-tools-core/src/bad.ts",
      `import { headers } from 'next/headers';\n`
    );
    expect(issues.some((i) => i.reason.includes("Next.js"))).toBe(true);
  });
});
