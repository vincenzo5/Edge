import type { Candle } from './contracts';

export type LegendBarData = {
  candle: Candle;
  index: number;
  change: number;
  changePct: number;
};

/** Resolve which candle the legend should display (crosshair bar or last bar). */
export function resolveLegendBar(
  candles: Candle[],
  dataIndex: number | null,
): LegendBarData | null {
  if (candles.length === 0) return null;

  const index =
    dataIndex != null && dataIndex >= 0 && dataIndex < candles.length
      ? dataIndex
      : candles.length - 1;

  const candle = candles[index];
  if (!candle) return null;

  const prev = index > 0 ? candles[index - 1] : null;
  const prevClose = prev?.c ?? candle.o;
  const change = candle.c - prevClose;
  const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;

  return { candle, index, change, changePct };
}
