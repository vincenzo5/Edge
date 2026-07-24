import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { join } from "node:path";
import {
  CHART_ADAPTER_ALLOWLIST,
  chartShimIssues,
} from "../../scripts/package-boundary-policy.mts";

describe("chart shim validator", () => {
  it("passes on current src/lib/chart adapters (fail-closed)", () => {
    expect(() => {
      execSync("npx tsx scripts/validate-chart-shims.mts", {
        cwd: join(import.meta.dirname, "../.."),
        stdio: "pipe",
      });
    }).not.toThrow();
  });

  it("flags pure re-export shims", () => {
    const issues = chartShimIssues(
      "src/lib/chart/contracts.ts",
      `/** @deprecated */\nexport * from '@edge/chart-core/contracts';\n`
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.reason).toContain("re-export shim");
  });

  it("allows adapter allowlist entries", () => {
    expect(CHART_ADAPTER_ALLOWLIST.has("src/lib/chart/series.ts")).toBe(true);
    const issues = chartShimIssues(
      "src/lib/chart/series.ts",
      `export async function fetchCandles() {}\n`
    );
    expect(issues).toHaveLength(0);
  });
});
