import { describe, it, expect } from "vitest";
import {
  buildBreadcrumbChain,
  buildCuratedRelationships,
  buildTradableGroups,
  mapIndustryToEtf,
  mapSectorToEtf,
} from "./relationshipMaps";

describe("relationshipMaps", () => {
  it("maps sector labels to representative ETFs", () => {
    expect(mapSectorToEtf("Technology")).toBe("XLK");
    expect(mapSectorToEtf("Financial Services")).toBe("XLF");
  });

  it("maps industry labels to representative ETFs", () => {
    expect(mapIndustryToEtf("Semiconductors")?.symbol).toBe("SMH");
    expect(mapIndustryToEtf("Software")?.symbol).toBe("IGV");
  });

  it("builds curated relationships for AAPL with broad and benchmark memberships", () => {
    const relationships = buildCuratedRelationships({
      symbol: "AAPL",
      sector: { label: "Technology", source: "tws", confidence: "provider" },
      industry: {
        label: "Consumer Electronics",
        source: "tws",
        confidence: "provider",
      },
      exchange: "NASDAQ",
    });

    expect(relationships.some((r) => r.kind === "sector" && r.label === "Technology")).toBe(true);
    expect(relationships.some((r) => r.kind === "sector_etf" && r.symbol === "XLK")).toBe(true);
    expect(relationships.some((r) => r.kind === "index_member" && r.symbol === "QQQ")).toBe(true);
    expect(relationships.some((r) => r.kind === "index_member" && r.symbol === "SPY")).toBe(true);
    expect(relationships.some((r) => r.kind === "index_member" && r.symbol === "DIA")).toBe(true);
  });

  it("builds classification-only breadcrumb chain without ETF symbols or index grouping", () => {
    const chain = buildBreadcrumbChain(
      buildCuratedRelationships({
        symbol: "AAPL",
        sector: { label: "Technology", source: "tws", confidence: "provider" },
        industry: {
          label: "Consumer Electronics",
          source: "tws",
          confidence: "provider",
        },
        exchange: "NASDAQ",
      }),
    );

    expect(chain).toHaveLength(2);
    const sector = chain.find((r) => r.kind === "sector");
    expect(sector?.label).toBe("Technology");
    expect(sector?.symbol).toBeUndefined();
    expect(chain.some((r) => r.label === "Indexes")).toBe(false);
    expect(chain.some((r) => r.kind === "sector_etf")).toBe(false);
  });

  it("builds tradable groups ordered by flavor with IBM benchmark/style/strategy", () => {
    const groups = buildTradableGroups({
      symbol: "IBM",
      sector: { label: "Technology", source: "yahoo", confidence: "fallback" },
      industry: {
        label: "Information Technology Services",
        source: "yahoo",
        confidence: "fallback",
      },
    });

    expect(groups.map((g) => g.flavor)).toEqual([
      "sector_etf",
      "broad_market",
      "benchmark",
      "style",
      "strategy",
    ]);

    expect(groups.find((g) => g.flavor === "sector_etf")?.members[0]?.symbol).toBe("XLK");
    expect(groups.find((g) => g.flavor === "broad_market")?.members[0]?.symbol).toBe("SPY");
    expect(groups.find((g) => g.flavor === "benchmark")?.members[0]?.symbol).toBe("DIA");
    expect(groups.find((g) => g.flavor === "style")?.members[0]?.symbol).toBe("SPYV");
    expect(groups.find((g) => g.flavor === "strategy")?.members[0]?.symbol).toBe("NOBL");
  });

  it("builds tradable groups for AAPL with sector, broad, and benchmark sections", () => {
    const groups = buildTradableGroups({
      symbol: "AAPL",
      sector: { label: "Technology", source: "tws", confidence: "provider" },
      industry: {
        label: "Consumer Electronics",
        source: "tws",
        confidence: "provider",
      },
    });

    expect(groups.find((g) => g.flavor === "sector_etf")?.members[0]?.symbol).toBe("XLK");
    expect(groups.find((g) => g.flavor === "broad_market")?.members.map((m) => m.symbol)).toEqual([
      "SPY",
    ]);
    expect(groups.find((g) => g.flavor === "benchmark")?.members.map((m) => m.symbol)).toEqual([
      "QQQ",
      "DIA",
    ]);
  });

  it("dedupes tradable symbols within a group", () => {
    const groups = buildTradableGroups({
      symbol: "AAPL",
      sector: { label: "Technology", source: "tws", confidence: "provider" },
      industry: null,
    });

    const broad = groups.find((g) => g.flavor === "broad_market");
    expect(broad?.members.filter((m) => m.symbol === "SPY")).toHaveLength(1);
  });

  it("omits industry ETF group when it matches the sector ETF", () => {
    const groups = buildTradableGroups({
      symbol: "X",
      sector: { label: "Healthcare", source: "tws", confidence: "provider" },
      industry: { label: "Medical - HealthcarePlans", source: "tws", confidence: "provider" },
    });

    expect(groups.find((g) => g.flavor === "industry_etf")).toBeUndefined();
    expect(groups.find((g) => g.flavor === "sector_etf")?.members[0]?.symbol).toBe("XLV");
  });

  it("resolves a sector ETF via direct map for non-GICS sector labels (e.g. Semiconductors → SMH)", () => {
    expect(mapSectorToEtf("Semiconductors")).toBe("SMH");
  });

  it("builds a sector ETF group for OUST-style classification (Semiconductors sector)", () => {
    // Mirrors the screenshot: OUST classified with sector=Semiconductors,
    // industry=Electronic Components... — the Related popover must still surface SMH.
    const groups = buildTradableGroups({
      symbol: "OUST",
      sector: { label: "Semiconductors", source: "fmp", confidence: "provider" },
      industry: { label: "Electronic Components - Semiconductors", source: "fmp", confidence: "provider" },
    });

    const sectorGroup = groups.find((g) => g.flavor === "sector_etf");
    expect(sectorGroup?.members[0]?.symbol).toBe("SMH");
  });

  it("falls back to industry ETF map when sector label has no direct sector ETF mapping", () => {
    // "Software—Infrastructure" is not a GICS sector but is in INDUSTRY_ETF_MAP.
    const groups = buildTradableGroups({
      symbol: "ZZZ",
      sector: { label: "Software—Infrastructure", source: "fmp", confidence: "provider" },
      industry: null,
    });

    const sectorGroup = groups.find((g) => g.flavor === "sector_etf");
    expect(sectorGroup?.members[0]?.symbol).toBe("IGV");
  });
});
