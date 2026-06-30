import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FmpScreenerRow } from "@/lib/marketData/contracts/fmp";
import type { EquityCandle } from "@/lib/marketData/contracts/equities";
import { clearMarketDataCacheForTests } from "@/lib/marketData/cache/dataCache";
import { PerfPhaseCollector } from "@/lib/marketData/telemetry/perfPhases";
import {
  runTechnicalFilter,
  TECHNICAL_FILTER_MAX_CANDIDATES,
} from "./technicalFilter";
import { FIFTY_TWO_WEEK_LOOKBACK } from "./technicalMath";

function row(symbol: string): FmpScreenerRow {
  return {
    symbol,
    name: symbol,
    price: 100,
    change: 1,
    changePercent: 1,
    exchange: "NASDAQ",
    volume: 1_000_000,
    sector: "Technology",
    industry: "Software",
    country: "US",
    beta: 1,
    marketCap: 1_000_000_000,
    dividendYield: 0.01,
  };
}

function rsiOversoldCandles(): EquityCandle[] {
  return Array.from({ length: 20 }, (_, index) => ({
    t: index,
    o: 100 - index,
    h: 100 - index,
    l: 100 - index,
    c: 100 - index,
    v: 1,
  }));
}

describe("runTechnicalFilter", () => {
  beforeEach(() => {
    clearMarketDataCacheForTests();
  });

  it("filters candidates by RSI rule", async () => {
    const getCandles = vi.fn(async (symbol: string) =>
      symbol === "PASS" ? rsiOversoldCandles() : rsiOversoldCandles().map((c) => ({ ...c, c: 100 })),
    );

    const result = await runTechnicalFilter(
      [row("PASS"), row("FAIL")],
      { kind: "rsi", period: 14, max: 30 },
      getCandles,
    );

    expect(result.rows.map((entry) => entry.symbol)).toEqual(["PASS"]);
    expect(result.phaseMeta.phases[0]?.detail).toEqual({ count: 2, candidates: 2 });
    expect(result.phaseMeta.phases[1]?.name).toBe("screener.technical.aggregate");
    expect(result.phaseMeta.phases[1]?.detail).toEqual({
      candidates: 2,
      scanned: 2,
      matched: 1,
      candleCacheHits: 0,
      indicatorCacheHits: 0,
      concurrency: 6,
    });
  });

  it("truncates large candidate pools and adds a warning", async () => {
    const candidates = Array.from({ length: TECHNICAL_FILTER_MAX_CANDIDATES + 5 }, (_, index) =>
      row(`SYM${index}`),
    );
    const getCandles = vi.fn(async () => rsiOversoldCandles());

    const result = await runTechnicalFilter(
      candidates,
      { kind: "rsi", period: 14, max: 30 },
      getCandles,
    );

    expect(result.warnings[0]).toContain("Truncated technical pass to 200 candidates");
    expect(result.phaseMeta.phases[1]?.detail).toEqual({
      candidates: TECHNICAL_FILTER_MAX_CANDIDATES,
      scanned: TECHNICAL_FILTER_MAX_CANDIDATES,
      matched: TECHNICAL_FILTER_MAX_CANDIDATES,
      candleCacheHits: 0,
      indicatorCacheHits: 0,
      concurrency: 6,
    });
    expect(getCandles).toHaveBeenCalledTimes(TECHNICAL_FILTER_MAX_CANDIDATES);
  });

  it("records candle fetch failures as skipped symbols", async () => {
    const getCandles = vi.fn(async (symbol: string) => {
      if (symbol === "BAD") throw new Error("upstream");
      return rsiOversoldCandles();
    });

    const result = await runTechnicalFilter(
      [row("BAD"), row("GOOD")],
      { kind: "rsi", period: 14, max: 30 },
      getCandles,
    );

    expect(result.skippedSymbols).toContain("BAD");
    expect(result.rows.map((entry) => entry.symbol)).toEqual(["GOOD"]);
  });

  it("reuses per-symbol technical cache when candle fingerprint is unchanged", async () => {
    const getCandles = vi.fn(async () =>
      Array.from({ length: FIFTY_TWO_WEEK_LOOKBACK }, (_, index) => ({
        t: index,
        o: 100,
        h: 100,
        l: 99,
        c: 97,
        v: 1,
      })),
    );

    const rule = { kind: "fiftyTwoWeekProximity" as const, withinPct: 0.05 };
    const first = await runTechnicalFilter([row("AAPL")], rule, getCandles);
    const second = await runTechnicalFilter([row("AAPL")], rule, getCandles);

    expect(getCandles).toHaveBeenCalledTimes(2);
    expect(first.rows).toEqual(second.rows);
    expect(first.indicatorValues.AAPL?.fiftyTwoWeekDistance).toBe(
      second.indicatorValues.AAPL?.fiftyTwoWeekDistance,
    );
  });

  it("limits concurrent candle fetches", async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const getCandles = vi.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return rsiOversoldCandles();
    });

    await runTechnicalFilter(
      Array.from({ length: 12 }, (_, index) => row(`S${index}`)),
      { kind: "rsi", period: 14, max: 30 },
      getCandles,
    );

    expect(maxInFlight).toBeLessThanOrEqual(6);
    expect(getCandles).toHaveBeenCalledTimes(12);
  });

  it("respects custom maxCandidates and concurrency options", async () => {
    let maxInFlight = 0;
    let inFlight = 0;
    const getCandles = vi.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 2));
      inFlight -= 1;
      return rsiOversoldCandles();
    });

    const candidates = Array.from({ length: 10 }, (_, index) => row(`S${index}`));
    await runTechnicalFilter(
      candidates,
      { kind: "rsi", period: 14, max: 30 },
      getCandles,
      { maxCandidates: Number.POSITIVE_INFINITY, concurrency: 16 },
    );

    expect(maxInFlight).toBeLessThanOrEqual(16);
    expect(getCandles).toHaveBeenCalledTimes(10);
  });

  it("early-exits when maxResults is reached", async () => {
    const getCandles = vi.fn(async () => rsiOversoldCandles());

    const result = await runTechnicalFilter(
      Array.from({ length: 20 }, (_, index) => row(`S${index}`)),
      { kind: "rsi", period: 14, max: 30 },
      getCandles,
      { maxCandidates: Number.POSITIVE_INFINITY, concurrency: 1, maxResults: 3 },
    );

    expect(result.rows.length).toBe(3);
    expect(getCandles.mock.calls.length).toBeLessThan(20);
  });

  it("counts universe cache tier as candle cache hit", async () => {
    const perf = new PerfPhaseCollector();
    const getCandles = vi.fn(async () => ({
      candles: rsiOversoldCandles(),
      source: "massive-universe",
      cacheTier: "universe" as const,
    }));

    await runTechnicalFilter(
      [row("PASS")],
      { kind: "rsi", period: 14, max: 30 },
      getCandles,
      { perf },
    );

    const aggregate = perf.toArray().find((phase) => phase.name === "screener.technical.aggregate");
    expect(aggregate?.detail).toMatchObject({ candleCacheHits: 1 });
  });

  it("returns indicatorValues sidecar for matched rows", async () => {
    const getCandles = vi.fn(async () => rsiOversoldCandles());

    const result = await runTechnicalFilter(
      [row("PASS")],
      { kind: "rsi", period: 14, max: 30 },
      getCandles,
    );

    expect(result.indicatorValues.PASS?.rsi).toBeDefined();
    expect(typeof result.indicatorValues.PASS?.rsi).toBe("number");
  });

  it("records perf phases when a collector is provided", async () => {
    const perf = new PerfPhaseCollector();
    const getCandles = vi.fn(async (symbol: string) => ({
      candles: symbol === "PASS" ? rsiOversoldCandles() : rsiOversoldCandles().map((c) => ({ ...c, c: 100 })),
      source: "yahoo",
      cacheTier: "cold" as const,
    }));

    await runTechnicalFilter(
      [row("PASS"), row("FAIL")],
      { kind: "rsi", period: 14, max: 30 },
      getCandles,
      { perf, traceId: "trace-test" },
    );

    const phases = perf.toArray();
    expect(phases.some((phase) => phase.name === "screener.technical.candle")).toBe(true);
    expect(phases.some((phase) => phase.name === "screener.technical.compute")).toBe(true);
    expect(phases.some((phase) => phase.name === "screener.technical.aggregate")).toBe(true);
    const aggregate = phases.find((phase) => phase.name === "screener.technical.aggregate");
    expect(aggregate?.detail).toMatchObject({ candidates: 2, matched: 1 });
  });

  it("invalidates cache when candle fingerprint changes", async () => {
    let call = 0;
    const getCandles = vi.fn(async () => {
      call += 1;
      const base = rsiOversoldCandles();
      if (call === 1) return base;
      const updated = [...base];
      updated[updated.length - 1] = { ...updated[updated.length - 1]!, c: 50 };
      return updated;
    });

    const rule = { kind: "rsi" as const, period: 14, max: 30 };
    await runTechnicalFilter([row("AAPL")], rule, getCandles);
    await runTechnicalFilter([row("AAPL")], rule, getCandles);

    expect(getCandles).toHaveBeenCalledTimes(2);
  });
});
