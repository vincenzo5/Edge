import type { Candle, IndicatorConfig, Theme } from './contracts';
import type { IndicatorPlugin, ResolvedInputs, ResolvedSeriesStyle } from './plugin-api';
import type { LegendValueEntry, SeriesColor, SeriesOutput } from './legend/types';
import { resolveIndicatorInputs, stableStringifyInputs } from './indicatorInputs';
import type { CandleSeriesAdvanceKind, CandleSeriesIdentity } from './candleSeriesIdentity';
import { candleTipRevisionFromSeries } from './candleSeriesIdentity';
import {
  buildComputeCacheAux,
  tryIncrementalTipUpdate,
  type ComputeCacheAux,
} from './indicatorTipUpdate';

const MAX_CACHE_ENTRIES = 64;
/** Soft approximate byte budget for builtin compute cache entries (series array lengths × 8). */
export const COMPUTE_CACHE_SOFT_BYTES = 16 * 1024 * 1024;

type ComputeCacheEntry = {
  bodyRevision: number;
  tipRevision: string;
  data: Record<string, number[]>;
  aux?: ComputeCacheAux;
  touchedAt: number;
  approxBytes: number;
};

const computeCache = new Map<string, ComputeCacheEntry>();

function updateHash(hash: number, value: number | undefined): number {
  const part = `${value ?? ''};`;
  let next = hash;
  for (let i = 0; i < part.length; i += 1) {
    next ^= part.charCodeAt(i);
    next = Math.imul(next, 16777619);
  }
  return next;
}

function hashCandleFields(hash: number, candle: Candle): number {
  let next = updateHash(hash, candle.t);
  next = updateHash(next, candle.o);
  next = updateHash(next, candle.h);
  next = updateHash(next, candle.l);
  next = updateHash(next, candle.c);
  next = updateHash(next, candle.v);
  return next;
}

/** Full-series OHLCV fingerprint — use when value-sensitive identity is required. */
export function candleValueFingerprint(candles: Candle[]): string {
  let hash = 2166136261;
  for (const candle of candles) {
    hash = hashCandleFields(hash, candle);
  }
  return (hash >>> 0).toString(36);
}

/** Hash of all candles except the live tip bar — stable under tip replace-latest. */
export function candleBodyFingerprint(candles: Candle[]): string {
  if (candles.length <= 1) return '0';
  let hash = 2166136261;
  for (let i = 0; i < candles.length - 1; i += 1) {
    hash = hashCandleFields(hash, candles[i]!);
  }
  return (hash >>> 0).toString(36);
}

export { candleTipRevision, candleTipRevisionFromSeries } from './candleSeriesIdentity';

/** Tip-stable cache identity — excludes tip OHLC so live ticks reuse one slot. */
export function computeTipStableCacheKey(
  name: string,
  inputs: ResolvedInputs,
  candles: Candle[],
  identity?: CandleSeriesIdentity,
): string {
  if (identity) {
    return `${name}|${stableStringifyInputs(inputs)}|${identity.length}|${identity.firstT}|${identity.lastT}|${identity.bodyRevision}`;
  }
  const firstT = candles[0]?.t ?? 0;
  const lastT = candles.at(-1)?.t ?? 0;
  return `${name}|${stableStringifyInputs(inputs)}|${candles.length}|${firstT}|${lastT}|${candleBodyFingerprint(candles)}`;
}

/** Alias for tip-stable identity (legacy name). */
export function computeCacheKey(
  name: string,
  inputs: ResolvedInputs,
  candles: Candle[],
  identity?: CandleSeriesIdentity,
): string {
  return computeTipStableCacheKey(name, inputs, candles, identity);
}

function approxSeriesBytes(data: Record<string, number[]>): number {
  let sum = 0;
  for (const arr of Object.values(data)) {
    sum += arr.length * 8;
  }
  return sum;
}

function totalComputeCacheBytes(): number {
  let sum = 0;
  for (const entry of computeCache.values()) {
    sum += entry.approxBytes;
  }
  return sum;
}

function evictComputeCacheUntilWithinBudget(): void {
  while (
    computeCache.size > MAX_CACHE_ENTRIES ||
    totalComputeCacheBytes() > COMPUTE_CACHE_SOFT_BYTES
  ) {
    let victimKey: string | null = null;
    let victimTouch = Infinity;
    let victimBytes = -Infinity;

    for (const [key, entry] of computeCache) {
      const shouldEvict =
        victimKey == null ||
        entry.touchedAt < victimTouch ||
        (entry.touchedAt === victimTouch && entry.approxBytes > victimBytes);
      if (shouldEvict) {
        victimKey = key;
        victimTouch = entry.touchedAt;
        victimBytes = entry.approxBytes;
      }
    }

    if (victimKey == null) break;
    computeCache.delete(victimKey);
  }
}

export function clearComputeCache(): void {
  computeCache.clear();
}

/** Test helper — current builtin compute cache entry count. */
export function getComputeCacheEntryCount(): number {
  return computeCache.size;
}

export type GetComputedSeriesOptions = {
  identity?: CandleSeriesIdentity;
  advanceKind?: CandleSeriesAdvanceKind;
};

function resolveIdentity(
  candles: Candle[],
  options?: GetComputedSeriesOptions,
): CandleSeriesIdentity | undefined {
  if (options?.identity) return options.identity;
  return undefined;
}

export function getComputedSeries(
  plugin: IndicatorPlugin,
  candles: Candle[],
  inputs?: ResolvedInputs,
  instance?: Pick<IndicatorConfig, 'inputs' | 'params'>,
  options?: GetComputedSeriesOptions,
): Record<string, number[]> | null {
  if (!plugin.compute) return null;

  const resolved =
    inputs ??
    (instance ? resolveIndicatorInputs(plugin, instance) : ({} as ResolvedInputs));

  const identity = resolveIdentity(candles, options);
  const key = computeTipStableCacheKey(plugin.name, resolved, candles, identity);
  const tipRevision = identity?.tipRevision ?? candleTipRevisionFromSeries(candles);
  const bodyRevision = identity?.bodyRevision ?? -1;
  const hit = computeCache.get(key);

  if (hit && hit.tipRevision === tipRevision) {
    hit.touchedAt = Date.now();
    return hit.data;
  }

  if (
    hit &&
    hit.bodyRevision === bodyRevision &&
    identity &&
    hit.tipRevision !== tipRevision
  ) {
    const incremental = tryIncrementalTipUpdate(
      plugin.name,
      candles,
      resolved,
      hit.data,
      hit.aux,
      options?.advanceKind ?? identity.lastAdvanceKind,
    );
    if (incremental) {
      const now = Date.now();
      computeCache.set(key, {
        bodyRevision,
        tipRevision,
        data: incremental.data,
        aux: incremental.aux,
        touchedAt: now,
        approxBytes: approxSeriesBytes(incremental.data),
      });
      evictComputeCacheUntilWithinBudget();
      return incremental.data;
    }
  }

  const data = plugin.compute(candles, resolved);
  const now = Date.now();
  computeCache.set(key, {
    bodyRevision,
    tipRevision,
    data,
    aux: buildComputeCacheAux(plugin.name, candles, resolved, data),
    touchedAt: now,
    approxBytes: approxSeriesBytes(data),
  });
  evictComputeCacheUntilWithinBudget();
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
  dataOverride?: Record<string, number[]> | null,
): LegendValueEntry[] | null {
  if (!plugin.outputs?.length) return null;

  const inputs = resolveIndicatorInputs(plugin, instance);
  const data = dataOverride ?? getComputedSeries(plugin, candles, inputs);
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
