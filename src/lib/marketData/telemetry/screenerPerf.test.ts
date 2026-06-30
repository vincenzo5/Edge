import { describe, it, expect } from "vitest";
import type { MarketDataPerfPhase } from "./perfPhases";
import {
  deriveScreenerPerfFromPhases,
  deriveScreenerPresetResult,
} from "./screenerPerf";

describe("screenerPerf", () => {
  it("derives screener KPIs from server phases", () => {
    const phases: MarketDataPerfPhase[] = [
      { name: "screener.prefilter", ms: 120, ok: true, detail: { candidates: 50 } },
      {
        name: "screener.technical.candle",
        ms: 80,
        ok: true,
        detail: { symbol: "AAPL", source: "yahoo", cacheTier: "cold", barCount: 252 },
      },
      {
        name: "screener.technical.candle",
        ms: 20,
        ok: true,
        detail: { symbol: "MSFT", source: "yahoo", cacheTier: "hot-fresh", barCount: 252 },
      },
      {
        name: "screener.technical.aggregate",
        ms: 200,
        ok: true,
        detail: {
          candidates: 2,
          matched: 1,
          candleCacheHits: 1,
          indicatorCacheHits: 1,
        },
      },
      { name: "screener.total", ms: 350, ok: true, detail: { rows: 1, hadTechnical: true } },
    ];

    const derived = deriveScreenerPerfFromPhases(phases);
    expect(derived.prefilterMs).toBe(120);
    expect(derived.prefilterCandidates).toBe(50);
    expect(derived.technicalMs).toBe(200);
    expect(derived.matched).toBe(1);
    expect(derived.candleP50Ms).toBe(80);
    expect(derived.candleCacheHitPct).toBe(50);
    expect(derived.indicatorCacheHitPct).toBe(50);
    expect(derived.providerMix).toEqual({ yahoo: 2 });
  });

  it("builds preset baseline rows", () => {
    const result = deriveScreenerPresetResult(
      "rsi-oversold",
      "cold",
      [{ name: "screener.total", ms: 900, ok: true }],
      900,
      12,
      "trace-1",
    );
    expect(result.presetId).toBe("rsi-oversold");
    expect(result.variant).toBe("cold");
    expect(result.totalMs).toBe(900);
    expect(result.rows).toBe(12);
  });
});
