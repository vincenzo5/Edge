import { describe, expect, it } from "vitest";
import {
  CATALOG_DATASET_COUNT,
  DATASET_CATALOG,
  getDatasetDefinition,
  listActiveDatasets,
  listPolicyRegisteredDatasetIds,
  lookupDataset,
} from "./catalog";

describe("dataset catalog", () => {
  it("registers every Phase 1 datasetId", () => {
    expect(CATALOG_DATASET_COUNT).toBe(44);
    expect(DATASET_CATALOG.length).toBe(CATALOG_DATASET_COUNT);
  });

  it("includes all nine policy-bearing dataset kinds", () => {
    const policyIds = listPolicyRegisteredDatasetIds();
    expect(policyIds).toContain("chart_candles");
    expect(policyIds).toContain("watchlist_quotes");
    expect(policyIds).toContain("pre_trade_quote");
    expect(policyIds.length).toBe(9);
  });

  it("marks legacy and deferred providers explicitly", () => {
    expect(getDatasetDefinition("risk_settings").lifecycle).toBe("deferred");
    expect(getDatasetDefinition("tws_ibkr_probes").lifecycle).toBe("excluded");
  });

  it("lists active datasets with owners and route order", () => {
    const active = listActiveDatasets();
    expect(active.length).toBeGreaterThan(30);
    for (const row of active) {
      expect(row.owner.length).toBeGreaterThan(0);
      expect(row.routeOrder.length).toBeGreaterThan(0);
    }
  });

  it("lookup returns undefined for unknown ids", () => {
    expect(lookupDataset("not_a_dataset")).toBeUndefined();
  });
});
