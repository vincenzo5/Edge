import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { SerializedDrawing } from '@edge/chart-core';
import { DrawingRegistry, hitTestControlPoint } from '@edge/chart-core/pluginHost';
import { yForPricePlot, translateDrawingPoints, MAGNET_THRESHOLD_PX } from '@edge/chart-core/drawingCoords';
import { POSITION_CP } from '@edge/chart-core/drawings/positionGeometry';
import { useDrawingController } from './useDrawingController';
import {
  makeDrawingControllerDeps,
  sampleTrendLine,
  testCandles,
} from './useDrawingController.testHelpers';

async function flushDragRaf() {
  await act(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
}

describe('applyDrawingPointerTransition CP drag magnet', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('snaps control-point drag to nearest OHLC when magnet is on', async () => {
    const existing = sampleTrendLine();
    const deps = makeDrawingControllerDeps([existing]);
    const vp = deps.latestVpRef.current!;
    const plugin = DrawingRegistry.get('trend_line');
    const cps = plugin!.getControlPoints!(existing, vp, testCandles, true);
    const cp1 = cps[1]!;

    const candle = testCandles[2]!;
    const highY = yForPricePlot(candle.h, vp, true);
    const plotX = vp.xForIndex(2);

    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.drawingHandleSlice.selectDrawing('d-trend');
      result.current.drawingHandleSlice.setMagnet(true);
    });

    act(() => {
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: cp1.x,
        plotY: cp1.y,
        button: 0,
        paneId: 'price',
      });
      result.current.handleDrawingPointer({
        phase: 'move',
        plotX,
        plotY: highY + 2,
        button: 0,
        paneId: 'price',
      });
    });

    await flushDragRaf();

    const drawings = result.current.drawingHandleSlice.serializeDrawings();
    expect(drawings[0]?.points[1]?.value).toBe(candle.h);
  });

  it('does not snap control-point drag to OHLC when magnet is off', async () => {
    const existing = sampleTrendLine();
    const deps = makeDrawingControllerDeps([existing]);
    const vp = deps.latestVpRef.current!;
    const plugin = DrawingRegistry.get('trend_line');
    const cps = plugin!.getControlPoints!(existing, vp, testCandles, true);
    const cp1 = cps[1]!;

    const candle = testCandles[2]!;
    const highY = yForPricePlot(candle.h, vp, true);
    const plotX = vp.xForIndex(2);
    const plotY = highY + MAGNET_THRESHOLD_PX + 10;

    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.drawingHandleSlice.selectDrawing('d-trend');
      result.current.drawingHandleSlice.setMagnet(false);
    });

    act(() => {
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: cp1.x,
        plotY: cp1.y,
        button: 0,
        paneId: 'price',
      });
      result.current.handleDrawingPointer({
        phase: 'move',
        plotX,
        plotY,
        button: 0,
        paneId: 'price',
      });
    });

    await flushDragRaf();

    const drawings = result.current.drawingHandleSlice.serializeDrawings();
    expect(drawings[0]?.points[1]?.value).not.toBe(candle.h);
    expect(drawings[0]?.points[1]?.value).toBeCloseTo(
      vp.priceForY(plotY),
      4,
    );
  });
});

function sampleLongPosition(id = 'd-long'): SerializedDrawing {
  return {
    id,
    name: 'long_position',
    label: 'Long',
    points: [
      { timestamp: 1_000, value: 100, dataIndex: 0 },
      { timestamp: 1_000, value: 95, dataIndex: 0 },
      { timestamp: 1_000, value: 110, dataIndex: 0 },
      { timestamp: 3_000, value: 100, dataIndex: 2 },
    ],
    visible: true,
    locked: false,
    zLevel: 1,
    paneId: 'price',
  };
}

