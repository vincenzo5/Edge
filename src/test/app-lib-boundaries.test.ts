import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { join } from "node:path";
import {
  libToAppBoundaryViolations,
  libToAppImportIssues,
  PHASE0_LIB_TO_APP_ALLOWLIST,
} from "../../scripts/package-boundary-policy.mts";

describe("app-lib boundary validator", () => {
  it("passes on current src/lib sources (fail-closed)", () => {
    expect(() => {
      execSync("npx tsx scripts/validate-app-lib-boundaries.mts", {
        cwd: join(import.meta.dirname, "../.."),
        stdio: "pipe",
      });
    }).not.toThrow();
  });

  it("flags @/app alias imports", () => {
    const issues = libToAppImportIssues(
      "src/lib/example/bad.ts",
      `import { foo } from '@/app/components/Foo';\n`
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.reason.includes("@/app"))).toBe(true);
  });

  it("fail-closed on any lib→app import", () => {
    expect(PHASE0_LIB_TO_APP_ALLOWLIST.size).toBe(0);
    const violations = libToAppBoundaryViolations([
      {
        relPath: "src/lib/ai/context.ts",
        content: `import type { ActiveChartSnapshot } from "@/app/components/ActiveChartContext";\n`,
      },
      {
        relPath: "src/lib/example/newLeak.ts",
        content: `import { foo } from "@/app/components/Foo";\n`,
      },
    ]);
    expect(violations.some((v) => v.file === "src/lib/example/newLeak.ts")).toBe(true);
    expect(violations.some((v) => v.file === "src/lib/ai/context.ts")).toBe(true);
  });
});
