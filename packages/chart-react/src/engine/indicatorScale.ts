import type { Candle, VisibleRange, IndicatorConfig } from '@edge/chart-core';
import type { RequiredChartSettings } from './chartSettings';
import { resolveIndicatorInputs } from '@edge/chart-core/indicatorInputs';
import { getDefaultIndicatorResultProvider, resolveIndicatorPlugin, resolveIndicatorResultProvider, type IndicatorResultProvider } from './indicatorResultProvider';
import { attachViewportHelpers, updatePriceRange } from './viewport';

const PADDING = 0.05;

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
        candles.length
      );
    }
    if (plugin) {
      const provider = resolveIndicatorResultProvider(resultProvider);
      const data = provider.resolveSeries(plugin, ind, candles);
      if (data) {
        const range = accumulateSeriesScale(plugin, data, vp, candles.length);
        if (range) {
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
      for (const ind of overlayIndicators) {
        const plugin = resolveIndicatorPlugin(ind);
        if (!plugin?.compute && !plugin?.outputs) continue;
        const provider = resolveIndicatorResultProvider(resultProvider);
        const data =
          provider.resolveSeries(plugin, ind, candles) ??
          plugin.compute?.(candles, resolveIndicatorInputs(plugin, ind));
        if (!data) continue;
        const range = accumulateSeriesScale(plugin, data, vp, candles.length);
        if (!range) continue;
        min = Math.min(min, range.min);
        max = Math.max(max, range.max);
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

/** Reset Y scale to auto-fit (price pane or indicator sub-pane). */
export function resetPanePriceScale(
  vp: VisibleRange,
  candles: Candle[],
  paneId: string,
  indicators: IndicatorConfig[],
  chartSettings?: RequiredChartSettings | null,
): VisibleRange {
  return applyPanePriceScale(
    { ...vp, priceScaleMode: 'auto' } as VisibleRange,
    candles,
    paneId,
    indicators,
    chartSettings,
  );
}
