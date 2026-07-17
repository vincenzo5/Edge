"use client";

import { useCallback, useRef, type RefObject } from "react";
import type { ChartHandle } from "../EdgeChart";
import {
  copyDrawings,
  hasDrawingClipboard,
  readClipboard,
} from "@/lib/chart/chartClipboard";
import {
  SnapshotCaptureError,
  buildSnapshotFilename,
  prepareSnapshotTab,
  runSnapshotAction,
  type SnapshotAction,
  type SnapshotCaptureOptions,
} from "@/lib/chart/chartSnapshot";
import type { GoToRequest } from "@/lib/chart/goTo";
import type { Candle } from "@/lib/chart/contracts";
import type { SerializedDrawing } from "@/lib/chartConfig";
import type { DrawingToolName } from "../chart-icons/toolGroups";
import type { CellConfig, PriceScaleType, ToolbarPrefs, TrackedOverlay } from "@/lib/chartConfig";
import { mergeChartSettings, patchChartSettings } from "@/lib/chartConfig";

type Params = {
  chartRef: RefObject<ChartHandle | null>;
  config: CellConfig;
  isActive: boolean;
  captureActive: boolean;
  toolbarPrefs: ToolbarPrefs;
  overlays: TrackedOverlay[];
  selectedOverlayId: string | null;
  crosshairData: {
    dataIndex: number | null;
    timestamp: number | null;
  };
  overlaysDirtyRef: RefObject<boolean>;
  setActiveTool: React.Dispatch<React.SetStateAction<string>>;
  setSelectedOverlayId: React.Dispatch<React.SetStateAction<string | null>>;
  setContextMenu: React.Dispatch<
    React.SetStateAction<{
      position: { x: number; y: number };
      items: import("../ContextMenu").ContextMenuItem[];
      header?: string;
    } | null>
  >;
  setHistoryRevision: React.Dispatch<React.SetStateAction<number>>;
  setRenameOverlayId: React.Dispatch<React.SetStateAction<string | null>>;
  onToolbarPrefsChange: (next: ToolbarPrefs) => void;
  onConfigChange: (next: CellConfig) => void;
};

