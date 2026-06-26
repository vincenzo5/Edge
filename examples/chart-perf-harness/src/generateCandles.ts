import type { Candle } from "@edge/chart-core";

const DAY_MS = 86_400_000;
const BASE_TS = 1_700_000_000_000;

/** Deterministic pseudo-random in [0, 1). */
function seededUnit(index: number, salt: number): number {
  const x = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43_758.5453;
  return x - Math.floor(x);
}

/** Generate reproducible OHLCV candles for perf scenarios. */
export function generateCandles(count: number, startPrice = 100): Candle[] {
  const candles: Candle[] = new Array(count);
  let price = startPrice;

  for (let i = 0; i < count; i += 1) {
    const drift = (seededUnit(i, 1) - 0.48) * 2.4;
    const open = price;
    const close = Math.max(1, open + drift);
    const wick = seededUnit(i, 2) * 2.5;
    const high = Math.max(open, close) + wick;
    const low = Math.min(open, close) - wick;
    const volume = Math.round(500_000 + seededUnit(i, 3) * 2_500_000);

    candles[i] = {
      t: BASE_TS + i * DAY_MS,
      o: round(open),
      h: round(high),
      l: round(Math.max(0.5, low)),
      c: round(close),
      v: volume,
    };

    price = close;
  }

  return candles;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
