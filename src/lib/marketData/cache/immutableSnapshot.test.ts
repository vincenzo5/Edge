import { describe, it, expect } from "vitest";
import { approxPayloadBytes, freezeCandleSeries, prepareServerSnapshot } from "./immutableSnapshot";
import type { EquityCandle } from "../contracts/equities";

function candle(c: number, t: number): EquityCandle {
  return { t, o: c, h: c, l: c, c, v: 1 };
}

describe("immutableSnapshot", () => {
  it("freezes candle series for shared storage", () => {
    const series = [candle(1, 1), candle(2, 2)];
    const frozen = freezeCandleSeries(series);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen[0])).toBe(true);
  });

  it("approximates candle payload bytes by length", () => {
    const bytes = approxPayloadBytes([candle(1, 1), candle(2, 2)]);
    expect(bytes).toBe(96);
  });

  it("prepareServerSnapshot clones small mutable records", () => {
    const original = { symbol: "AAPL", price: 1 };
    const stored = prepareServerSnapshot(original);
    original.price = 99;
    expect(stored.price).toBe(1);
  });
});
