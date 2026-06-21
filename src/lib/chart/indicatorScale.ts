import type { Candle, VisibleRange, IndicatorConfig } from './contracts';
import { IndicatorRegistry } from './pluginHost';
import { attachViewportHelpers, updatePriceRange } from './viewport';

const PADDING = 0.05;

export function applyPanePriceScale(
  vp: VisibleRange,
  candles: Candle[],
  paneId: string,
  indicators: IndicatorConfig[]
): VisibleRange {
  if ((vp as { priceScaleMode?: string }).priceScaleMode === 'manual') {
    return vp;
  }

  if (paneId !== 'price' && indicators.length > 0) {
    const ind = indicators[0];
    const plugin = IndicatorRegistry.get(ind.name);
    const range = plugin?.valueRangeForViewport?.(candles, vp, ind.params);
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

  return updatePriceRange(vp, candles);
}

/** Reset Y scale to auto-fit (price pane or indicator sub-pane). */
export function resetPanePriceScale(
  vp: VisibleRange,
  candles: Candle[],
  paneId: string,
  indicators: IndicatorConfig[]
): VisibleRange {
  return applyPanePriceScale(
    { ...vp, priceScaleMode: 'auto' } as VisibleRange,
    candles,
    paneId,
    indicators
  );
}
