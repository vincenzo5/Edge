import { describe, expect, it } from "vitest";
import {
  buildMemoryScorecardRow,
  computeCapsOk,
  DEFAULT_SOFT_BUDGETS,
  evaluateSoftBudgets,
  formatMemoryScorecard,
  readSoftBudgetConfig,
  selectBrowserScenario,
  type MemoryBaselineSnapshot,
} from "./memory-scorecard.ts";

const fixtureBaseline: MemoryBaselineSnapshot = {
  generatedAt: "2026-07-25T17:27:05.488Z",
  scenarios: {
    "browser-b1-1cell-10x-loadMore": {
      jsHeapUsedMb: 98.23,
      heapDeltaMb: 0,
      processRssAfterMb: 480.63,
      maxCandlesLength: 3860,
      mountedEngines: 1,
      withinSoftMax: true,
    },
    "browser-b2-8cell-10x-loadMore": {
      jsHeapUsedMb: 82.4,
      heapDeltaMb: 0,
      processRssAfterMb: 451.38,
      maxCandlesLength: 3860,
      mountedEngines: 0,
      withinSoftMax: true,
    },
    "node-server-cache-warm": {
      rssAfterMb: 358.95,
      withinDataCacheCap: true,
      withinHotStoreCap: true,
    },
  },
  desk: {
    browserProcessRssMb: 480.63,
    nodeRssMb: 358.95,
    sidecarRssMb: 62.97,
    redisUsedMb: null,
    totalKnownMb: 902.55,
    skippedNoSidecar: false,
    skippedNoRedis: true,
  },
};

describe("selectBrowserScenario", () => {
  it("prefers B1 over B2", () => {
    expect(selectBrowserScenario(fixtureBaseline.scenarios)?.key).toBe(
      "browser-b1-1cell-10x-loadMore",
    );
  });

  it("falls back to B2 when B1 is skipped", () => {
    expect(
      selectBrowserScenario({
        "browser-b1-1cell-10x-loadMore": { skipped: true, reason: "unreachable" },
        "browser-b2-8cell-10x-loadMore": {
          jsHeapUsedMb: 82.4,
          processRssAfterMb: 451.38,
        },
      })?.key,
    ).toBe("browser-b2-8cell-10x-loadMore");
  });
});

describe("computeCapsOk", () => {
  it("requires browser soft max and node cache caps", () => {
    expect(
      computeCapsOk(
        { withinSoftMax: true },
        { withinDataCacheCap: true, withinHotStoreCap: true },
      ),
    ).toBe(true);
    expect(
      computeCapsOk(
        { withinSoftMax: false },
        { withinDataCacheCap: true, withinHotStoreCap: true },
      ),
    ).toBe(false);
    expect(
      computeCapsOk(
        { withinSoftMax: true },
        { withinDataCacheCap: false, withinHotStoreCap: true },
      ),
    ).toBe(false);
  });

  it("returns null when no cap fields are present", () => {
    expect(computeCapsOk(null, null)).toBeNull();
  });
});

describe("buildMemoryScorecardRow", () => {
  it("maps B1 and desk fields into the scorecard row", () => {
    expect(buildMemoryScorecardRow(fixtureBaseline)).toEqual({
      tabMb: 480.63,
      heapMb: 98.23,
      heapDeltaMb: 0,
      candles: 3860,
      engines: 1,
      nodeRssMb: 358.95,
      sidecarRssMb: 62.97,
      capsOk: true,
      browserScenario: "browser-b1-1cell-10x-loadMore",
    });
  });
});

