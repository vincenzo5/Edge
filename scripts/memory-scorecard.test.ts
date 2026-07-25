import { describe, expect, it } from "vitest";
import {
  buildMemoryScorecardRow,
  computeCapsOk,
  DEFAULT_SOFT_BUDGETS,
  evaluateSoakBudgets,
  evaluateSoakPass,
  evaluateSoftBudgets,
  formatMemoryScorecard,
  formatSoakScorecardLine,
  readSoftBudgetConfig,
  resolveSoakSec,
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

const soakFixture = {
  soakDurationSec: 60,
  soakHeapDeltaMb: 12,
  soakProcessRssDeltaMb: 25,
  eventSourceCountBefore: 2,
  eventSourceCountAfter: 2,
  eventSourceCountStable: true,
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

  it("warns when soak heap delta exceeds budget", () => {
    const warnings = evaluateSoftBudgets(
      {
        scenarios: {
          "browser-b3-live-tip": {
            soakHeapDeltaMb: 75,
            soakProcessRssDeltaMb: 10,
          },
        },
      },
      { ...DEFAULT_SOFT_BUDGETS, soakHeapDeltaMb: 50 },
    );
    expect(warnings).toEqual([
      {
        id: "soak-heap-delta",
        message: "soft-budget: soakHeapDeltaMb=75 exceeds 50",
      },
    ]);
  });

  it("warns when soak process RSS delta exceeds budget", () => {
    const warnings = evaluateSoftBudgets(
      {
        scenarios: {
          "browser-b3-live-tip": {
            soakHeapDeltaMb: 10,
            soakProcessRssDeltaMb: 150,
          },
        },
      },
      { ...DEFAULT_SOFT_BUDGETS, soakProcessRssDeltaMb: 100 },
    );
    expect(warnings).toEqual([
      {
        id: "soak-process-rss-delta",
        message: "soft-budget: soakProcessRssDeltaMb=150 exceeds 100",
      },
    ]);
  });

  it("skips soak budgets when B3 is skipped", () => {
    expect(
      evaluateSoftBudgets({
        scenarios: {
          "browser-b3-live-tip": { skipped: true, reason: "dev server not reachable" },
        },
      }),
    ).toEqual([]);
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

  it("includes soak line when B3 data is present", () => {
    const output = formatMemoryScorecard({
      ...fixtureBaseline,
      scenarios: {
        ...fixtureBaseline.scenarios,
        "browser-b3-live-tip": soakFixture,
      },
    });

    expect(output).toContain(
      "Soak (L9): duration=60s Δheap=12 Δprocess=25 EventSource stable=yes",
    );
  });
});

describe("readSoftBudgetConfig", () => {
  it("reads env overrides when valid", () => {
    expect(
      readSoftBudgetConfig({
        MEMORY_BUDGET_HEAP_DELTA_MB: "25",
        MEMORY_BUDGET_PROCESS_RSS_MB: "900",
        MEMORY_BUDGET_DESK_TOTAL_MB: "1800",
        MEMORY_BUDGET_SOAK_HEAP_DELTA_MB: "30",
        MEMORY_BUDGET_SOAK_PROCESS_RSS_DELTA_MB: "80",
      }),
    ).toEqual({
      heapDeltaMb: 25,
      processRssMb: 900,
      deskTotalMb: 1800,
      soakHeapDeltaMb: 30,
      soakProcessRssDeltaMb: 80,
    });
  });

  it("falls back to defaults for invalid env values", () => {
    expect(
      readSoftBudgetConfig({
        MEMORY_BUDGET_HEAP_DELTA_MB: "not-a-number",
        MEMORY_BUDGET_PROCESS_RSS_MB: "-1",
        MEMORY_BUDGET_SOAK_HEAP_DELTA_MB: "0",
      }),
    ).toEqual(DEFAULT_SOFT_BUDGETS);
  });
});

describe("resolveSoakSec", () => {
  it("prefers MEMORY_SOAK_SEC over MEMORY_LIVE_TIP_SEC", () => {
    expect(
      resolveSoakSec({
        MEMORY_SOAK_SEC: "45",
        MEMORY_LIVE_TIP_SEC: "120",
      }),
    ).toBe(45);
  });

  it("falls back to MEMORY_LIVE_TIP_SEC then default", () => {
    expect(resolveSoakSec({ MEMORY_LIVE_TIP_SEC: "90" })).toBe(90);
    expect(resolveSoakSec({})).toBe(60);
  });

  it("enforces minimum soak duration", () => {
    expect(resolveSoakSec({ MEMORY_SOAK_SEC: "3" })).toBe(10);
  });
});

describe("evaluateSoakPass", () => {
  it("passes when both deltas are within budget", () => {
    expect(
      evaluateSoakPass(
        { soakHeapDeltaMb: 12, soakProcessRssDeltaMb: 25 },
        DEFAULT_SOFT_BUDGETS,
      ),
    ).toBe(true);
  });

  it("fails when either delta exceeds budget", () => {
    expect(
      evaluateSoakPass(
        { soakHeapDeltaMb: 75, soakProcessRssDeltaMb: 25 },
        DEFAULT_SOFT_BUDGETS,
      ),
    ).toBe(false);
    expect(
      evaluateSoakPass(
        { soakHeapDeltaMb: 12, soakProcessRssDeltaMb: 150 },
        DEFAULT_SOFT_BUDGETS,
      ),
    ).toBe(false);
  });

  it("returns null when either delta is missing", () => {
    expect(evaluateSoakPass({ soakHeapDeltaMb: 12, soakProcessRssDeltaMb: null })).toBeNull();
  });
});

describe("evaluateSoakBudgets", () => {
  it("returns empty warnings when soak is null", () => {
    expect(evaluateSoakBudgets(null)).toEqual([]);
  });

  it("warns on both soak deltas when over budget", () => {
    expect(
      evaluateSoakBudgets(
        { soakHeapDeltaMb: 75, soakProcessRssDeltaMb: 150 },
        DEFAULT_SOFT_BUDGETS,
      ),
    ).toEqual([
      {
        id: "soak-heap-delta",
        message: "soft-budget: soakHeapDeltaMb=75 exceeds 50",
      },
      {
        id: "soak-process-rss-delta",
        message: "soft-budget: soakProcessRssDeltaMb=150 exceeds 100",
      },
    ]);
  });
});

describe("formatSoakScorecardLine", () => {
  it("formats soak metrics for the scorecard", () => {
    expect(formatSoakScorecardLine(soakFixture)).toBe(
      "Soak (L9): duration=60s Δheap=12 Δprocess=25 EventSource stable=yes",
    );
  });
});
