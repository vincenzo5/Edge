import { describe, expect, it } from "vitest";
import {
  areDemandDatasetInputsEqual,
  buildDemandDatasetRow,
  buildPreTradeDatasetRow,
  filterVisibleCurrentDataRows,
} from "./healthDatasets";

describe("healthDatasets", () => {
  it("hides idle demand-gated rows from current data", () => {
    const rows = filterVisibleCurrentDataRows([
      {
        kind: "screener",
        datasetId: "screener_descriptive",
        label: "Screener",
        status: "not_loaded",
        warnings: [],
      },
      {
        kind: "watchlist",
        label: "Watchlist",
        status: "loaded",
        warnings: [],
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("watchlist");
  });

  it("builds active screener demand row from meta", () => {
    const row = buildDemandDatasetRow({
      datasetId: "screener_descriptive",
      active: true,
      meta: { source: "fmp", warnings: [] },
      detail: "12 results",
      status: "loaded",
    });
    expect(row?.label).toBe("Screener");
    expect(row?.source).toBe("fmp");
  });

  it("builds pre-trade row without sensitive payloads", () => {
    const row = buildPreTradeDatasetRow({
      active: true,
      blocked: true,
      reasons: ["Quote too old"],
      connectionLabel: "paper",
    });
    expect(row?.readinessLabel).toBe("blocked");
    expect(row?.warnings).toEqual(["Quote too old"]);
  });

  it("does not claim pre-trade readiness from connection evidence alone", () => {
    const row = buildPreTradeDatasetRow({
      active: true,
      blocked: false,
      connectionLabel: "paper",
    });

    expect(row?.allowedForTradingDecision).toBe(false);
    expect(row?.readinessLabel).toBe("blocked");
    expect(row?.readinessReasons).toEqual([
      "Connection only — quote readiness not verified",
    ]);
  });
});

describe("areDemandDatasetInputsEqual", () => {
  it("treats identical demand inputs as equal", () => {
    const input = {
      datasetId: "screener_descriptive" as const,
      active: true,
      detail: "0 results",
      status: "loaded" as const,
      meta: {
        source: "fmp",
        stale: false,
        asOf: 1_700_000_000_000,
        lastUpdateAt: 1_700_000_000_000,
      },
      warnings: ["FMP endpoint restricted (403)"],
    };
    expect(areDemandDatasetInputsEqual(input, { ...input })).toBe(true);
  });

  it("detects meta lastUpdateAt churn", () => {
    const base = {
      datasetId: "screener_descriptive" as const,
      active: true,
      meta: { source: "fmp", lastUpdateAt: 1 },
    };
    expect(
      areDemandDatasetInputsEqual(base, {
        ...base,
        meta: { source: "fmp", lastUpdateAt: 2 },
      }),
    ).toBe(false);
  });
});
