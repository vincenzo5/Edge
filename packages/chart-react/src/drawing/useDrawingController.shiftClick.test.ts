import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDrawingController } from './useDrawingController';
import type { Candle, SerializedDrawing, VisibleRange } from '@edge/chart-core';
import { createViewport } from '../engine/viewport';
import { hitTestAll } from '@edge/chart-core';
import type { ChartPaneHandle } from '../engine/paneHandle';

const candles: Candle[] = [
  { t: 1_000, o: 100, h: 110, l: 90, c: 105 },
  { t: 2_000, o: 105, h: 115, l: 95, c: 110 },
  { t: 3_000, o: 110, h: 120, l: 100, c: 115 },
];

function makeDeps(existing: SerializedDrawing[] = []) {
  const vp = createViewport(candles, 800, 400, 3, 0);
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
  const candlesRef = { current: candles };
  const latestVpRef = { current: vp as VisibleRange | null };
  const paneSegmentsRef = { current: [{ paneId: 'price', showTimeAxis: true, top: 0, height: 400 }] };
  const stateRef = {
    current: {
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
    displayCandlesLength: candles.length,
    stateDrawings: existing,
  };
}

describe('useDrawingController shift+click ruler', () => {
  it('arms ruler and enters placing on shift+click in empty price pane space', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useDrawingController(deps));

    let consumed = false;
    act(() => {
      consumed = result.current.handleDrawingPointer({
        phase: 'down',
        plotX: 200,
        plotY: 150,
        button: 0,
        shiftKey: true,
        paneId: 'price',
      }) as boolean;
    });

    expect(consumed).toBe(true);
    expect(result.current.activeTool).toBe('ruler');
    expect(result.current.previewDrawing?.name).toBe('ruler');
    expect(result.current.drawingMode).toBe('create');
  });

  it('does not arm ruler on shift+click when an existing drawing is hit', () => {
    const existing: SerializedDrawing = {
      id: 'd-existing',
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
    const deps = makeDeps([existing]);
    const vp = deps.latestVpRef.current!;
    let hitX = 200;
    let hitY = 150;
    for (let y = 80; y <= 320; y += 10) {
      for (let x = 80; x <= 720; x += 20) {
        if (hitTestAll(x, y, [existing], vp, candles, true)) {
          hitX = x;
          hitY = y;
          break;
        }
      }
    }
    expect(hitTestAll(hitX, hitY, [existing], vp, candles, true)).toBe('d-existing');

    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: hitX,
        plotY: hitY,
        button: 0,
        shiftKey: true,
        paneId: 'price',
      });
    });

    expect(result.current.activeTool).not.toBe('ruler');
    expect(result.current.selectedDrawingId).toBe('d-existing');
  });

  it('commits ruler after drag release on shift+click placement', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: 120,
        plotY: 120,
        button: 0,
        shiftKey: true,
        paneId: 'price',
      });
      result.current.handleDrawingPointer({
        phase: 'move',
        plotX: 320,
        plotY: 220,
        button: 0,
        shiftKey: true,
        paneId: 'price',
      });
      result.current.handleDrawingPointer({
        phase: 'up',
        plotX: 320,
        plotY: 220,
        button: 0,
        shiftKey: true,
        paneId: 'price',
      });
    });

    const committed = result.current.drawingHandleSlice.serializeDrawings();
    expect(committed).toHaveLength(1);
    expect(committed[0]?.name).toBe('ruler');
    expect(committed[0]?.points).toHaveLength(2);
  });

  it('ignores shift+click on non-price panes', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: 120,
        plotY: 120,
        button: 0,
        shiftKey: true,
        paneId: 'rsi-1',
      });
    });

    expect(result.current.previewDrawing).toBeNull();
    expect(result.current.activeTool).toBe('__cursor__');
  });
});
