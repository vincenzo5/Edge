import type { Interval, Range } from './contracts';
import type { CellConfig } from '@/lib/chartConfig';
import { DEFAULT_CHART_RANGE } from '@/lib/chartConfig';
import { intervalForRange } from './rangeInterval';

/** Stable identity for fetched candle data (excludes rangePreset). */
export function buildCandleSessionKey(
  symbol: string,
  range: Range,
  interval: Interval,
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

/** Apply bottom-bar range preset select or deselect (toggle off restores default landing view). */
export function applyRangePresetSelect(config: CellConfig, preset: Range): CellConfig {
  if (preset === config.rangePreset) {
    return { ...config, ...DEFAULT_CHART_RANGE, rangePreset: null };
  }
  return {
    ...config,
    range: preset,
    interval: intervalForRange(preset),
    rangePreset: preset,
  };
}