export function useDrawingToolbarCommands({
  chartRef,
  config,
  isActive,
  captureActive,
  toolbarPrefs,
  overlays,
  selectedOverlayId,
  crosshairData,
  overlaysDirtyRef,
  setActiveTool,
  setSelectedOverlayId,
  setContextMenu,
  setHistoryRevision,
  setRenameOverlayId,
  onToolbarPrefsChange,
  onConfigChange,
}: Params) {
  const pasteDrawingsRef = useRef<() => void>(() => {});

  const allLocked = overlays.length > 0 && overlays.every((o) => o.locked);
  const allHidden = overlays.length > 0 && overlays.every((o) => !o.visible);

  const handlePasteDrawings = useCallback(() => {
    const payload = readClipboard();
    if (payload?.kind !== "drawings" || payload.items.length === 0) return;
    const chart = chartRef.current;
    if (!chart) return;

    const candles = chartRef.current?.getCandles() ?? [];
    const idx =
      crosshairData.dataIndex != null && crosshairData.dataIndex >= 0
        ? crosshairData.dataIndex
        : candles.length - 1;
    const candle = idx >= 0 && idx < candles.length ? candles[idx] : null;
    const timestamp =
      crosshairData.timestamp ?? candle?.t ?? candles.at(-1)?.t ?? 0;
    const value = candle?.c ?? 0;

    chart.stopDrawing();
    setActiveTool("__cursor__");
    const ids = chart.pasteDrawings(payload.items, {
      mode: "crosshair",
      timestamp,
      value,
    });
    if (ids.length > 0) {
      setSelectedOverlayId(ids[ids.length - 1] ?? null);
    }
    setContextMenu(null);
  }, [crosshairData, chartRef, setActiveTool, setSelectedOverlayId, setContextMenu]);

  pasteDrawingsRef.current = handlePasteDrawings;

  const handleToolSelect = useCallback(
    (toolName: string) => {
      if (!isActive || captureActive) return;
      setActiveTool(toolName);
      if (toolName === "__cursor__") {
        chartRef.current?.stopDrawing();
      } else {
        chartRef.current?.startDrawing(toolName);
      }
    },
    [isActive, captureActive, chartRef, setActiveTool],
  );

  const handleToggleMagnet = useCallback(
    (on: boolean) => {
      chartRef.current?.setMagnet(on);
      onToolbarPrefsChange({ ...toolbarPrefs, magnet: on });
    },
    [toolbarPrefs, onToolbarPrefsChange, chartRef],
  );

  const handleToggleKeepDrawing = useCallback(
    (on: boolean) => {
      chartRef.current?.setKeepDrawingMode(on);
      onToolbarPrefsChange({ ...toolbarPrefs, keepDrawing: on });
    },
    [toolbarPrefs, onToolbarPrefsChange, chartRef],
  );

  const handleGroupSelectionsChange = useCallback(
    (next: Record<string, DrawingToolName>) => {
      onToolbarPrefsChange({ ...toolbarPrefs, groupSelections: next });
    },
    [toolbarPrefs, onToolbarPrefsChange],
  );

  const handleToggleLockAll = useCallback(() => {
    chartRef.current?.lockAllDrawings(!allLocked);
  }, [allLocked, chartRef]);

  const handleToggleHideAll = useCallback(() => {
    chartRef.current?.setAllDrawingsVisible(allHidden);
  }, [allHidden, chartRef]);

  const handleZoomIn = useCallback(() => {
    chartRef.current?.zoomIn();
  }, [chartRef]);

  const handleClearDrawings = useCallback(() => {
    chartRef.current?.clearDrawings();
    setSelectedOverlayId(null);
    setActiveTool("__cursor__");
  }, [chartRef, setSelectedOverlayId, setActiveTool]);

  const openRenameOverlay = useCallback(
    (id: string) => {
      setRenameOverlayId(id);
      setContextMenu(null);
    },
    [setRenameOverlayId, setContextMenu],
  );

  const overlayActions = useCallback(
    () => ({
      remove: (id: string) => {
        chartRef.current?.removeOverlay(id);
        if (selectedOverlayId === id) setSelectedOverlayId(null);
        setContextMenu(null);
      },
      setVisible: (id: string, visible: boolean) => {
        chartRef.current?.setOverlayVisible(id, visible);
      },
      setLocked: (id: string, locked: boolean) => {
        chartRef.current?.setOverlayLocked(id, locked);
      },
      rename: (id: string, label: string) => {
        chartRef.current?.renameOverlay(id, label);
      },
      bringForward: (id: string) => {
        chartRef.current?.bringForward(id);
      },
      sendBackward: (id: string) => {
        chartRef.current?.sendBackward(id);
      },
      duplicate: (id: string) => {
        chartRef.current?.duplicateOverlay(id);
        setContextMenu(null);
      },
      subscribe: (cb: () => void) => chartRef.current?.subscribeOverlayChange(cb) ?? (() => {}),
    }),
    [selectedOverlayId, chartRef, setSelectedOverlayId, setContextMenu],
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedOverlayId) {
      chartRef.current?.removeOverlay(selectedOverlayId);
      setSelectedOverlayId(null);
      setContextMenu(null);
    }
  }, [selectedOverlayId, chartRef, setSelectedOverlayId, setContextMenu]);

  const handleRenameSelected = useCallback(() => {
    if (!selectedOverlayId) return;
    openRenameOverlay(selectedOverlayId);
  }, [selectedOverlayId, openRenameOverlay]);

  const handleDuplicateSelected = useCallback(() => {
    if (!selectedOverlayId) return;
    overlayActions().duplicate(selectedOverlayId);
  }, [selectedOverlayId, overlayActions]);

  const handleToggleLockSelected = useCallback(() => {
    if (!selectedOverlayId) return;
    const overlay = overlays.find((o) => o.id === selectedOverlayId);
    if (!overlay) return;
    overlayActions().setLocked(selectedOverlayId, !overlay.locked);
  }, [selectedOverlayId, overlays, overlayActions]);

  const handleCopySelected = useCallback(() => {
    if (!selectedOverlayId) return;
    const drawings = chartRef.current?.serializeDrawings() ?? [];
    const selected = drawings.filter((d) => d.id === selectedOverlayId);
    if (selected.length > 0) copyDrawings(selected);
  }, [selectedOverlayId, chartRef]);

  const chartCommands = useCallback(
    () => ({
      undo: () => {
        const did = chartRef.current?.undo() ?? false;
        if (did) setHistoryRevision((r) => r + 1);
        return did;
      },
      redo: () => {
        const did = chartRef.current?.redo() ?? false;
        if (did) setHistoryRevision((r) => r + 1);
        return did;
      },
      canUndo: () => chartRef.current?.canUndo() ?? false,
      canRedo: () => chartRef.current?.canRedo() ?? false,
      goTo: (req: GoToRequest) =>
        chartRef.current?.goTo(req) ??
        Promise.resolve({ ok: false as const, reason: "no_chart" as const }),
      zoomIn: () => chartRef.current?.zoomIn(),
      resetChartView: () => chartRef.current?.resetChartView(),
      getCandles: () => chartRef.current?.getCandles() ?? ([] as Candle[]),
      selectDrawing: (id: string | null) => chartRef.current?.selectDrawing(id),
      getSelectedDrawingId: () => chartRef.current?.getSelectedDrawingId() ?? null,
      updateDrawingStyles: (
        id: string,
        patch: Parameters<NonNullable<typeof chartRef.current>["updateDrawingStyles"]>[1],
      ) => chartRef.current?.updateDrawingStyles(id, patch),
      restoreDrawings: (data: SerializedDrawing[]) => chartRef.current?.restoreDrawings(data),
      canCaptureSnapshot: () => chartRef.current?.canCaptureSnapshot() ?? false,
      captureSnapshot: (opts?: SnapshotCaptureOptions) => {
        const chart = chartRef.current;
        if (!chart?.canCaptureSnapshot()) {
          return Promise.reject(new SnapshotCaptureError("no_data"));
        }
        return chart.captureSnapshot(opts);
      },
    }),
    [chartRef, setHistoryRevision],
  );

  const drawingToolbarActions = useCallback(
    () => ({
      selectTool: handleToolSelect,
      clearDrawings: handleClearDrawings,
      toggleLockAll: handleToggleLockAll,
      toggleHideAll: handleToggleHideAll,
      toggleMagnet: handleToggleMagnet,
      toggleKeepDrawing: handleToggleKeepDrawing,
      deleteSelected: handleDeleteSelected,
      zoomIn: handleZoomIn,
    }),
    [
      handleToolSelect,
      handleClearDrawings,
      handleToggleLockAll,
      handleToggleHideAll,
      handleToggleMagnet,
      handleToggleKeepDrawing,
      handleDeleteSelected,
      handleZoomIn,
    ],
  );

  const drawingCommands = useCallback(
    () => ({
      hasSelection: () => selectedOverlayId != null,
      deleteSelected: handleDeleteSelected,
      duplicateSelected: handleDuplicateSelected,
      renameSelected: handleRenameSelected,
      toggleLockSelected: handleToggleLockSelected,
      copySelected: handleCopySelected,
      pasteDrawings: () => pasteDrawingsRef.current(),
      canPaste: () => hasDrawingClipboard(),
    }),
    [
      selectedOverlayId,
      handleDeleteSelected,
      handleDuplicateSelected,
      handleRenameSelected,
      handleToggleLockSelected,
      handleCopySelected,
    ],
  );

  const runCellSnapshot = useCallback(
    async (action: SnapshotAction) => {
      const chart = chartRef.current;
      if (!chart?.canCaptureSnapshot()) return;
      const filename = buildSnapshotFilename(config.symbol, config.interval);
      const targetWindow = action === "open" ? prepareSnapshotTab() : undefined;
      try {
        const blob = await chart.captureSnapshot({ includeCrosshair: false });
        await runSnapshotAction(action, blob, filename, targetWindow);
      } catch (error) {
        if (error instanceof SnapshotCaptureError) {
          console.warn(error.reason);
        }
      }
    },
    [config.symbol, config.interval, chartRef],
  );

  const applyPriceScaleType = useCallback(
    (type: PriceScaleType) => {
      const patched = patchChartSettings(config.chartSettings, {
        scales: { priceScaleType: type },
      });
      const merged = mergeChartSettings(patched);
      onConfigChange({ ...config, chartSettings: patched });
      chartRef.current?.resetPriceScaleWindow(merged);
      setContextMenu(null);
    },
    [config, onConfigChange, chartRef, setContextMenu],
  );

  return {
    allLocked,
    allHidden,
    handleToolSelect,
    handleDrawingDisarmed: () => setActiveTool("__cursor__"),
    handleToggleMagnet,
    handleToggleKeepDrawing,
    handleGroupSelectionsChange,
    handleToggleLockAll,
    handleToggleHideAll,
    handleZoomIn,
    handleClearDrawings,
    handlePasteDrawings,
    overlayActions,
    chartCommands,
    drawingToolbarActions,
    drawingCommands,
    runCellSnapshot,
    openRenameOverlay,
    handleDeleteSelected,
    applyPriceScaleType,
  };
}
