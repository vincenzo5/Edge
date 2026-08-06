import { describe, expect, it } from "vitest";
import { OrderDraftSchema } from "./types";
import {
  assertPaperTradingEnabled,
  assertTradingEnvironmentAllowed,
  isPaperTradingConfigured,
  normalizeDraftForHash,
  readTradingEnvironmentLock,
  TradingEnvironmentLockedError,
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

  it("accepts LOC with limit and DAY tif", () => {
    const parsed = OrderDraftSchema.safeParse({
      accountId: "DUP586813",
      symbol: "AAPL",
      side: "BUY",
      quantity: 1,
      orderType: "LOC",
      limitPrice: 88.5,
      tif: "DAY",
      environment: "paper",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects MOC with limitPrice", () => {
    const parsed = OrderDraftSchema.safeParse({
      accountId: "DUP586813",
      symbol: "AAPL",
      side: "BUY",
      quantity: 1,
      orderType: "MOC",
      limitPrice: 88.5,
      environment: "paper",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects IOC on stop orders", () => {
    const parsed = OrderDraftSchema.safeParse({
      accountId: "DUP586813",
      symbol: "AAPL",
      side: "BUY",
      quantity: 1,
      orderType: "STP",
      stopPrice: 85,
      tif: "IOC",
      environment: "paper",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts AON and price mgmt algo on limit", () => {
    const parsed = OrderDraftSchema.safeParse({
      accountId: "DUP586813",
      symbol: "AAPL",
      side: "BUY",
      quantity: 1,
      orderType: "LMT",
      limitPrice: 88.5,
      allOrNone: true,
      usePriceMgmtAlgo: true,
      environment: "paper",
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

  it("checks trading env gate is always configured", () => {
    expect(isPaperTradingConfigured()).toBe(true);
    expect(() => assertPaperTradingEnabled()).not.toThrow();
  });

  it("reads and enforces EDGE_TRADING_ENVIRONMENT_LOCK", () => {
    const originalLock = process.env.EDGE_TRADING_ENVIRONMENT_LOCK;
    try {
      delete process.env.EDGE_TRADING_ENVIRONMENT_LOCK;
      expect(readTradingEnvironmentLock()).toBeNull();
      expect(() => assertTradingEnvironmentAllowed("paper")).not.toThrow();
      expect(() => assertTradingEnvironmentAllowed("live")).not.toThrow();

      process.env.EDGE_TRADING_ENVIRONMENT_LOCK = "paper";
      expect(readTradingEnvironmentLock()).toBe("paper");
      expect(() => assertTradingEnvironmentAllowed("paper")).not.toThrow();
      expect(() => assertTradingEnvironmentAllowed("live")).toThrow(TradingEnvironmentLockedError);

      process.env.EDGE_TRADING_ENVIRONMENT_LOCK = "live";
      expect(readTradingEnvironmentLock()).toBe("live");
      expect(() => assertTradingEnvironmentAllowed("live")).not.toThrow();
      expect(() => assertTradingEnvironmentAllowed("paper")).toThrow(TradingEnvironmentLockedError);
    } finally {
      if (originalLock === undefined) {
        delete process.env.EDGE_TRADING_ENVIRONMENT_LOCK;
      } else {
        process.env.EDGE_TRADING_ENVIRONMENT_LOCK = originalLock;
      }
    }
  });
});
