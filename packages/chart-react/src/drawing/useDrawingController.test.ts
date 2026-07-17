import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toClipboardItem } from '@edge/chart-core/drawingClone';
import { useDrawingController } from './useDrawingController';
import {
  makeDrawingControllerDeps,
  findHitOnDrawing,
  sampleTrendLine,
} from './useDrawingController.testHelpers';

describe('useDrawingController pointer interactions', () => {
  it('selects a drawing on pointer down when hit', () => {
    const existing = sampleTrendLine();
    const deps = makeDrawingControllerDeps([existing]);
    const vp = deps.latestVpRef.current!;
    const hit = findHitOnDrawing(existing, vp);
    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: hit.x,
        plotY: hit.y,
        button: 0,
        paneId: 'price',
      });
    });

    expect(result.current.selectedDrawingId).toBe('d-trend');
    expect(result.current.drawingMode).toBe('edit');
  });

  it('deselects when clicking empty space while selected', () => {
    const existing = sampleTrendLine();
    const deps = makeDrawingControllerDeps([existing]);
    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.drawingHandleSlice.selectDrawing('d-trend');
    });
    expect(result.current.selectedDrawingId).toBe('d-trend');

    act(() => {
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: 50,
        plotY: 50,
        button: 0,
        paneId: 'price',
      });
    });

    expect(result.current.selectedDrawingId).toBeNull();
  });

  it('cancels placing on Escape and clears preview', () => {
    const deps = makeDrawingControllerDeps();
    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.drawingHandleSlice.startDrawing('trend_line');
    });
    act(() => {
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: 120,
        plotY: 120,
        button: 0,
        paneId: 'price',
      });
    });
    expect(result.current.previewDrawing).not.toBeNull();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(result.current.previewDrawing).toBeNull();
    expect(result.current.drawingMode).toBe('create');
    expect(result.current.activeTool).toBe('trend_line');
  });

  it('commits risk_ruler on double-click finish during placing', () => {
    const deps = makeDrawingControllerDeps();
    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.drawingHandleSlice.startDrawing('risk_ruler');
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: 120,
        plotY: 120,
        button: 0,
        paneId: 'price',
      });
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: 280,
        plotY: 200,
        button: 0,
        detail: 2,
        paneId: 'price',
      });
    });

    const drawings = result.current.drawingHandleSlice.serializeDrawings();
    expect(drawings).toHaveLength(1);
    expect(drawings[0]?.name).toBe('risk_ruler');
    expect(drawings[0]?.points.length).toBeGreaterThanOrEqual(2);
  });
});

describe('useDrawingController facade commands', () => {
  it('undo removes a committed drawing and redo restores it', () => {
    const deps = makeDrawingControllerDeps();
    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.drawingHandleSlice.startDrawing('horizontal_line');
      result.current.handleDrawingPointer({
        phase: 'down',
        plotX: 200,
        plotY: 150,
        button: 0,
        paneId: 'price',
      });
    });
    expect(result.current.drawingHandleSlice.serializeDrawings()).toHaveLength(1);
    expect(result.current.drawingHandleSlice.canUndo()).toBe(true);

    act(() => {
      result.current.drawingHandleSlice.undo();
    });
    expect(result.current.drawingHandleSlice.serializeDrawings()).toHaveLength(0);
    expect(result.current.drawingHandleSlice.canRedo()).toBe(true);

    act(() => {
      result.current.drawingHandleSlice.redo();
    });
    expect(result.current.drawingHandleSlice.serializeDrawings()).toHaveLength(1);
  });

  it('pasteDrawings adds cloned drawings with new ids', () => {
    const existing = sampleTrendLine('d-src');
    const deps = makeDrawingControllerDeps([existing]);
    const { result } = renderHook(() => useDrawingController(deps));

    const item = toClipboardItem(existing);
    let pastedIds: string[] = [];
    act(() => {
      pastedIds = result.current.drawingHandleSlice.pasteDrawings([item], {
        mode: 'offset',
        deltaTimestamp: 1_000,
        deltaValueRatio: 0,
      });
    });

    expect(pastedIds).toHaveLength(1);
    expect(pastedIds[0]).not.toBe('d-src');
    const all = result.current.drawingHandleSlice.serializeDrawings();
    expect(all).toHaveLength(2);
  });

  it('bringForward swaps z-order with the next drawing', () => {
    const low = { ...sampleTrendLine('d-low'), zLevel: 0 };
    const high = { ...sampleTrendLine('d-high'), zLevel: 1 };
    const deps = makeDrawingControllerDeps([low, high]);
    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.drawingHandleSlice.bringForward('d-low');
    });

    const sorted = result.current.drawingHandleSlice
      .serializeDrawings()
      .sort((a, b) => a.zLevel - b.zLevel);
    expect(sorted[0]?.id).toBe('d-high');
    expect(sorted[1]?.id).toBe('d-low');
  });

  it('stopDrawing disarms the active tool', () => {
    const deps = makeDrawingControllerDeps();
    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.drawingHandleSlice.startDrawing('trend_line');
    });
    expect(result.current.activeTool).toBe('trend_line');

    act(() => {
      result.current.drawingHandleSlice.stopDrawing();
    });
    expect(result.current.activeTool).toBe('__cursor__');
  });

  it('clearDrawings removes all overlays and disarms', () => {
    const deps = makeDrawingControllerDeps([sampleTrendLine()]);
    const { result } = renderHook(() => useDrawingController(deps));

    act(() => {
      result.current.drawingHandleSlice.startDrawing('trend_line');
      result.current.drawingHandleSlice.clearDrawings();
    });

    expect(result.current.drawingHandleSlice.serializeDrawings()).toHaveLength(0);
    expect(result.current.activeTool).toBe('__cursor__');
    expect(result.current.selectedDrawingId).toBeNull();
  });
});
