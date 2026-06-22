import type { Candle, IndicatorConfig, Theme } from './contracts';
import type { IndicatorPlugin, ResolvedInputs, ResolvedSeriesStyle } from './plugin-api';
import type { LegendValueEntry, SeriesColor, SeriesOutput } from './legend/types';
import { resolveIndicatorInputs, stableStringifyInputs } from './indicatorInputs';

const MAX_CACHE_ENTRIES = 64;
const computeCache = new Map<string, Record<string, number[]>>();

export function computeCacheKey(
  name: string,
  inputs: ResolvedInputs,
  candles: Candle[],
): string {
  const firstT = candles[0]?.t ?? 0;
  const lastT = candles.at(-1)?.t ?? 0;
  return `${name}|${stableStringifyInputs(inputs)}|${candles.length}|${firstT}|${lastT}`;
}

export function clearComputeCache(): void {
  computeCache.clear();
}

export function getComputedSeries(
  plugin: IndicatorPlugin,
  candles: Candle[],
  inputs?: ResolvedInputs,
  instance?: Pick<IndicatorConfig, 'inputs' | 'params'>,
): Record<string, number[]> | null {
  if (!plugin.compute) return null;

  const resolved =
    inputs ??
    (instance ? resolveIndicatorInputs(plugin, instance) : ({} as ResolvedInputs));

  const key = computeCacheKey(plugin.name, resolved, candles);
  const hit = computeCache.get(key);
  if (hit) return hit;

  const data = plugin.compute(candles, resolved);
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

export function resolveSeriesStyle(
  output: SeriesOutput,
  instance: IndicatorConfig,
  plugin: IndicatorPlugin,
  theme: Theme,
  value: number | null,
): ResolvedSeriesStyle {
  const override = instance.styles?.[output.id];
  const def = plugin.defaultStyles?.[output.id];
  return {
    color:
      override?.color ??
      def?.color ??
      resolveOutputColor(output.color, theme, value) ??
      '#888888',
    lineWidth: override?.lineWidth ?? def?.lineWidth ?? output.lineWidth ?? 1.5,
    visible: override?.visible ?? def?.visible ?? true,
  };
}

export function buildResolvedStylesMap(
  plugin: IndicatorPlugin,
  instance: IndicatorConfig,
  theme: Theme,
  data: Record<string, number[]> | null,
  index: number,
): Map<string, ResolvedSeriesStyle> {
  const map = new Map<string, ResolvedSeriesStyle>();
  if (!plugin.outputs?.length) return map;

  for (const out of plugin.outputs) {
    const raw = data?.[out.key]?.[index] ?? null;
    const value = raw != null && Number.isFinite(raw) ? raw : null;
    map.set(out.id, resolveSeriesStyle(out, instance, plugin, theme, value));
  }
  return map;
}

export function legendFromOutputs(
  plugin: IndicatorPlugin,
  index: number,
  candles: Candle[],
  instance: IndicatorConfig,
  theme: Theme,
): LegendValueEntry[] | null {
  if (!plugin.outputs?.length) return null;

  const inputs = resolveIndicatorInputs(plugin, instance);
  const data = getComputedSeries(plugin, candles, inputs);
  if (!data) return null;

  const firstSeries = Object.values(data)[0];
  if (!firstSeries || index < 0 || index >= firstSeries.length) return null;

  return plugin.outputs
    .filter((out) => resolveSeriesStyle(out, instance, plugin, theme, data[out.key]?.[index] ?? null).visible)
    .map((out) => {
      const raw = data[out.key]?.[index] ?? null;
      const value = raw != null && Number.isFinite(raw) ? raw : null;
      const style = resolveSeriesStyle(out, instance, plugin, theme, value);
      return {
        id: out.id,
        label: out.label,
        value,
        color: style.color,
        tooltip: out.tooltip,
        decimals: out.decimals,
      };
    });
}

export function defaultValueAt(
  plugin: IndicatorPlugin,
  index: number,
  candles: Candle[],
  instance?: Pick<IndicatorConfig, 'inputs' | 'params'>,
  inputs?: ResolvedInputs,
): number | null {
  const first = plugin.outputs?.[0];
  if (!first) return null;

  const resolved =
    inputs ??
    (instance ? resolveIndicatorInputs(plugin, instance) : ({} as ResolvedInputs));
  const data = getComputedSeries(plugin, candles, resolved);
  if (!data) return null;

  const series = data[first.key];
  if (!series || index < 0 || index >= series.length) return null;

  const v = series[index];
  return Number.isFinite(v) ? v : null;
}
