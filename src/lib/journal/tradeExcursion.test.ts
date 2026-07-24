import { describe, expect, it } from "vitest";

import {
  computeTradeExcursionFromCandles,
  filterCandlesInTradeWindow,
  type TradeExcursionInput,
} from "@/lib/journal/tradeExcursion";
import type { Candle } from "@edge/chart-core/contracts";

const baseInput: TradeExcursionInput = {
  direction: "long",
  avgEntry: 100,
  netQuantity: 10,
  secType: "STK",
  openedAt: "2026-06-01T14:00:00.000Z",
  closedAt: "2026-06-01T16:00:00.000Z",
  plannedRiskMode: "usd",
  plannedRiskValue: 50,
  plannedRiskUsd: 50,
};

function bar(t: string, h: number, l: number): Candle {
  const ms = Date.parse(t);
  return { t: ms, o: 100, h, l, c: 100, v: 1000 };
}

describe("tradeExcursion", () => {
  it("filters candles to trade window", () => {
    const candles = [
      bar("2026-06-01T13:00:00.000Z", 101, 99),
      bar("2026-06-01T14:30:00.000Z", 105, 98),
      bar("2026-06-01T17:00:00.000Z", 106, 97),
    ];
    expect(
      filterCandlesInTradeWindow(candles, baseInput.openedAt, baseInput.closedAt),
    ).toHaveLength(1);
  });

  it("computes long MFE/MFA from fixture bars", () => {
    const candles = [
      bar("2026-06-01T14:30:00.000Z", 105, 98),
      bar("2026-06-01T15:00:00.000Z", 103, 95),
    ];
    const result = computeTradeExcursionFromCandles(baseInput, candles, "1m");
    expect(result).toEqual({
      mfeUsd: 50,
      mfaUsd: 50,
      mfeR: 1,
      mfaR: 1,
      interval: "1m",
      barCount: 2,
    });
  });

  it("computes short MFE/MFA with inverted high/low roles", () => {
    const candles = [bar("2026-06-01T14:30:00.000Z", 102, 96)];
    const result = computeTradeExcursionFromCandles(
      { ...baseInput, direction: "short" },
      candles,
      "5m",
    );
    expect(result?.mfeUsd).toBe(40);
    expect(result?.mfaUsd).toBe(20);
  });

  it("returns null when no bars in window", () => {
    expect(
      computeTradeExcursionFromCandles(baseInput, [], "1m"),
    ).toBeNull();
  });
});
