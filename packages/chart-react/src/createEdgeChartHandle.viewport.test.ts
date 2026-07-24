import { describe, expect, it, vi } from "vitest";
import { createEdgeChartHandle } from "./createEdgeChartHandle";
import type { ChartPaneHandle } from "./engine/paneHandle";

describe("createEdgeChartHandle applyViewportSnapshot", () => {
  it("delegates to price pane and syncs siblings", () => {
    const syncSiblings = vi.fn();
    const applied = {
      startIndex: 10,
      endIndex: 80,
      priceMin: 90,
      priceMax: 110,
      priceScaleMode: "manual" as const,
    };
    const applyViewportSnapshot = vi.fn(() => applied);
    const subSync = vi.fn();

    const paneHandles = new Map<string, ChartPaneHandle>([
      [
        "price",
        {
          paneId: "price",
          syncTimeWindow: vi.fn(),
          applyWheelAction: vi.fn(),
          getViewport: vi.fn(),
          resetViewport: vi.fn(),
          resetPriceScale: vi.fn(),
          navigateToViewport: vi.fn(),
          applyViewportSnapshot,
          isViewportModified: vi.fn(),
        },
      ],
      [
        "rsi",
        {
          paneId: "rsi",
          syncTimeWindow: subSync,
          applyWheelAction: vi.fn(),
          getViewport: vi.fn(),
          resetViewport: vi.fn(),
          resetPriceScale: vi.fn(),
          navigateToViewport: vi.fn(),
          isViewportModified: vi.fn(),
        },
      ],
    ]);

    const syncSiblingsRef = { current: syncSiblings };
    const paneHandlesRef = { current: paneHandles };

    const handle = createEdgeChartHandle({
      stateRef: { current: { chartType: "candle_solid", indicators: [], drawings: [] } as any },
      dragHeightsRef: { current: null },
      drawingsRef: { current: [] },
      paneHandlesRef,
      chartAreaRef: { current: null },
      baseCandlesRef: { current: [] },
      candlesRef: { current: [] },
      crosshairCbsRef: { current: new Set() },
      syncSiblingsRef,
      goToImplRef: { current: async () => ({ ok: false as const, reason: "no_data" as const }) },
      setDims: vi.fn(),
      hydrateDrawings: vi.fn(),
      onStateChangeRef: { current: undefined },
      applyCrosshairFromSync: vi.fn(),
      drawingHandleSlice: {
        serializeDrawings: () => [],
        startDrawing: vi.fn(),
        stopDrawing: vi.fn(),
        clearDrawings: vi.fn(),
        setMagnet: vi.fn(),
        restoreDrawings: vi.fn(),
        getTrackedOverlays: () => [],
        removeOverlay: vi.fn(),
        setOverlayVisible: vi.fn(),
        setOverlayLocked: vi.fn(),
        renameOverlay: vi.fn(),
        duplicateOverlay: vi.fn(),
        pasteDrawings: vi.fn(),
        bringForward: vi.fn(),
        sendBackward: vi.fn(),
        subscribeOverlayChange: vi.fn(() => () => {}),
        getSelectedDrawingId: vi.fn(),
        selectDrawing: vi.fn(),
        onSelectionChange: vi.fn(() => () => {}),
        getMagnetEnabled: vi.fn(),
        setKeepDrawingMode: vi.fn(),
        getKeepDrawingMode: vi.fn(),
        lockAllDrawings: vi.fn(),
        areAllDrawingsLocked: vi.fn(),
        setAllDrawingsVisible: vi.fn(),
        areAllDrawingsHidden: vi.fn(),
        updateDrawingStyles: vi.fn(),
        updateDrawingMetadata: vi.fn(),
        undo: vi.fn(),
        redo: vi.fn(),
        canUndo: vi.fn(),
        canRedo: vi.fn(),
        getDrawingScreenBounds: vi.fn(),
      },
    });

    const ok = handle.applyViewportSnapshot({
      startIndex: 10,
      endIndex: 80,
      priceMin: 90,
      priceMax: 110,
      priceScaleMode: "manual",
    });

    expect(ok).toBe(true);
    expect(applyViewportSnapshot).toHaveBeenCalledOnce();
    expect(syncSiblings).toHaveBeenCalledWith(10, 80, "price");
  });
});
