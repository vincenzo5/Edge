import type { Candle, CandleSeriesIdentity, VisibleRange, IndicatorConfig } from '@edge/chart-core';
import { candleTipRevisionFromSeries } from '@edge/chart-core/candleSeriesIdentity';
import type { RequiredChartSettings } from './chartSettings';
import { resolveIndicatorInputs, stableStringifyInputs } from '@edge/chart-core/indicatorInputs';
import {
  resolveIndicatorPlugin,
  resolveIndicatorResultProvider,
  type IndicatorResultProvider,
} from './indicatorResultProvider';
import { attachViewportHelpers, updatePriceRange } from './viewport';

const PADDING = 0.05;

type ScaleBounds = { priceMin: number; priceMax: number };

const visibleScaleCache = new Map<string, ScaleBounds>();

export function clearVisibleScaleCache(): void {
  visibleScaleCache.clear();
}

function quantizeViewportWindow(vp: VisibleRange): { qs: number; qe: number } {
  return {
    qs: Math.max(0, Math.floor(vp.startIndex)),
    qe: Math.ceil(vp.endIndex),
  };
}

function candleIdentityKey(
  candles: Candle[],
  seriesIdentity?: CandleSeriesIdentity,
): string {
  if (seriesIdentity) {
    return `${seriesIdentity.bodyRevision}|${seriesIdentity.tipRevision}|${seriesIdentity.length}`;
  }
  const last = candles.at(-1);
  return `len:${candles.length}|tip:${candleTipRevisionFromSeries(candles)}|last:${last?.t ?? 0}`;
}

function indicatorIdentityKey(indicators: IndicatorConfig[]): string {
  return indicators
    .map((ind) => {
      const plugin = resolveIndicatorPlugin(ind);
      const inputs = plugin ? stableStringifyInputs(resolveIndicatorInputs(plugin, ind)) : '';
      return `${ind.id}|${ind.name}|${ind.revision ?? ''}|${inputs}`;
    })
    .join(';');
}

function relevantIndicatorsForPane(
  paneId: string,
  indicators: IndicatorConfig[],
): IndicatorConfig[] {
  if (paneId !== 'price') {
    return indicators.length > 0 ? [indicators[0]] : [];
  }
  return indicators.filter((ind) => ind.pane === 'main' && ind.visible !== false);
}

function visibleLivePrice(
  vp: VisibleRange,
  candles: Candle[],
  paneId: string,
  livePrice: number | null | undefined,
): number | null {
  if (paneId !== 'price' || livePrice == null || !Number.isFinite(livePrice)) {
    return null;
  }
  const latestIndex = candles.length - 1;
  if (latestIndex < vp.startIndex || latestIndex >= vp.endIndex) {
    return null;
  }
  return livePrice;
}

function buildVisibleScaleCacheKey(
  vp: VisibleRange,
  candles: Candle[],
  paneId: string,
  indicators: IndicatorConfig[],
  chartSettings: RequiredChartSettings | null | undefined,
  livePrice: number | null | undefined,
  seriesIdentity?: CandleSeriesIdentity,
): string {
  const { qs, qe } = quantizeViewportWindow(vp);
  const scalePriceOnly = chartSettings?.scales.scalePriceChartOnly === true;
  const priceScaleType = chartSettings?.scales.priceScaleType ?? 'linear';
  const liveKey =
    paneId === 'price' && livePrice != null && Number.isFinite(livePrice)
      ? livePrice.toFixed(8)
      : 'none';
  return [
    paneId,
    qs,
    qe,
    candleIdentityKey(candles, seriesIdentity),
    indicatorIdentityKey(relevantIndicatorsForPane(paneId, indicators)),
    scalePriceOnly ? '1' : '0',
    priceScaleType,
    liveKey,
  ].join('|');
}

function accumulateSeriesScale(
  plugin: NonNullable<ReturnType<typeof resolveIndicatorPlugin>>,
  data: Record<string, number[]>,
  vp: VisibleRange,
  candleCount: number,
): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  const ds = Math.max(0, Math.floor(vp.startIndex));
  const de = Math.min(candleCount, Math.ceil(vp.endIndex));
  for (const out of plugin.outputs ?? []) {
    if (out.excludeFromScale) continue;
    const values = data[out.key];
    if (!values) continue;
    for (let i = ds; i < de; i++) {
      const v = values[i];
      if (v != null && Number.isFinite(v)) {
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    }
  }
  if (min === Infinity || max <= min) return null;
  return { min, max };
}

