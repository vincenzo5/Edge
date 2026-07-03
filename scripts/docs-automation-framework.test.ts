import { describe, expect, it } from "vitest";
import {
  buildDocImpactMap,
  classifyOwnerAreas,
  parseAgentSummary,
  requiresInstructionValidation,
  resolveDocTargets,
  resolveDriftClusters,
  validateAllowlist,
  validateSummaryAgainstChanges,
} from "./docs-automation-framework.mts";

describe("classifyOwnerAreas", () => {
  it("maps chart paths to chart area", () => {
    expect(classifyOwnerAreas(["packages/chart-core/src/indicators/registry.ts"])).toContain(
      "chart",
    );
  });

  it("maps market data and sidecar paths", () => {
    const areas = classifyOwnerAreas([
      "src/lib/marketData/health.ts",
      "services/tws-sidecar/main.py",
    ]);
    expect(areas).toContain("marketData");
  });

  it("maps AI tool paths", () => {
    expect(classifyOwnerAreas(["src/lib/ai/tools/marketData.ts"])).toContain("ai");
  });
});

describe("resolveDocTargets", () => {
  it("returns architecture and inventory docs for chart changes", () => {
    const targets = resolveDocTargets(["chart"]);
    const paths = targets.map((target) => target.path);
    expect(paths).toContain("src/lib/chart/ARCHITECTURE.md");
    expect(paths).toContain("docs/chart/features.md");
  });

  it("returns harness doc only when owner area matches", () => {
    const targets = resolveDocTargets(["ai"]);
    expect(targets.some((target) => target.path === "docs/ai-tools-architecture.md")).toBe(true);
  });
});

describe("buildDocImpactMap", () => {
  it("defaults to architecture lane for code diffs", () => {
    const impact = buildDocImpactMap({
      changedFiles: ["src/lib/marketData/health.ts"],
    });
    expect(impact.lanes).toEqual(["architecture"]);
    expect(impact.allowedDocPaths).toContain("src/lib/marketData/ARCHITECTURE.md");
    expect(impact.allowedDocPaths).not.toContain("docs/PROJECT-STATUS.md");
  });

  it("adds harness lane when evidence is provided", () => {
    const impact = buildDocImpactMap({
      changedFiles: ["src/lib/marketData/health.ts"],
      evidenceProvided: true,
    });
    expect(impact.lanes).toEqual(["architecture", "harness"]);
    expect(impact.allowedDocPaths).toContain("docs/PROJECT-STATUS.md");
  });

  it("supports explicit drift-audit lane", () => {
    const impact = buildDocImpactMap({
      changedFiles: ["src/lib/ai/registry.ts"],
      lane: "drift-audit",
    });
    expect(impact.lanes).toEqual(["drift-audit"]);
    expect(impact.allowedDocPaths).toEqual([]);
  });

  it("supports explicit harness lane with evidence", () => {
    const impact = buildDocImpactMap({
      changedFiles: ["src/lib/marketData/health.ts"],
      lane: "harness",
      evidenceProvided: true,
    });
    expect(impact.lanes).toEqual(["harness"]);
    expect(impact.allowedDocPaths).toEqual(["docs/PROJECT-STATUS.md"]);
  });
});

describe("parseAgentSummary", () => {
  it("parses no-update summary", () => {
    expect(parseAgentSummary("no docs update needed").kind).toBe("no_update");
  });

  it("parses updated paths", () => {
    const summary = parseAgentSummary(
      "updated: src/lib/marketData/ARCHITECTURE.md, docs/chart/features.md",
    );
    expect(summary.kind).toBe("updated");
    expect(summary.paths).toEqual([
      "src/lib/marketData/ARCHITECTURE.md",
      "docs/chart/features.md",
    ]);
  });

  it("parses drift report", () => {
    const summary = parseAgentSummary("drift report: docs/ai-tools-architecture.md");
    expect(summary.kind).toBe("drift_report");
    expect(summary.paths).toEqual(["docs/ai-tools-architecture.md"]);
  });
});

describe("validateAllowlist", () => {
  it("flags paths outside allowlist", () => {
    const issues = validateAllowlist(
      ["docs/ROADMAP.md"],
      ["src/lib/marketData/ARCHITECTURE.md"],
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("allowlist_violation");
  });
});

describe("validateSummaryAgainstChanges", () => {
  it("flags summary mismatch when files changed but summary says no update", () => {
    const issues = validateSummaryAgainstChanges(parseAgentSummary("no docs update needed"), [
      "docs/PROJECT-STATUS.md",
    ]);
    expect(issues[0]?.code).toBe("summary_mismatch");
  });

  it("accepts matching updated summary", () => {
    const issues = validateSummaryAgainstChanges(
      parseAgentSummary("updated: src/lib/marketData/ARCHITECTURE.md"),
      ["src/lib/marketData/ARCHITECTURE.md"],
    );
    expect(issues).toEqual([]);
  });
});

describe("requiresInstructionValidation", () => {
  it("requires validation for harness and instruction docs", () => {
    expect(requiresInstructionValidation(["docs/PROJECT-STATUS.md"])).toBe(true);
    expect(requiresInstructionValidation(["AGENTS.md"])).toBe(true);
    expect(requiresInstructionValidation(["src/lib/marketData/ARCHITECTURE.md"])).toBe(false);
  });
});

describe("resolveDriftClusters", () => {
  it("selects indicator cluster for chart-core indicator changes", () => {
    const clusters = resolveDriftClusters(["packages/chart-core/src/indicators/registry.ts"]);
    expect(clusters.some((cluster) => cluster.id === "indicators")).toBe(true);
  });
});
