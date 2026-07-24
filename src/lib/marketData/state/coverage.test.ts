import { describe, expect, it } from "vitest";
import {
  assertActiveCatalogCoverageComplete,
  buildCatalogCoverageReport,
  listDemandGatedDatasetIds,
  resolveCoverageDisposition,
} from "./coverage";
import { DATASET_CATALOG, getDatasetDefinition } from "./catalog";

describe("catalog coverage dispositions", () => {
  it("classifies every active catalog row without unclassified gaps", () => {
    const report = buildCatalogCoverageReport();
    expect(report.active).toBeGreaterThan(30);
    expect(report.unclassified).toBe(0);
    expect(() => assertActiveCatalogCoverageComplete()).not.toThrow();
  });

  it("marks core feeds as observed and options as demand-gated", () => {
    expect(resolveCoverageDisposition(getDatasetDefinition("chart_candles")).mode).toBe(
      "observed",
    );
    expect(resolveCoverageDisposition(getDatasetDefinition("options_chain")).mode).toBe(
      "demand_gated",
    );
  });

  it("marks derived datasets as inherited", () => {
    const derived = resolveCoverageDisposition(getDatasetDefinition("chart_indicators"));
    expect(derived.mode).toBe("inherited");
    expect(derived.inheritsFrom).toBe("chart_candles");
  });

  it("lists demand-gated dataset ids for registration surfaces", () => {
    const ids = listDemandGatedDatasetIds();
    expect(ids).toContain("screener_descriptive");
    expect(ids).toContain("fundamentals_display");
    expect(ids).not.toContain("chart_candles");
  });

  it("covers every catalog datasetId", () => {
    expect(buildCatalogCoverageReport().rows.length).toBe(DATASET_CATALOG.length);
  });
});
