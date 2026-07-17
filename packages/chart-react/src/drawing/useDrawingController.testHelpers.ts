import type { Candle, SerializedDrawing, VisibleRange } from '@edge/chart-core';
import { hitTestAll } from '@edge/chart-core';
import { createViewport } from '../engine/viewport';
import type { ChartPaneHandle } from '../engine/paneHandle';
import type { DrawingControllerDeps } from './useDrawingController';

export const testCandles: Candle[] = [
  { t: 1_000, o: 100, h: 110, l: 90, c: 105 },
  { t: 2_000, o: 105, h: 115, l: 95, c: 110 },
  { t: 3_000, o: 110, h: 120, l: 100, c: 115 },
];

export function makeDrawingControllerDeps(
  existing: SerializedDrawing[] = [],
): DrawingControllerDeps {
  const vp = createViewport(testCandles, 800, 400, 3, 0);
  const paneHandlesRef = {
    current: new Map<string, ChartPaneHandle>([
      [
        'price',
        {
          getViewport: () => vp,
        } as ChartPaneHandle,
      ],
    ]),
  };
  const candlesRef = { current: testCandles };
  const latestVpRef = { current: vp as VisibleRange | null };
  const paneSegmentsRef = {
    current: [{ paneId: 'price', showTimeAxis: true, top: 0, height: 400 }],
  };
  const stateRef = {
    current: {
      version: 1 as const,
      chartType: 'candle_solid' as const,
      indicators: [],
      drawings: existing,
      chartSettings: {},
    },
  };
  const overlayChangeCbsRef = { current: new Set<() => void>() };

  return {
    paneHandlesRef,
    candlesRef,
    latestVpRef,
    paneSegmentsRef,
    stateRef,
    overlayChangeCbsRef,
    loading: false,
    error: null,
    displayCandlesLength: testCandles.length,
    stateDrawings: existing,
  };
}

export function findHitOnDrawing(
  drawing: SerializedDrawing,
  vp: VisibleRange,
  candles: Candle[] = testCandles,
): { x: number; y: number } {
  let hitX = 200;
  let hitY = 150;
  for (let y = 80; y <= 320; y += 10) {
    for (let x = 80; x <= 720; x += 20) {
      if (hitTestAll(x, y, [drawing], vp, candles, true)) {
        return { x, y };
      }
    }
  }
  return { x: hitX, y: hitY };
}

export function sampleTrendLine(id = 'd-trend'): SerializedDrawing {
  return {
    id,
    name: 'trend_line',
    label: 'Trend Line',
    points: [
      { timestamp: 1_000, value: 100, dataIndex: 0 },
      { timestamp: 3_000, value: 115, dataIndex: 2 },
    ],
    visible: true,
    locked: false,
    zLevel: 1,
    paneId: 'price',
  };
}
