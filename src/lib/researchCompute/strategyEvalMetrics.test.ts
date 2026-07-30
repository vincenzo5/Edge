import { describe, expect, it } from "vitest";

import {
  strategyEvalSpecSchema,
  type ResearchBar,
  type SignalNode,
} from "./contracts";
import { computeStrategyEvalMetrics } from "./strategyEvalMetrics";

function makeBars(
  prices: number[],
  startT = 1_700_000_000_000,
  stepMs = 86_400_000,
): ResearchBar[] {
  return prices.map((price, index) => ({
    t: startT + index * stepMs,
    o: price,
    h: price + 1,
    l: price - 1,
    c: price,
    v: 1000,
  }));
}

const entrySignal: SignalNode = { op: "gt", left: { op: "close" }, right: 99 };
const exitSignal: SignalNode = { op: "gt", left: { op: "close" }, right: 150 };

function baseSpec(overrides: Partial<ReturnType<typeof strategyEvalSpecSchema.parse>> = {}) {
  return strategyEvalSpecSchema.parse({
    entry: entrySignal,
    exit: exitSignal,
    maxHoldBars: 10,
    fillTiming: "next_open",
    feesBps: 10,
    slippageBps: 5,
    sizing: { mode: "fixed_shares", shares: 100 },
    ...overrides,
  });
}

describe("strategyEvalMetrics", () => {
  it("rejects missing fees via Zod", () => {
    const parsed = strategyEvalSpecSchema.safeParse({
      entry: entrySignal,
      exit: exitSignal,
      maxHoldBars: 5,
      fillTiming: "next_open",
      slippageBps: 5,
      sizing: { mode: "fixed_shares", shares: 10 },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects missing slippage via Zod", () => {
    const parsed = strategyEvalSpecSchema.safeParse({
      entry: entrySignal,
      exit: exitSignal,
      maxHoldBars: 5,
      fillTiming: "next_open",
      feesBps: 10,
      sizing: { mode: "fixed_shares", shares: 10 },
    });
    expect(parsed.success).toBe(false);
  });

  it("deducts fees from net PnL", () => {
    const prices = [100, 100, 100, 110, 120];
    const bars = makeBars(prices);
    const noFees = computeStrategyEvalMetrics({
      barsBySymbol: { TEST: bars },
      spec: baseSpec({ feesBps: 0, slippageBps: 0 }),
    });
    const withFees = computeStrategyEvalMetrics({
      barsBySymbol: { TEST: bars },
      spec: baseSpec({ feesBps: 50, slippageBps: 0 }),
    });
    expect(withFees.trades.length).toBeGreaterThan(0);
    expect(Number(withFees.keyMetrics["Net PnL"])).toBeLessThan(
      Number(noFees.keyMetrics["Net PnL"]),
    );
    expect(Number(withFees.keyMetrics["Fees paid"])).toBeGreaterThan(0);
  });

  it("uses next_open fill price (open not close)", () => {
    const bars: ResearchBar[] = [
      { t: 1000, o: 10, h: 11, l: 9, c: 8, v: 1 },
      { t: 2000, o: 10, h: 11, l: 9, c: 8, v: 1 },
      { t: 3000, o: 20, h: 21, l: 19, c: 15, v: 1 },
      { t: 4000, o: 25, h: 26, l: 24, c: 25, v: 1 },
      { t: 5000, o: 30, h: 31, l: 29, c: 30, v: 1 },
    ];
    const result = computeStrategyEvalMetrics({
      barsBySymbol: { X: bars },
      spec: baseSpec({
        entry: { op: "gt", left: { op: "close" }, right: 14 },
        exit: { op: "gt", left: { op: "close" }, right: 24 },
        entryLagBars: 1,
        maxHoldBars: 5,
        feesBps: 0,
        slippageBps: 0,
      }),
    });
    expect(result.trades.length).toBeGreaterThan(0);
    const first = result.trades[0]!;
    expect(first.entryPx).toBe(25);
  });

  it("force-exits at maxHoldBars", () => {
    const prices = Array.from({ length: 20 }, (_, index) => 100 + index);
    const bars = makeBars(prices);
    const result = computeStrategyEvalMetrics({
      barsBySymbol: { UP: bars },
      spec: baseSpec({
        entry: { op: "gt", left: { op: "close" }, right: 99 },
        exit: { op: "gt", left: { op: "close" }, right: 9999 },
        maxHoldBars: 3,
        entryLagBars: 1,
        feesBps: 0,
        slippageBps: 0,
      }),
    });
    expect(result.trades.length).toBeGreaterThan(0);
    for (const trade of result.trades) {
      expect(trade.holdBars).toBeLessThanOrEqual(3);
    }
  });

  it("warns on zero costs", () => {
    const bars = makeBars([100, 101, 102, 103, 104]);
    const result = computeStrategyEvalMetrics({
      barsBySymbol: { T: bars },
      spec: baseSpec({ feesBps: 0, slippageBps: 0 }),
    });
    expect(result.warnings.some((w) => /pre-cost/i.test(w))).toBe(true);
  });

  it("produces equity curve artifact payload", () => {
    const prices = [100, 100, 105, 110, 115];
    const bars = makeBars(prices);
    const result = computeStrategyEvalMetrics({
      barsBySymbol: { TEST: bars },
      spec: baseSpec({
        exit: { op: "gt", left: { op: "close" }, right: 108 },
      }),
    });
    expect(result.equityCurve.length).toBeGreaterThanOrEqual(1);
    expect(result.trades.length).toBeGreaterThan(0);
  });
});