function computePanePriceScaleUncached(
  vp: VisibleRange,
  candles: Candle[],
  paneId: string,
  indicators: IndicatorConfig[],
  chartSettings: RequiredChartSettings | null | undefined,
  livePrice: number | null | undefined,
  resultProvider: IndicatorResultProvider | null | undefined,
): VisibleRange {
  const scalePriceOnly = chartSettings?.scales.scalePriceChartOnly === true;

  if (paneId !== 'price' && indicators.length > 0) {
    const ind = indicators[0];
    const plugin = resolveIndicatorPlugin(ind);
    const inputs = plugin ? resolveIndicatorInputs(plugin, ind) : {};
    const range = plugin?.valueRangeForViewport?.(candles, vp, inputs);
    if (range && range.max > range.min) {
      const pad = (range.max - range.min) * PADDING;
      return attachViewportHelpers(
        {
          ...vp,
          priceMin: range.min - pad,
          priceMax: range.max + pad,
        },
        candles.length,
      );
    }
    if (plugin) {
      const provider = resolveIndicatorResultProvider(resultProvider);
      const data = provider.resolveSeries(plugin, ind, candles);
      if (data) {
        const seriesRange = accumulateSeriesScale(plugin, data, vp, candles.length);
        if (seriesRange) {
          const pad = (seriesRange.max - seriesRange.min) * PADDING;
          return attachViewportHelpers(
            {
              ...vp,
              priceMin: seriesRange.min - pad,
              priceMax: seriesRange.max + pad,
            },
            candles.length,
          );
        }
      }
    }
  }

  if (paneId === 'price' && !scalePriceOnly && indicators.length > 0) {
    const overlayIndicators = indicators.filter(
      (ind) => ind.pane === 'main' && ind.visible !== false,
    );
    if (overlayIndicators.length > 0) {
      let min = Infinity;
      let max = -Infinity;
      const provider = resolveIndicatorResultProvider(resultProvider);
      for (const ind of overlayIndicators) {
        const plugin = resolveIndicatorPlugin(ind);
        if (!plugin?.compute && !plugin?.outputs) continue;
        const data =
          provider.resolveSeries(plugin, ind, candles) ??
          plugin.compute?.(candles, resolveIndicatorInputs(plugin, ind));
        if (!data) continue;
        const seriesRange = accumulateSeriesScale(plugin, data, vp, candles.length);
        if (!seriesRange) continue;
        min = Math.min(min, seriesRange.min);
        max = Math.max(max, seriesRange.max);
      }
      if (min !== Infinity && max > min) {
        const candleRange = updatePriceRange(vp, candles);
        const pad = (max - min) * PADDING;
        const liveMin =
          paneId === 'price' && livePrice != null && Number.isFinite(livePrice)
            ? livePrice
            : Infinity;
        const liveMax =
          paneId === 'price' && livePrice != null && Number.isFinite(livePrice)
            ? livePrice
            : -Infinity;
        return attachViewportHelpers(
          {
            ...vp,
            priceMin: Math.min(candleRange.priceMin, min - pad, liveMin),
            priceMax: Math.max(candleRange.priceMax, max + pad, liveMax),
          },
          candles.length,
        );
      }
    }
  }

  const next = updatePriceRange(vp, candles);
  if (paneId !== 'price' || livePrice == null || !Number.isFinite(livePrice)) {
    return next;
  }
  if (livePrice >= next.priceMin && livePrice <= next.priceMax) {
    return next;
  }
  return attachViewportHelpers(
    {
      ...next,
      priceMin: Math.min(next.priceMin, livePrice),
      priceMax: Math.max(next.priceMax, livePrice),
    },
    candles.length,
  );
}

export function applyPanePriceScale(
  vp: VisibleRange,
  candles: Candle[],
  paneId: string,
  indicators: IndicatorConfig[],
  chartSettings?: RequiredChartSettings | null,
  livePrice?: number | null,
  resultProvider?: IndicatorResultProvider | null,
): VisibleRange {
  if ((vp as { priceScaleMode?: string }).priceScaleMode === 'manual') {
    return vp;
  }

  const scaleLivePrice = visibleLivePrice(vp, candles, paneId, livePrice);
  const provider = resolveIndicatorResultProvider(resultProvider);
  const cacheKey = buildVisibleScaleCacheKey(
    vp,
    candles,
    paneId,
    indicators,
    chartSettings,
    scaleLivePrice,
    provider.getSeriesIdentity(),
  );
  const cached = visibleScaleCache.get(cacheKey);
  if (cached) {
    return attachViewportHelpers(
      {
        ...vp,
        priceMin: cached.priceMin,
        priceMax: cached.priceMax,
      },
      candles.length,
    );
  }

  const next = computePanePriceScaleUncached(
    vp,
    candles,
    paneId,
    indicators,
    chartSettings,
    scaleLivePrice,
    provider,
  );
  visibleScaleCache.set(cacheKey, {
    priceMin: next.priceMin,
    priceMax: next.priceMax,
  });
  return next;
}

/** Reset Y scale to auto-fit (price pane or indicator sub-pane). */
export function resetPanePriceScale(
  vp: VisibleRange,
  candles: Candle[],
  paneId: string,
  indicators: IndicatorConfig[],
  chartSettings?: RequiredChartSettings | null,
  resultProvider?: IndicatorResultProvider | null,
): VisibleRange {
  return applyPanePriceScale(
    { ...vp, priceScaleMode: 'auto' } as VisibleRange,
    candles,
    paneId,
    indicators,
    chartSettings,
    undefined,
    resultProvider,
  );
}
