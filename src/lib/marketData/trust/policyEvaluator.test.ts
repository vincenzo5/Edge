import { describe, expect, it } from "vitest";
import { HOT_STALE_MS } from "../hotStoreConstants";
import { evaluateDatasetPolicy, isPolicyDisplayFresh } from "./policyEvaluator";

const NOW = 1_700_000_000_000;

describe("policyEvaluator", () => {
  it("treats closed-market watchlist delivery as display fresh with old quote asOf", () => {
    // Saturday 2023-11-11 15:00 UTC
    const now = Date.UTC(2023, 10, 11, 15, 0, 0);
    const result = evaluateDatasetPolicy({
      datasetId: "watchlist_quotes",
      receivedAt: now,
      providerAsOf: now - 240_000,
      transportStale: true,
      now,
    });
    expect(result.displayFresh).toBe(true);
    expect(result.freshness).not.toBe("stale");
  });

  it("marks watchlist stale when delivery age exceeds session-adjusted window", () => {
    const now = Date.UTC(2025, 5, 27, 14, 0, 0);
    const result = evaluateDatasetPolicy({
      datasetId: "watchlist_quotes",
      receivedAt: now - HOT_STALE_MS.quote - 5_000,
      providerAsOf: now - HOT_STALE_MS.quote - 5_000,
      transportStale: true,
      now,
    });
    expect(result.displayFresh).toBe(false);
    expect(result.freshness).toBe("stale");
  });

  it("treats hot-stale cache within window as display fresh", () => {
    const result = evaluateDatasetPolicy({
      datasetId: "chart_candles",
      receivedAt: NOW,
      providerAsOf: NOW - 120_000,
      transportStale: true,
      cacheTier: "hot-stale",
      now: NOW,
    });
    expect(result.displayFresh).toBe(true);
  });

  it("classifies partial quote batches", () => {
    const result = evaluateDatasetPolicy({
      datasetId: "watchlist_quotes",
      receivedAt: NOW,
      skippedSymbols: ["MSFT"],
      requestedCount: 3,
      returnedCount: 2,
      now: NOW,
    });
    expect(result.availability).toBe("partial");
    expect(result.coverage).toBe("partial");
  });

  it("allows empty-valid research datasets", () => {
    const result = evaluateDatasetPolicy({
      datasetId: "news_symbol",
      receivedAt: NOW,
      returnedCount: 0,
      isNullPayload: false,
      now: NOW,
    });
    expect(result.coverage).toBe("empty");
    expect(result.availability).toBe("available");
  });

  it("blocks empty-invalid chart candles", () => {
    const result = evaluateDatasetPolicy({
      datasetId: "chart_candles",
      receivedAt: NOW,
      returnedCount: 0,
      now: NOW,
    });
    expect(result.availability).toBe("unavailable");
    expect(result.coverage).toBe("empty");
  });

  it("detects future provider timestamp anomaly", () => {
    const result = evaluateDatasetPolicy({
      datasetId: "watchlist_quotes",
      receivedAt: NOW,
      providerAsOf: NOW + 600_000,
      now: NOW,
    });
    expect(result.anomalies).toContain("future_provider_timestamp");
    expect(result.freshness).toBe("unknown");
  });

  it("detects clock skew between provider and receipt", () => {
    const result = evaluateDatasetPolicy({
      datasetId: "fundamentals_display",
      receivedAt: NOW,
      providerAsOf: NOW - 400_000,
      now: NOW,
    });
    expect(result.anomalies).toContain("clock_skew");
  });

  it("inherits chart_candles policy for chart_indicators", () => {
    const result = evaluateDatasetPolicy({
      datasetId: "chart_indicators",
      receivedAt: NOW,
      now: NOW,
    });
    expect(result.maxFreshnessMs).toBeGreaterThan(0);
  });

  it("isPolicyDisplayFresh matches evaluateDatasetPolicy", () => {
    expect(
      isPolicyDisplayFresh(
        "watchlist_quotes",
        { receivedAt: NOW, stale: true, cacheTier: "hot-stale" },
        NOW,
      ),
    ).toBe(true);
  });

  it("marks anchor-required datasets unknown when timestamps are missing", () => {
    const result = evaluateDatasetPolicy({
      datasetId: "pre_trade_quote",
      now: NOW,
    });

    expect(result.freshness).toBe("unknown");
    expect(result.displayFresh).toBe(false);
    expect(result.freshnessAnchor).toBe("unknown");
    expect(result.reasons).toContain("missing_anchor");
    expect(isPolicyDisplayFresh("pre_trade_quote", {}, NOW)).toBe(false);
  });
});
