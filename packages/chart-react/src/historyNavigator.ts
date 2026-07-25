import type { ChartHistoryExtent, VisibleRange } from '@edge/chart-core';
import { plotLeftOffset, plotWidth, TIME_AXIS_HEIGHT, type PriceScaleSide } from '@edge/chart-core/layout';
import { visibleWindowMs } from '@edge/chart-core';

export const HISTORY_NAVIGATOR_FADE_MS = 800;
export const HISTORY_NAVIGATOR_MIN_THUMB_PCT = 2.5;

export type HistoryNavigatorGeometry = {
  trackLeftPct: number;
  trackWidthPct: number;
  thumbLeftPct: number;
  thumbWidthPct: number;
  indeterminateLeft: boolean;
  visible: boolean;
};

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function msToTrackPct(ms: number, extent: ChartHistoryExtent): number {
  const span = extent.toMs - extent.fromMs;
  if (span <= 0) return 0;
  return clampPct(((ms - extent.fromMs) / span) * 100);
}

/** Map visible viewport + history envelope to overlay geometry (plot-aligned). */
export function computeHistoryNavigatorGeometry(
  extent: ChartHistoryExtent | null | undefined,
  candles: Array<{ t: number }>,
  vp: VisibleRange | null,
  width: number,
  priceScaleSide: PriceScaleSide = 'right',
): HistoryNavigatorGeometry | null {
  if (!extent || !vp || width <= 0 || extent.toMs <= extent.fromMs) return null;

  const window = visibleWindowMs(candles, vp.startIndex, vp.endIndex);
  if (!window) return null;

  const plotOffset = plotLeftOffset(priceScaleSide);
  const pw = plotWidth(width, priceScaleSide);
  const trackLeftPct = (plotOffset / width) * 100;
  const trackWidthPct = (pw / width) * 100;

  let thumbLeft = msToTrackPct(window.fromMs, extent);
  let thumbRight = msToTrackPct(window.toMs, extent);
  if (thumbRight < thumbLeft) {
    const mid = (thumbLeft + thumbRight) / 2;
    thumbLeft = mid;
    thumbRight = mid;
  }
  let thumbWidthPct = Math.max(HISTORY_NAVIGATOR_MIN_THUMB_PCT, thumbRight - thumbLeft);
  let thumbLeftPct = clampPct(thumbLeft);
  if (thumbLeftPct + thumbWidthPct > 100) {
    thumbLeftPct = Math.max(0, 100 - thumbWidthPct);
  }

  const plotLeft = trackLeftPct;
  const plotRight = trackLeftPct + trackWidthPct;
  thumbLeftPct = plotLeft + (thumbLeftPct / 100) * trackWidthPct;
  thumbWidthPct = (thumbWidthPct / 100) * trackWidthPct;

  return {
    trackLeftPct: plotLeft,
    trackWidthPct,
    thumbLeftPct,
    thumbWidthPct,
    indeterminateLeft: extent.completeness === 'discovered',
    visible: true,
  };
}

export function historyNavigatorBottomPx(): number {
  return 4;
}

export function historyNavigatorHeightPx(): number {
  return Math.max(8, TIME_AXIS_HEIGHT - 8);
}
