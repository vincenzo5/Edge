import type { Candle, Theme } from './contracts';
import type { IndicatorPlugin } from './plugin-api';
import type { LegendValueEntry, SeriesColor } from './legend/types';

const MAX_CACHE_ENTRIES = 64;
const computeCache = new Map<string, Record<string, number[]>>();

export function computeCacheKey(
  name: string,
  params: Record<string, number> | undefined,
  candles: Candle[],
): string {
  const firstT = candles[0]?.t ?? 0;
  const lastT = candles.at(-1)?.t ?? 0;
  return `${name}|${JSON.stringify(params ?? {})}|${candles.length}|${firstT}|${lastT}`;
}

export function clearComputeCache(): void {
  computeCache.clear();
}

export function getComputedSeries(
  plugin: IndicatorPlugin,
  candles: Candle[],
  params?: Record<string, number>,
): Record<string, number[]> | null {
  if (!plugin.compute) return null;

  const key = computeCacheKey(plugin.name, params, candles);
  const hit = computeCache.get(key);
  if (hit) return hit;

  const data = plugin.compute(candles, params);
  if (computeCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = computeCache.keys().next().value;
    if (oldest) computeCache.delete(oldest);
  }
  computeCache.set(key, data);
  return data;
}

export function resolveOutputColor(
  color: SeriesColor | undefined,
  theme: Theme,
  value: number | null,
): string | undefined {
  if (!color) return undefined;
  return typeof color === 'function' ? color(theme, value) : color;
}

export function legendFromOutputs(
  plugin: IndicatorPlugin,
  index: number,
  candles: Candle[],
  params: Record<string, number> | undefined,
  theme: Theme,
): LegendValueEntry[] | null {
  if (!plugin.outputs?.length) return null;

  const data = getComputedSeries(plugin, candles, params);
  if (!data) return null;

  const firstSeries = Object.values(data)[0];
  if (!firstSeries || index < 0 || index >= firstSeries.length) return null;

  return plugin.outputs.map((out) => {
    const raw = data[out.key]?.[index] ?? null;
    const value = raw != null && Number.isFinite(raw) ? raw : null;
    return {
      id: out.id,
      label: out.label,
      value,
      color: resolveOutputColor(out.color, theme, value),
      tooltip: out.tooltip,
      decimals: out.decimals,
    };
  });
}

export function defaultValueAt(
  plugin: IndicatorPlugin,
  index: number,
  candles: Candle[],
  params?: Record<string, number>,
): number | null {
  const first = plugin.outputs?.[0];
  if (!first) return null;

  const data = getComputedSeries(plugin, candles, params);
  if (!data) return null;

  const series = data[first.key];
  if (!series || index < 0 || index >= series.length) return null;

  const v = series[index];
  return Number.isFinite(v) ? v : null;
}
