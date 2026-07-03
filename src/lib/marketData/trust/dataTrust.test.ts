import { describe, expect, it } from "vitest";
import { createDataResult } from "../contracts/result";
import {
  DATASET_POLICIES,
  buildTrustMeta,
  evaluateReadiness,
  getDatasetPolicy,
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

  it("blocks options chain fallback sources", () => {
    const provenance = provenanceFromMeta({ source: "yahoo" });
    const readiness = evaluateReadiness("options_chain", "analysis", provenance);
    expect(readiness.status).toBe("blocked");
    expect(readiness.reasons.some((r) => /Fallback source/i.test(r))).toBe(true);
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
