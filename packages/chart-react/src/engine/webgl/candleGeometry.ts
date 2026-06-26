import type { Candle, Theme, VisibleRange } from '@edge/chart-core';
import { plotWidth } from '@edge/chart-core/layout';
import type { RequiredChartSettings } from '../chartSettings';

export type CandleChartType =
  | 'candle_solid'
  | 'candle_stroke'
  | 'ohlc'
  | 'area'
  | 'heikin_ashi';

/** Interleaved [x, y] pairs for GL line strips / loops. */
export type LineGeometry = {
  vertices: Float32Array;
  vertexCount: number;
};

/** Interleaved [x, y] per triangle vertex (groups of 3). */
export type FillGeometry = {
  vertices: Float32Array;
  vertexCount: number;
};

export type CandleGeometryBatch = {
  bodiesUp: FillGeometry;
  bodiesDown: FillGeometry;
  wicksUp: LineGeometry;
  wicksDown: LineGeometry;
  ohlcUp: LineGeometry;
  ohlcDown: LineGeometry;
  areaFill: FillGeometry;
  areaStroke: LineGeometry;
};

const EMPTY_FILL: FillGeometry = { vertices: new Float32Array(0), vertexCount: 0 };
const EMPTY_LINE: LineGeometry = { vertices: new Float32Array(0), vertexCount: 0 };

export function createEmptyBatch(): CandleGeometryBatch {
  return {
    bodiesUp: { ...EMPTY_FILL },
    bodiesDown: { ...EMPTY_FILL },
    wicksUp: { ...EMPTY_LINE },
    wicksDown: { ...EMPTY_LINE },
    ohlcUp: { ...EMPTY_LINE },
    ohlcDown: { ...EMPTY_LINE },
    areaFill: { ...EMPTY_FILL },
    areaStroke: { ...EMPTY_LINE },
  };
}

function isCandleUp(
  candle: Candle,
  prev: Candle | null,
  settings: RequiredChartSettings['symbol'],
): boolean {
  if (settings.colorBarsByPreviousClose && prev) {
    return candle.c >= prev.c;
  }
  return candle.c >= candle.o;
}

/** CPU-side geometry for the visible candle window (mirrors Canvas drawCandles). */
export function buildCandleGeometry(
  candles: Candle[],
  vp: VisibleRange,
  chartType: CandleChartType,
  settings: RequiredChartSettings,
  theme: Theme,
): CandleGeometryBatch {
  const batch = createEmptyBatch();
  const visibleSpan = vp.endIndex - vp.startIndex;
  if (visibleSpan <= 0 || candles.length === 0) return batch;

  const pw = plotWidth(vp.width);
  const barWidth = (pw / visibleSpan) * 0.7;

  const bodyUp: number[] = [];
  const bodyDown: number[] = [];
  const wickUp: number[] = [];
  const wickDown: number[] = [];
  const ohlcUp: number[] = [];
  const ohlcDown: number[] = [];
  const areaFill: number[] = [];
  const areaStroke: number[] = [];

  const start = Math.floor(vp.startIndex);
  const end = Math.ceil(vp.endIndex);

  if (chartType === 'area') {
    let firstIdx = -1;
    for (let idx = start; idx < end; idx++) {
      if (idx < 0 || idx >= candles.length) continue;
      const candle = candles[idx];
      if (!candle) continue;
      const x = vp.xForIndex(idx);
      const y = vp.yForPrice(candle.c);
      areaStroke.push(x, y);
      if (firstIdx < 0) firstIdx = idx;
    }
    const lastDataIdx = Math.min(candles.length - 1, end - 1);
    const firstDataIdx = Math.max(0, start);
    if (lastDataIdx >= firstDataIdx && areaStroke.length >= 4) {
      const bottomY = vp.height;
      for (let i = 0; i < areaStroke.length; i += 2) {
        areaFill.push(areaStroke[i]!, areaStroke[i + 1]!);
      }
      areaFill.push(vp.xForIndex(lastDataIdx), bottomY);
      areaFill.push(vp.xForIndex(firstDataIdx), bottomY);
    }
    batch.areaFill = toFill(areaFill);
    batch.areaStroke = toLine(areaStroke);
    return batch;
  }

  for (let idx = start; idx < end; idx++) {
    if (idx < 0 || idx >= candles.length) continue;
    const candle = candles[idx];
    if (!candle) continue;
    const prev = idx > 0 ? candles[idx - 1]! : null;
    const isUp = isCandleUp(candle, prev, settings.symbol);

    const x = vp.xForIndex(idx);
    const yHigh = vp.yForPrice(candle.h);
    const yLow = vp.yForPrice(candle.l);
    const yOpen = vp.yForPrice(candle.o);
    const yClose = vp.yForPrice(candle.c);
    const wickMid = x + barWidth / 2;

    if (settings.symbol.showWicks) {
      const wickTarget = isUp ? wickUp : wickDown;
      wickTarget.push(wickMid, yHigh, wickMid, yLow);
    }

    if (chartType === 'ohlc') {
      const target = isUp ? ohlcUp : ohlcDown;
      target.push(x, yOpen, x + barWidth / 2, yOpen);
      target.push(x + barWidth / 2, yClose, x + barWidth, yClose);
      continue;
    }

    if (!settings.symbol.showBody) continue;

    const yBodyTop = Math.min(yOpen, yClose);
    const bodyH = Math.max(1, Math.abs(yOpen - yClose));
    const target = isUp ? bodyUp : bodyDown;
    pushRect(target, x, yBodyTop, barWidth, bodyH);
  }

  batch.bodiesUp = toFill(bodyUp);
  batch.bodiesDown = toFill(bodyDown);
  batch.wicksUp = toLine(wickUp);
  batch.wicksDown = toLine(wickDown);
  batch.ohlcUp = toLine(ohlcUp);
  batch.ohlcDown = toLine(ohlcDown);
  return batch;
}

function pushRect(out: number[], x: number, y: number, w: number, h: number): void {
  out.push(
    x, y,
    x + w, y,
    x, y + h,
    x + w, y,
    x + w, y + h,
    x, y + h,
  );
}

function toFill(values: number[]): FillGeometry {
  if (values.length === 0) return { ...EMPTY_FILL };
  return { vertices: new Float32Array(values), vertexCount: values.length / 2 };
}

function toLine(values: number[]): LineGeometry {
  if (values.length === 0) return { ...EMPTY_LINE };
  return { vertices: new Float32Array(values), vertexCount: values.length / 2 };
}

/** Chart types the WebGL path renders; stroke-only bodies stay on Canvas. */
export function isWebGLSupportedChartType(chartType: string): boolean {
  return (
    chartType === 'candle_solid' ||
    chartType === 'heikin_ashi' ||
    chartType === 'ohlc' ||
    chartType === 'area'
  );
}
