import type { Interval, Range } from '@edge/chart-core';
import { intervalForRange } from './rangeInterval';

export type RangePresetConfig = {
  range: Range;
  interval: Interval;
  rangePreset?: Range | null;
};

const DEFAULT_DESELECTED_RANGE = {
  range: '1y' as Range,
  interval: '1d' as Interval,
};

export function applyRangePresetSelect<T extends RangePresetConfig>(
  config: T,
  range: Range,
): T {
  if (config.rangePreset === range) {
    return {
      ...config,
      ...DEFAULT_DESELECTED_RANGE,
      rangePreset: null,
    };
  }

  return {
    ...config,
    range,
    interval: intervalForRange(range),
    rangePreset: range,
  };
}

/** Stable identity for fetched candle data (excludes rangePreset). */
export function buildCandleSessionKey(
  symbol: string,
  range: string,
  interval: string,
): string {
  return `${symbol}|${range}|${interval}`;
}

/** Viewport revision passed to ChartCanvas — undefined while candles are stale for the config session. */
export function resolveViewportRevision(
  baseCandleCount: number,
  loadedSessionKey: string | null,
  candleSessionKey: string,
  viewportSessionKey: string,
): string | undefined {
  if (baseCandleCount === 0) return `empty|${viewportSessionKey}`;
  if (loadedSessionKey !== candleSessionKey) return undefined;
  return viewportSessionKey;
}
