import type { Candle, VisibleRange, IndicatorConfig } from '@edge/chart-core';
import type { RequiredChartSettings } from './chartSettings';
import { IndicatorRegistry } from '@edge/chart-core';
import { resolveIndicatorInputs } from '@edge/chart-core/indicatorInputs';
import { attachViewportHelpers, updatePriceRange } from './viewport';

const PADDING = 0.05;

export function applyPanePriceScale(
  vp: VisibleRange,
  candles: Candle[],
  paneId: string,
  indicators: IndicatorConfig[],
  chartSettings?: RequiredChartSettings | null,
  livePrice?: number | null,
): VisibleRange {
  if ((vp as { priceScaleMode?: string }).priceScaleMode === 'manual') {
    return vp;
  }

  const scalePriceOnly = chartSettings?.scales.scalePriceChartOnly === true;

  if (paneId !== 'price' && indicators.length > 0) {
    const ind = indicators[0];
    const plugin = IndicatorRegistry.get(ind.name);
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
  }

  if (paneId === 'price' && !scalePriceOnly && indicators.length > 0) {
    const overlayIndicators = indicators.filter(
      (ind) => ind.pane === 'main' && ind.visible !== false,
    );
    if (overlayIndicators.length > 0) {
      let min = Infinity;
      let max = -Infinity;
      for (const ind of overlayIndicators) {
        const plugin = IndicatorRegistry.get(ind.name);
        if (!plugin?.compute) continue;
        const inputs = resolveIndicatorInputs(plugin, ind);
        const data = plugin.compute(candles, inputs);
        const ds = Math.max(0, Math.floor(vp.startIndex));
        const de = Math.min(candles.length, Math.ceil(vp.endIndex));
        for (const values of Object.values(data)) {
          for (let i = ds; i < de; i++) {
            const v = values[i];
            if (v != null && Number.isFinite(v)) {
              min = Math.min(min, v);
              max = Math.max(max, v);
            }
          }
        }
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
