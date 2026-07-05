import { describe, it, expect } from "vitest";
import type { MarketContext } from "@/lib/marketData/contracts/marketContext";
import { buildContextDisplayModel, buildCrumbItems } from "./marketContextDisplay";

const baseContext: MarketContext = {
  symbol: "AAPL",
  name: "Apple Inc.",
  assetClass: "equity",
  exchange: "NASDAQ",
  sector: { label: "Technology", source: "tws", confidence: "provider" },
  industry: {
    label: "Consumer Electronics",
    source: "tws",
    confidence: "provider",
  },
  relationships: [
    {
      kind: "sector",
      label: "Technology",
      source: "tws",
      confidence: "provider",
    },
    {
      kind: "industry",
      label: "Consumer Electronics",
      source: "tws",
      confidence: "provider",
    },
  ],
  tradableGroups: [
    {
      flavor: "sector_etf",
      label: "Sector ETF",
      members: [
        {
          flavor: "sector_etf",
          label: "Technology sector",
          symbol: "XLK",
          source: "curated",
          confidence: "curated",
        },
      ],
    },
    {
      flavor: "broad_market",
      label: "Broad market",
      members: [
        {
          flavor: "broad_market",
          label: "S&P 500",
          symbol: "SPY",
          indexLabel: "S&P 500",
          source: "curated",
          confidence: "curated",
        },
      ],
    },
    {
      flavor: "benchmark",
      label: "Benchmark",
      members: [
        {
          flavor: "benchmark",
          label: "Nasdaq-100",
          symbol: "QQQ",
          indexLabel: "Nasdaq-100",
          source: "curated",
          confidence: "curated",
        },
      ],
    },
  ],
  updatedAt: Date.now(),
};

describe("buildCrumbItems", () => {
  it("dedupes industry navigable chip when it maps to the same ETF symbol as sector", () => {
    const items = buildCrumbItems(baseContext);
    const navigable = items.filter((item) => item.kind === "navigable");
    const xlkItems = navigable.filter(
      (item) => item.kind === "navigable" && item.symbol.toUpperCase() === "XLK",
    );
    expect(xlkItems).toHaveLength(1);
  });
});

describe("buildContextDisplayModel", () => {
  it("builds classification and ticker chips for full density", () => {
    const model = buildContextDisplayModel(baseContext, "full");

    expect(model.classification).toBe("Technology · Consumer Electronics");
    expect(model.chips.map((chip) => chip.symbol)).toEqual(["XLK", "SPY", "QQQ"]);
    expect(model.overflow).toHaveLength(0);
  });

  it("puts extra chips in overflow when more than three navigable symbols exist", () => {
    const context: MarketContext = {
      ...baseContext,
      tradableGroups: [
        ...(baseContext.tradableGroups ?? []),
        {
          flavor: "style",
          label: "Style",
          members: [
            {
              flavor: "style",
              label: "Growth",
              symbol: "VUG",
              source: "curated",
              confidence: "curated",
            },
          ],
        },
      ],
    };

    const model = buildContextDisplayModel(context, "full");
    expect(model.chips).toHaveLength(3);
    expect(model.overflow).toHaveLength(1);
    expect(model.overflow[0]?.symbol).toBe("VUG");
  });

  it("returns sector-only classification and one chip on compact density", () => {
    const model = buildContextDisplayModel(baseContext, "compact");

    expect(model.classification).toBe("Technology");
    expect(model.chips).toHaveLength(1);
    expect(model.chips[0]?.symbol).toBe("XLK");
    expect(model.overflow.length).toBeGreaterThan(0);
  });

  it("returns empty model on minimal density", () => {
    const model = buildContextDisplayModel(baseContext, "minimal");
    expect(model.classification).toBeNull();
    expect(model.chips).toHaveLength(0);
    expect(model.overflow).toHaveLength(0);
  });

  it("dedupes consecutive identical classification labels", () => {
    const context: MarketContext = {
      ...baseContext,
      relationships: [
        { kind: "sector", label: "Computers", source: "tws", confidence: "provider" },
        { kind: "industry", label: "Computers", source: "tws", confidence: "provider" },
      ],
      sector: { label: "Computers", source: "tws", confidence: "provider" },
      industry: { label: "Computers", source: "tws", confidence: "provider" },
      tradableGroups: [],
    };

    const model = buildContextDisplayModel(context, "full");
    expect(model.classification).toBe("Computers");
  });
});
