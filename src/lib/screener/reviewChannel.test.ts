import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createSetSymbolMessage,
  parseReviewChannelMessage,
} from "./reviewChannel";

describe("reviewChannel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses setSymbol messages", () => {
    expect(
      parseReviewChannelMessage({
        type: "setSymbol",
        symbol: "AAPL",
        name: "Apple Inc.",
        exchange: "NASDAQ",
        source: "screener",
        ts: 1,
      }),
    ).toEqual({
      type: "setSymbol",
      symbol: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ",
      source: "screener",
      ts: 1,
    });
  });

  it("parses hello and chartReady messages", () => {
    expect(parseReviewChannelMessage({ type: "hello" })).toEqual({ type: "hello" });
    expect(parseReviewChannelMessage({ type: "chartReady" })).toEqual({
      type: "chartReady",
    });
  });

  it("rejects malformed messages", () => {
    expect(parseReviewChannelMessage(null)).toBeNull();
    expect(parseReviewChannelMessage({ type: "setSymbol", symbol: "" })).toBeNull();
    expect(parseReviewChannelMessage({ type: "setSymbol", symbol: "AAPL" })).toBeNull();
    expect(
      parseReviewChannelMessage({
        type: "setSymbol",
        symbol: "AAPL",
        source: "chart",
        ts: 1,
      }),
    ).toBeNull();
    expect(parseReviewChannelMessage({ type: "unknown" })).toBeNull();
  });

  it("creates setSymbol messages with screener metadata", () => {
    expect(createSetSymbolMessage("MSFT")).toEqual({
      type: "setSymbol",
      symbol: "MSFT",
      source: "screener",
      ts: Date.parse("2026-07-16T12:00:00.000Z"),
    });

    expect(createSetSymbolMessage("MSFT", "Microsoft", "NASDAQ")).toEqual({
      type: "setSymbol",
      symbol: "MSFT",
      name: "Microsoft",
      exchange: "NASDAQ",
      source: "screener",
      ts: Date.parse("2026-07-16T12:00:00.000Z"),
    });
  });
});
