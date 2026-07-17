import type { OhlcvBar } from "../patternLibrary/types";
import {
  plotLeftOffset,
  plotWidth,
  type PriceScaleSide,
} from "@/lib/chart/layout";

export const DEFAULT_LEFT_PADDING = 5;
export const DEFAULT_RIGHT_PADDING = 0;

export type VisibleRangeLike = {
  startIndex: number;
  endIndex: number;
};

/** Viewport slice used for bar snap + overlay alignment (matches chart canvas). */
export type CaptureViewport = VisibleRangeLike & {
  width: number;
  xForIndex: (index: number) => number;
  indexForX: (plotX: number) => number;
};

/** Client X → bar index using the chart viewport (same math as crosshair). */
export function barIndexFromClientX(
  clientX: number,
  containerLeft: number,
  vp: CaptureViewport,
  priceScaleSide: PriceScaleSide = "right",
): number {
  const localX = clientX - containerLeft;
  const plotOffset = plotLeftOffset(priceScaleSide);
  const pw = plotWidth(vp.width, priceScaleSide);
  const plotX = Math.max(0, Math.min(pw, localX - plotOffset));
  return vp.indexForX(plotX);
}

function barWidthPercent(vp: CaptureViewport, priceScaleSide: PriceScaleSide): number {
  const visible = vp.endIndex - vp.startIndex;
  if (visible <= 0 || vp.width <= 0) return 0;
  return ((plotWidth(vp.width, priceScaleSide) / vp.width) / visible) * 100;
}

/** Left edge of a bar as % of the full chart container (includes price axis). */
export function barMarkerLeftPercent(
  barIndex: number,
  vp: CaptureViewport,
  priceScaleSide: PriceScaleSide = "right",
): number {
  const plotOffset = plotLeftOffset(priceScaleSide);
  const x = plotOffset + vp.xForIndex(barIndex);
  return (x / vp.width) * 100;
}

export function barBandStyle(
  fromBar: number,
  toBar: number,
  vp: CaptureViewport,
  priceScaleSide: PriceScaleSide = "right",
): { left: string; width: string } {
  const leftPct = barMarkerLeftPercent(fromBar, vp, priceScaleSide);
  const barW = barWidthPercent(vp, priceScaleSide);
  const rightPct = barMarkerLeftPercent(toBar, vp, priceScaleSide) + barW;
  return {
    left: `${Math.max(0, leftPct)}%`,
    width: `${Math.max(0.5, rightPct - leftPct)}%`,
  };
}

export function barMarkerCenterPercent(
  barIndex: number,
  vp: CaptureViewport,
  priceScaleSide: PriceScaleSide = "right",
  containerWidth = vp.width,
): number {
  const plotOffset = plotLeftOffset(priceScaleSide);
  const visible = vp.endIndex - vp.startIndex;
  const barWidthPx = visible > 0 ? plotWidth(vp.width, priceScaleSide) / visible : 0;
  const x = plotOffset + vp.xForIndex(barIndex) + barWidthPx / 2;
  return (x / containerWidth) * 100;
}

/** Resolve dot position over the price-pane canvas within the chart overlay cell. */
export function resolveCaptureDotLayout(
  barIndex: number,
  overlayEl: HTMLElement,
  vp: CaptureViewport,
  priceScaleSide: PriceScaleSide = "right",
): { markerLeftPct: number; markerTopPx: number } | null {
  const overlayRect = overlayEl.getBoundingClientRect();
  if (overlayRect.width <= 0) return null;

  const canvas = overlayEl.querySelector("canvas");
  const canvasRect = canvas?.getBoundingClientRect();
  const visible = vp.endIndex - vp.startIndex;
  if (visible <= 0) return null;

  const barWidthPx = plotWidth(vp.width, priceScaleSide) / visible;
  const plotOffset = plotLeftOffset(priceScaleSide);
  const barCenterX = plotOffset + vp.xForIndex(barIndex) + barWidthPx / 2;

  if (canvasRect) {
    const canvasLeftInOverlay = canvasRect.left - overlayRect.left;
    const markerLeftPct = ((canvasLeftInOverlay + barCenterX) / overlayRect.width) * 100;
    const markerTopPx = canvasRect.top - overlayRect.top + 10;
    return { markerLeftPct, markerTopPx };
  }

  return {
    markerLeftPct: barMarkerCenterPercent(barIndex, vp, priceScaleSide, overlayRect.width),
    markerTopPx: overlayRect.height * 0.35,
  };
}

/** Plot-local X → bar index (matches chart-react indexAtX semantics). */
export function barIndexFromPlotX(
  plotX: number,
  plotWidthPx: number,
  visibleRange: VisibleRangeLike,
  candleCount: number,
): number {
  const visible = visibleRange.endIndex - visibleRange.startIndex;
  if (visible <= 0 || plotWidthPx <= 0) return 0;
  const idx = visibleRange.startIndex + Math.floor((plotX / plotWidthPx) * visible);
  return Math.max(0, Math.min(candleCount - 1, idx));
}

export function sectionExtremes(
  bars: OhlcvBar[],
  fromBar: number,
  toBar: number,
): { high: number; low: number } {
  const start = Math.min(fromBar, toBar);
  const end = Math.max(fromBar, toBar);
  let high = -Infinity;
  let low = Infinity;
  for (let i = start; i <= end; i++) {
    const bar = bars[i];
    if (!bar) continue;
    high = Math.max(high, bar.high);
    low = Math.min(low, bar.low);
  }
  return {
    high: Number.isFinite(high) ? high : 0,
    low: Number.isFinite(low) ? low : 0,
  };
}

export function slicePatternOhlcv(
  allBars: OhlcvBar[],
  startBar: number,
  endBar: number,
): OhlcvBar[] {
  const start = Math.max(0, Math.min(startBar, endBar));
  const end = Math.min(allBars.length - 1, Math.max(startBar, endBar));
  return allBars.slice(start, end + 1).map((b) => ({ ...b }));
}

export function buildPaddedRenderBars(
  allBars: OhlcvBar[],
  startBar: number,
  endBar: number,
  padding: { left: number; right: number },
): { renderBars: OhlcvBar[]; leftPaddingApplied: number } {
  const start = Math.max(0, Math.min(startBar, endBar));
  const end = Math.min(allBars.length - 1, Math.max(startBar, endBar));
  const paddedStart = Math.max(0, start - padding.left);
  const paddedEnd = Math.min(allBars.length - 1, end + padding.right);
  return {
    renderBars: allBars.slice(paddedStart, paddedEnd + 1).map((b) => ({ ...b })),
    leftPaddingApplied: start - paddedStart,
  };
}

export function barPlotPercent(
  barIndex: number,
  visibleRange: VisibleRangeLike,
): number {
  const visible = visibleRange.endIndex - visibleRange.startIndex;
  if (visible <= 0) return 0;
  return ((barIndex - visibleRange.startIndex) / visible) * 100;
}

export function timestampToIso(ms: number): string {
  return new Date(ms).toISOString();
}
