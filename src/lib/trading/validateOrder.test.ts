import { describe, expect, it } from "vitest";
import { OrderDraftSchema } from "./types";
import {
  assertPaperTradingEnabled,
  isPaperTradingConfigured,
  normalizeDraftForHash,
} from "./validateOrder";

describe("validateOrder", () => {
  it("rejects STP without stopPrice", () => {
    const parsed = OrderDraftSchema.safeParse({
      accountId: "DUP586813",
      symbol: "AAPL",
      side: "BUY",
      quantity: 1,
      orderType: "STP",
      environment: "paper",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects STP LMT without both prices", () => {
    const parsed = OrderDraftSchema.safeParse({
      accountId: "DUP586813",
      symbol: "AAPL",
      side: "BUY",
      quantity: 1,
      orderType: "STP LMT",
      stopPrice: 9,
      environment: "paper",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts STP with stopPrice", () => {
    const parsed = OrderDraftSchema.safeParse({
      accountId: "DUP586813",
      symbol: "AAPL",
      side: "BUY",
      quantity: 1,
      orderType: "STP",
      stopPrice: 9,
      environment: "paper",
    });
    expect(parsed.success).toBe(true);
  });

  it("includes stopPrice and outsideRth in draft hash", () => {
    const withStop = normalizeDraftForHash({
      accountId: "dup",
      symbol: "AAPL",
      side: "BUY",
      quantity: 1,
      orderType: "STP",
      stopPrice: 9,
      outsideRth: false,
      tif: "DAY",
      environment: "paper",
    });
    const withoutStop = normalizeDraftForHash({
      accountId: "dup",
      symbol: "AAPL",
      side: "BUY",
      quantity: 1,
      orderType: "MKT",
      outsideRth: false,
      tif: "DAY",
      environment: "paper",
    });
    expect(withStop).not.toBe(withoutStop);
  });

  it("rejects LMT without limitPrice", () => {
    const parsed = OrderDraftSchema.safeParse({
      accountId: "DUP586813",
      symbol: "AAPL",
      side: "BUY",
      quantity: 1,
      orderType: "LMT",
      environment: "paper",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts live environment in Phase 5", () => {
    const parsed = OrderDraftSchema.safeParse({
      accountId: "U123",
      symbol: "AAPL",
      side: "BUY",
      quantity: 1,
      orderType: "MKT",
      environment: "live",
    });
    expect(parsed.success).toBe(true);
  });

  it("normalizes draft hash consistently", () => {
    const hashA = normalizeDraftForHash({
      accountId: " dup ",
      symbol: "aapl",
      side: "BUY",
      quantity: 1,
      orderType: "MKT",
      tif: "DAY",
      environment: "paper",
    });
    const hashB = normalizeDraftForHash({
      accountId: "dup",
      symbol: "AAPL",
      side: "BUY",
      quantity: 1,
      orderType: "MKT",
      tif: "DAY",
      environment: "paper",
    });
    expect(hashA).toBe(hashB);
  });

  it("checks trading env gate respects readonly", () => {
    const originalReadonly = process.env.TWS_READONLY;
    try {
      process.env.TWS_READONLY = "false";
      expect(isPaperTradingConfigured()).toBe(true);
      expect(() => assertPaperTradingEnabled()).not.toThrow();

      process.env.TWS_READONLY = "true";
      expect(isPaperTradingConfigured()).toBe(false);
      expect(() => assertPaperTradingEnabled()).toThrow();
    } finally {
      process.env.TWS_READONLY = originalReadonly;
    }
  });
});
