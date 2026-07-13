import { describe, expect, it } from "vitest";
import { DEFAULT_HEAT_MAP_CONFIG } from "@/lib/heatmap/defaults";
import {
  heatMapSizeMetricCoverageWarning,
  screenerRowsToHeatMapItems,
  topHeatMapQuoteSymbols,
} from "./screenerHeatMapAdapter";
import type { ScreenerResultRow } from "./types";

const row: ScreenerResultRow = {
  symbol: "aapl",
  name: "Apple Inc.",
  price: 200,
  change: 1,
  changePercent: 1.2,
  exchange: "NASDAQ",
  volume: 50_000_000,
  sector: "Technology",
  industry: "Consumer Electronics",
  country: "US",
  beta: 1.1,
  marketCap: 3_000_000_000_000,
  dividendYield: 0.005,
};

describe("screenerHeatMapAdapter", () => {
  it("maps screener rows to heat map items", () => {
    const items = screenerRowsToHeatMapItems([row], DEFAULT_HEAT_MAP_CONFIG);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(
      expect.objectContaining({
        id: "AAPL",
        label: "AAPL",
        sizeValue: 3_000_000_000_000,
        colorValue: 1.2,
        groupPath: ["Technology", "Consumer Electronics"],
      }),
    );
  });

  it("uses Other for missing sector and industry", () => {
    const items = screenerRowsToHeatMapItems(
      [{ ...row, sector: null, industry: null }],
      DEFAULT_HEAT_MAP_CONFIG,
    );
    expect(items[0]?.groupPath).toEqual(["Other", "Other"]);
  });

  it("returns top symbols by configured size metric", () => {
    const symbols = topHeatMapQuoteSymbols(
      [
        row,
        { ...row, symbol: "MSFT", marketCap: 2_000_000_000_000 },
        { ...row, symbol: "XOM", marketCap: 400_000_000_000 },
      ],
      DEFAULT_HEAT_MAP_CONFIG,
      2,
    );
    expect(symbols).toEqual(["AAPL", "MSFT"]);
  });

  it("remaps size and color values when config metrics change", () => {
    const byVolume = screenerRowsToHeatMapItems([row], {
      ...DEFAULT_HEAT_MAP_CONFIG,
      sizeBy: { ...DEFAULT_HEAT_MAP_CONFIG.sizeBy, metric: "volume" },
      colorBy: {
        ...DEFAULT_HEAT_MAP_CONFIG.colorBy,
        metric: "beta",
        scale: { kind: "sequential", domain: "data" },
      },
    });
    expect(byVolume[0]).toEqual(
      expect.objectContaining({
        sizeValue: 50_000_000,
        colorValue: 1.1,
      }),
    );
  });

  it("warns when most items lack the active size metric", () => {
    const items = screenerRowsToHeatMapItems(
      [
        row,
        { ...row, symbol: "MSFT", marketCap: null },
        { ...row, symbol: "XOM", marketCap: null },
      ],
      DEFAULT_HEAT_MAP_CONFIG,
    );
    expect(heatMapSizeMetricCoverageWarning(items, DEFAULT_HEAT_MAP_CONFIG)).toMatch(
      /Market cap unavailable/,
    );
    expect(
      heatMapSizeMetricCoverageWarning(items, {
        ...DEFAULT_HEAT_MAP_CONFIG,
        sizeBy: { ...DEFAULT_HEAT_MAP_CONFIG.sizeBy, metric: "equal" },
      }),
    ).toBeNull();
  });
});