describe('applyDrawingPointerTransition position magnet', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('whole-drag snaps entry to nearest OHLC and preserves stop/target offsets', async () => {
    const existing = sampleLongPosition();
    const deps = makeDrawingControllerDeps([existing]);
    const vp = deps.latestVpRef.current!;
    const plugin = DrawingRegistry.get('long_position');
    const cps = plugin!.getControlPoints!(existing, vp, testCandles, true);
    const bodyX = (cps[1]!.x + cps[3]!.x) / 2;
    const bodyY = cps[1]!.y;
    expect(hitTestControlPoint(bodyX, bodyY, existing, vp, testCandles, true)).toBe(-1);

    const candle = testCandles[2]!;
    const highY = yForPricePlot(candle.h, vp, true);
    const plotX = vp.xForIndex(2);

    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.drawingHandleSlice.selectDrawing('d-long');
      result.current.drawingHandleSlice.setMagnet(true);
    });

    act(() => {
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: bodyX,
        plotY: bodyY,
        button: 0,
        paneId: 'price',
      });
    });

    act(() => {
      result.current.handleDrawingPointer({
        phase: 'move',
        plotX,
        plotY: highY,
        button: 0,
        paneId: 'price',
      });
    });

    await flushDragRaf();

    const drawings = result.current.drawingHandleSlice.serializeDrawings();
    const expected = translateDrawingPoints(
      existing.points,
      { x: bodyX, y: bodyY },
      { x: plotX, y: highY },
      vp,
      testCandles,
      { magnet: true, magnetAnchorIndex: 0, showTimeAxis: true },
    );
    expect(drawings[0]?.points[0]?.value).toBe(expected[0]?.value);
    expect(drawings[0]?.points[0]?.dataIndex).toBe(expected[0]?.dataIndex);
    expect(drawings[0]?.points[1]?.value).toBeCloseTo(expected[1]?.value ?? 0, 4);
    expect(drawings[0]?.points[2]?.value).toBeCloseTo(expected[2]?.value ?? 0, 4);
    expect([candle.o, candle.h, candle.l, candle.c]).toContain(drawings[0]?.points[0]?.value);
  });

  it('stop handle drag snaps only stop to nearest OHLC', async () => {
    const existing = sampleLongPosition();
    const deps = makeDrawingControllerDeps([existing]);
    const vp = deps.latestVpRef.current!;
    const plugin = DrawingRegistry.get('long_position');
    const cps = plugin!.getControlPoints!(existing, vp, testCandles, true);
    const stopCp = cps[POSITION_CP.STOP]!;

    const candle = testCandles[1]!;
    const lowY = yForPricePlot(candle.l, vp, true);
    const plotX = vp.xForIndex(1);

    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.drawingHandleSlice.selectDrawing('d-long');
      result.current.drawingHandleSlice.setMagnet(true);
    });

    act(() => {
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: stopCp.x,
        plotY: stopCp.y,
        button: 0,
        paneId: 'price',
      });
      result.current.handleDrawingPointer({
        phase: 'move',
        plotX,
        plotY: lowY + 2,
        button: 0,
        paneId: 'price',
      });
    });

    await flushDragRaf();

    const drawings = result.current.drawingHandleSlice.serializeDrawings();
    expect(drawings[0]?.points[1]?.value).toBe(candle.l);
    expect(drawings[0]?.points[1]?.value).toBeLessThan(drawings[0]?.points[0]?.value!);
    expect(drawings[0]?.points[0]?.value).toBe(100);
    expect(drawings[0]?.points[2]?.value).toBe(110);
    expect(drawings[0]?.points[0]?.timestamp).toBe(1_000);
    expect(drawings[0]?.points[1]?.timestamp).toBe(1_000);
    expect(drawings[0]?.points[2]?.timestamp).toBe(1_000);
  });

  it('target handle drag snaps target to cursor-candle OHLC without moving left edge', async () => {
    const existing = sampleLongPosition();
    const deps = makeDrawingControllerDeps([existing]);
    const vp = deps.latestVpRef.current!;
    const plugin = DrawingRegistry.get('long_position');
    const cps = plugin!.getControlPoints!(existing, vp, testCandles, true);
    const targetCp = cps[POSITION_CP.TARGET]!;

    const candle = testCandles[2]!;
    const highY = yForPricePlot(candle.h, vp, true);
    const plotX = vp.xForIndex(2);

    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.drawingHandleSlice.selectDrawing('d-long');
      result.current.drawingHandleSlice.setMagnet(true);
    });

    act(() => {
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: targetCp.x,
        plotY: targetCp.y,
        button: 0,
        paneId: 'price',
      });
      result.current.handleDrawingPointer({
        phase: 'move',
        plotX,
        plotY: highY + 2,
        button: 0,
        paneId: 'price',
      });
    });

    await flushDragRaf();

    const drawings = result.current.drawingHandleSlice.serializeDrawings();
    expect(drawings[0]?.points[2]?.value).toBe(candle.h);
    expect(drawings[0]?.points[0]?.timestamp).toBe(1_000);
    expect(drawings[0]?.points[0]?.dataIndex).toBe(0);
    expect(drawings[0]?.points[1]?.value).toBe(95);
  });

  it('entry-left handle drag with magnet snaps price only and keeps left edge', async () => {
    const existing = sampleLongPosition();
    const deps = makeDrawingControllerDeps([existing]);
    const vp = deps.latestVpRef.current!;
    const plugin = DrawingRegistry.get('long_position');
    const cps = plugin!.getControlPoints!(existing, vp, testCandles, true);
    const entryCp = cps[POSITION_CP.ENTRY_LEFT]!;

    const candle = testCandles[2]!;
    const highY = yForPricePlot(candle.h, vp, true);
    const plotX = vp.xForIndex(2);

    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.drawingHandleSlice.selectDrawing('d-long');
      result.current.drawingHandleSlice.setMagnet(true);
    });

    act(() => {
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: entryCp.x,
        plotY: entryCp.y,
        button: 0,
        paneId: 'price',
      });
      result.current.handleDrawingPointer({
        phase: 'move',
        plotX,
        plotY: highY + 2,
        button: 0,
        paneId: 'price',
      });
    });

    await flushDragRaf();

    const drawings = result.current.drawingHandleSlice.serializeDrawings();
    expect(drawings[0]?.points[0]?.value).toBe(candle.h);
    expect(drawings[0]?.points[0]?.timestamp).toBe(1_000);
    expect(drawings[0]?.points[0]?.dataIndex).toBe(0);
    expect(drawings[0]?.points[3]?.timestamp).toBe(3_000);
  });

  it('entry-left handle drag without magnet still moves left edge horizontally', async () => {
    const existing = sampleLongPosition();
    const deps = makeDrawingControllerDeps([existing]);
    const vp = deps.latestVpRef.current!;
    const plugin = DrawingRegistry.get('long_position');
    const cps = plugin!.getControlPoints!(existing, vp, testCandles, true);
    const entryCp = cps[POSITION_CP.ENTRY_LEFT]!;

    const plotX = vp.xForIndex(2);
    const plotY = entryCp.y;

    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.drawingHandleSlice.selectDrawing('d-long');
      result.current.drawingHandleSlice.setMagnet(false);
    });

    act(() => {
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: entryCp.x,
        plotY: entryCp.y,
        button: 0,
        paneId: 'price',
      });
      result.current.handleDrawingPointer({
        phase: 'move',
        plotX,
        plotY,
        button: 0,
        paneId: 'price',
      });
    });

    await flushDragRaf();

    const drawings = result.current.drawingHandleSlice.serializeDrawings();
    expect(drawings[0]?.points[0]?.timestamp).toBe(testCandles[2]!.t);
    expect(drawings[0]?.points[0]?.dataIndex).toBe(2);
  });
});
