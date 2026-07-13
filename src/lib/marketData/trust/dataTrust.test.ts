import { describe, expect, it } from "vitest";
import { createDataResult } from "../contracts/result";
import { HOT_STALE_MS } from "../hotStore";
import {
  DATASET_POLICIES,
  buildTrustMeta,
  displayFreshnessReason,
  evaluateReadiness,
  getDatasetPolicy,
  isDisplayFresh,
  isFallbackSource,
  provenanceFromDataResult,
  provenanceFromMeta,
} from "./dataTrust";

describe("dataTrust", () => {
  it("defines policies for every dataset kind", () => {
    const kinds = Object.keys(DATASET_POLICIES);
    expect(kinds).toContain("chart_candles");
    expect(kinds).toContain("pre_trade_quote");
    expect(getDatasetPolicy("chart_candles").fallbackAllowed).toBe(true);
    expect(getDatasetPolicy("positions").fallbackAllowed).toBe(false);
  });

  it("detects fallback sources from yahoo/mixed and warnings", () => {
    expect(isFallbackSource("yahoo")).toBe(true);
    expect(isFallbackSource("mixed")).toBe(true);
    expect(isFallbackSource("tws")).toBe(false);
    expect(isFallbackSource("tws", ["TWS temporarily skipped; trying next provider"])).toBe(
      true,
    );
  });

  it("allows chart candles from yahoo for display", () => {
    const provenance = provenanceFromDataResult(
      createDataResult([], "yahoo", {
        stale: true,
        warnings: ["TWS temporarily skipped (gateway_disconnected)"],
      }),
    );
    const readiness = evaluateReadiness("chart_candles", "display", provenance);
    expect(readiness.status).toBe("ok");
    expect(readiness.allowedForTradingDecision).toBe(false);
  });

  it("blocks yahoo watchlist quote for trading decision", () => {
    const provenance = provenanceFromMeta({
      source: "yahoo",
      stale: false,
      asOf: Date.now(),
    });
    const readiness = evaluateReadiness("watchlist_quotes", "trading_decision", provenance);
    expect(readiness.status).toBe("blocked");
    expect(readiness.reasons.some((r) => /not allowed for trading/i.test(r))).toBe(true);
  });

  it("blocks stale pre_trade_quote even from tws", () => {
    const provenance = provenanceFromMeta({
      source: "tws",
      stale: true,
      asOf: Date.now() - 10_000,
      receivedAt: Date.now(),
    });
    const readiness = evaluateReadiness("pre_trade_quote", "trading_decision", provenance);
    expect(readiness.status).toBe("blocked");
    expect(readiness.reasons).toContain("Data is marked stale");
  });

  it("allows fresh tws pre_trade_quote for trading decision", () => {
    const now = Date.now();
    const provenance = provenanceFromMeta({
      source: "tws",
      stale: false,
      asOf: now - 500,
      receivedAt: now,
    });
    const readiness = evaluateReadiness("pre_trade_quote", "trading_decision", provenance, now);
    expect(readiness.status).toBe("ok");
    expect(readiness.allowedForTradingDecision).toBe(true);
  });

  it("blocks yahoo pre_trade_quote for trading decision", () => {
    const now = Date.now();
    const provenance = provenanceFromMeta({
      source: "yahoo",
      stale: false,
      asOf: now,
      receivedAt: now,
    });
    const readiness = evaluateReadiness("pre_trade_quote", "trading_decision", provenance, now);
    expect(readiness.status).toBe("blocked");
    expect(readiness.allowedForTradingDecision).toBe(false);
  });

  it("blocks mixed pre_trade_quote for trading decision", () => {
    const now = Date.now();
    const provenance = provenanceFromMeta({
      source: "mixed",
      stale: false,
      asOf: now,
      receivedAt: now,
    });
    const readiness = evaluateReadiness("pre_trade_quote", "trading_decision", provenance, now);
    expect(readiness.status).toBe("blocked");
    expect(readiness.allowedForTradingDecision).toBe(false);
  });

  it("blocks massive pre_trade_quote for trading decision", () => {
    const now = Date.now();
    const provenance = provenanceFromMeta({
      source: "massive",
      stale: false,
      asOf: now,
      receivedAt: now,
    });
    const readiness = evaluateReadiness("pre_trade_quote", "trading_decision", provenance, now);
    expect(readiness.status).toBe("blocked");
    expect(readiness.allowedForTradingDecision).toBe(false);
  });

  it("blocks options chain fallback sources", () => {
    const provenance = provenanceFromMeta({ source: "yahoo" });
    const readiness = evaluateReadiness("options_chain", "analysis", provenance);
    expect(readiness.status).toBe("blocked");
    expect(readiness.reasons.some((r) => /Fallback source/i.test(r))).toBe(true);
  });

  it("treats watchlist quotes within 60s as display fresh even when stale flag set", () => {
    const now = Date.now();
    const provenance = provenanceFromMeta({
      source: "tws",
      stale: true,
      asOf: now - 10_000,
      receivedAt: now,
      cacheTier: "hot-stale",
    });
    expect(isDisplayFresh("watchlist_quotes", provenance, now)).toBe(true);
    expect(displayFreshnessReason("watchlist_quotes", provenance, now)).toBeNull();
  });

  it("marks watchlist quotes older than 60s as not display fresh", () => {
    const now = Date.now();
    const provenance = provenanceFromMeta({
      source: "tws",
      stale: true,
      asOf: now - 90_000,
      receivedAt: now,
    });
    expect(isDisplayFresh("watchlist_quotes", provenance, now)).toBe(false);
    expect(displayFreshnessReason("watchlist_quotes", provenance, now)).toMatch(/90s/);
  });

  it("treats chart candles within hot-stale window as display fresh even when stale flag set", () => {
    const now = Date.now();
    const provenance = provenanceFromMeta({
      source: "tws",
      stale: true,
      asOf: now - 30_000,
      receivedAt: now,
      cacheTier: "hot-stale",
    });
    expect(isDisplayFresh("chart_candles", provenance, now)).toBe(true);
    expect(displayFreshnessReason("chart_candles", provenance, now)).toBeNull();
  });

  it("marks chart candles older than hot-stale window as not display fresh", () => {
    const now = Date.now();
    const provenance = provenanceFromMeta({
      source: "tws",
      stale: true,
      asOf: now - HOT_STALE_MS.candles - 1_000,
      receivedAt: now,
    });
    expect(isDisplayFresh("chart_candles", provenance, now)).toBe(false);
  });

  it("treats options chain within hot-stale window as display fresh even when stale flag set", () => {
    const now = Date.now();
    const provenance = provenanceFromMeta({
      source: "tws",
      stale: true,
      asOf: now - 60_000,
      receivedAt: now,
      cacheTier: "hot-stale",
    });
    expect(isDisplayFresh("options_chain", provenance, now)).toBe(true);
  });

  it("treats options expirations within 24h as display fresh even when stale flag set", () => {
    const now = Date.now();
    const provenance = provenanceFromMeta({
      source: "tws",
      stale: true,
      asOf: now - 3_600_000,
      receivedAt: now,
      cacheTier: "hot-stale",
    });
    expect(isDisplayFresh("options_expirations", provenance, now)).toBe(true);
  });

  it("marks options chain older than hot-stale window as not display fresh", () => {
    const now = Date.now();
    const provenance = provenanceFromMeta({
      source: "tws",
      stale: true,
      asOf: now - HOT_STALE_MS.options_chain - 1_000,
      receivedAt: now,
    });
    expect(isDisplayFresh("options_chain", provenance, now)).toBe(false);
  });

  it("does not change yahoo fallback detection for watchlist", () => {
    expect(isFallbackSource("yahoo")).toBe(true);
    const provenance = provenanceFromMeta({ source: "yahoo", asOf: Date.now() });
    expect(provenance.isFallback).toBe(true);
  });

  it("buildTrustMeta attaches usage and readiness summary", () => {
    const meta = buildTrustMeta(
      "chart_candles",
      "display",
      provenanceFromMeta({ source: "tws", stale: false, asOf: Date.now() }),
    );
    expect(meta.usage).toBe("display");
    expect(meta.readiness.status).toBe("ok");
    expect(meta.readiness.allowedForTradingDecision).toBe(false);
  });
});