describe("evaluateSoftBudgets", () => {
  it("does not warn when values are under default budgets", () => {
    expect(evaluateSoftBudgets(fixtureBaseline, DEFAULT_SOFT_BUDGETS)).toEqual([]);
  });

  it("warns when process RSS exceeds budget", () => {
    const warnings = evaluateSoftBudgets(fixtureBaseline, {
      ...DEFAULT_SOFT_BUDGETS,
      processRssMb: 1,
    });
    expect(warnings).toEqual([
      {
        id: "process-rss",
        message: "soft-budget: processRssAfterMb=480.63 exceeds 1",
      },
    ]);
  });

  it("warns when heap delta exceeds budget", () => {
    const warnings = evaluateSoftBudgets(
      {
        ...fixtureBaseline,
        scenarios: {
          ...fixtureBaseline.scenarios,
          "browser-b1-1cell-10x-loadMore": {
            ...(fixtureBaseline.scenarios?.["browser-b1-1cell-10x-loadMore"] as object),
            heapDeltaMb: 75,
          },
        },
      },
      { ...DEFAULT_SOFT_BUDGETS, heapDeltaMb: 50 },
    );
    expect(warnings).toEqual([
      {
        id: "heap-delta",
        message: "soft-budget: heapDeltaMb=75 exceeds 50",
      },
    ]);
  });

  it("warns when desk total exceeds budget", () => {
    const warnings = evaluateSoftBudgets(fixtureBaseline, {
      ...DEFAULT_SOFT_BUDGETS,
      deskTotalMb: 500,
    });
    expect(warnings).toEqual([
      {
        id: "desk-total",
        message: "soft-budget: desk.totalKnownMb=902.55 exceeds 500",
      },
    ]);
  });

  it("warns when caps fail", () => {
    const warnings = evaluateSoftBudgets({
      ...fixtureBaseline,
      scenarios: {
        ...fixtureBaseline.scenarios,
        "node-server-cache-warm": {
          rssAfterMb: 358.95,
          withinDataCacheCap: false,
          withinHotStoreCap: true,
        },
      },
    });
    expect(warnings).toEqual([
      {
        id: "caps",
        message: "soft-budget: caps (withinSoftMax / withinDataCacheCap / withinHotStoreCap) failed",
      },
    ]);
  });

  it("skips missing layers without fake warnings", () => {
    const warnings = evaluateSoftBudgets({
      scenarios: {
        "browser-b1-1cell-10x-loadMore": {
          jsHeapUsedMb: 98.23,
        },
      },
    });
    expect(warnings).toEqual([]);
  });
});

describe("formatMemoryScorecard", () => {
  it("renders the cheat-sheet table and desk line", () => {
    const output = formatMemoryScorecard(fixtureBaseline, {
      sourcePath: "docs/perf/memory-baseline-latest.json",
    });

    expect(output).toContain("Memory scorecard (L1–L8)");
    expect(output).toContain("Source: docs/perf/memory-baseline-latest.json");
    expect(output).toContain("| 480.63 | 98.23 | 0 | 3860 | 1 | 358.95 | 62.97 | yes |");
    expect(output).toContain("Desk: totalKnownMb=902.55");
    expect(output).not.toContain("Soft budget warnings:");
  });

  it("includes soft budget warnings in formatted output", () => {
    const highRssBaseline: MemoryBaselineSnapshot = {
      ...fixtureBaseline,
      scenarios: {
        ...fixtureBaseline.scenarios,
        "browser-b1-1cell-10x-loadMore": {
          ...(fixtureBaseline.scenarios?.["browser-b1-1cell-10x-loadMore"] as object),
          processRssAfterMb: 1500,
        },
      },
    };

    const output = formatMemoryScorecard(highRssBaseline);
    expect(output).toContain("Soft budget warnings:");
    expect(output).toContain("soft-budget: processRssAfterMb=1500 exceeds 1200");
  });
});

describe("readSoftBudgetConfig", () => {
  it("reads env overrides when valid", () => {
    expect(
      readSoftBudgetConfig({
        MEMORY_BUDGET_HEAP_DELTA_MB: "25",
        MEMORY_BUDGET_PROCESS_RSS_MB: "900",
        MEMORY_BUDGET_DESK_TOTAL_MB: "1800",
      }),
    ).toEqual({
      heapDeltaMb: 25,
      processRssMb: 900,
      deskTotalMb: 1800,
    });
  });

  it("falls back to defaults for invalid env values", () => {
    expect(
      readSoftBudgetConfig({
        MEMORY_BUDGET_HEAP_DELTA_MB: "not-a-number",
        MEMORY_BUDGET_PROCESS_RSS_MB: "-1",
      }),
    ).toEqual(DEFAULT_SOFT_BUDGETS);
  });
});
