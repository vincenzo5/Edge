import type { Candle } from "./yahoo";

/**
 * Transform raw OHLC candles into Heikin Ashi candles.
 *
 *   HA close = (open + high + low + close) / 4
 *   HA open  = (prevHAOpen + prevHAClose) / 2   (first bar: (open + close) / 2)
 *   HA high  = max(high, HAOpen, HAClose)
 *   HA low   = min(low,  HAOpen, HAClose)
 */
export function toHeikinAshi(candles: Candle[]): Candle[] {
  const out: Candle[] = [];
  let prevOpen: number | null = null;
  let prevClose = 0;

  for (const c of candles) {
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen: number =
      prevOpen == null ? (c.open + c.close) / 2 : (prevOpen + prevClose) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);

    out.push({
      timestamp: c.timestamp,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: c.volume,
    });
    prevOpen = haOpen;
    prevClose = haClose;
  }

  return out;
}
