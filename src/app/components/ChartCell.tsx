"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EdgeChart, { type ChartHandle, indicatorKey } from "./EdgeChart";
import DrawingToolbar, { resolveGroupSelections } from "./DrawingToolbar";
import BarReplay from "./BarReplay";
import IndicatorPicker from "./IndicatorPicker";
import IndicatorSettingsModal from "./IndicatorSettingsModal";
import DrawingSettingsModal from "./DrawingSettingsModal";
import DrawingSelectionToolbar from "./DrawingSelectionToolbar";
import ChartSettingsModal from "./ChartSettingsModal";
import ChartGoToModal from "./ChartGoToModal";
import ChartRangeBar from "./ChartRangeBar";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";
import { buildChartContextMenuItems, buildPriceScaleContextMenuItems } from "./chartContextMenu";
import { useChartSync } from "./ChartSyncContext";
import { useActiveChartBridge } from "./ActiveChartContext";
import { useSidebarOptional } from "./SidebarContext";
import type { Candle, DrawingStyles } from "@/lib/chart/contracts";
import type { GoToRequest } from "@/lib/chart/goTo";
import {
  PRICE_PANE_KEY,
  createIndicatorInstance,
  mergeChartSettings,
  patchChartSettings,
  serializeChartSettings,
  type CellConfig,
  type RequiredChartSettings,
  type PriceScaleType,
  type IndicatorConfig,
  type ToolbarPrefs,
  type TrackedOverlay,
  type SerializedDrawing,
} from "@/lib/chartConfig";
import type { Range } from "@/lib/chart/contracts";
import type { ChartTimeZone } from "@/lib/chart/timeZone";
import { applyRangePresetSelect } from "@/lib/chart/rangePresetTransition";
import { getCatalogMeta } from "@/lib/chart/indicators/catalog";
import type { DrawingToolName } from "./chart-icons/toolGroups";
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
} from "@/lib/chart/chartSnapshot";
import TemplatePickerModal from "./TemplatePickerModal";
import { applyChartTemplate, applyStudyTemplate } from "@/lib/chart/presets/apply";
import {
  chartTemplateFromCell,
  studyTemplateFromIndicator,
  type PresetEnvelope,
} from "@/lib/chart/presets/types";
import {
  createChartPreset,
  createStudyPreset,
  listPresetsByKind,
  savePreset,
} from "@/lib/presetStorage";
import { getShortcutLabel } from "@/lib/shortcuts/formatShortcutLabel";

type ChartTemplatePreset = Extract<PresetEnvelope, { kind: "chart" }>;

type Props = {
  chartId: string;
  config: CellConfig;
  theme: "light" | "dark";
  compact?: boolean;
  isActive?: boolean;
  toolbarPrefs: ToolbarPrefs;
  onFocus?: () => void;
  onConfigChange: (next: CellConfig) => void;
  onToolbarPrefsChange: (next: ToolbarPrefs) => void;
  onCandleCount?: (n: number) => void;
};

export default function ChartCell({
  chartId,
  config,
  theme,
  compact = false,
  isActive = true,
  toolbarPrefs,
  onFocus,
  onConfigChange,
  onToolbarPrefsChange,
  onCandleCount,
}: Props) {
  const chartRef = useRef<ChartHandle>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [candleCount, setCandleCount] = useState(0);
  const displayCandlesRef = useRef<Candle[]>([]);
  const [candlesRevision, setCandlesRevision] = useState(0);
  const [lastCandleTimestamp, setLastCandleTimestamp] = useState<number | null>(null);
  const [crosshairData, setCrosshairData] = useState<{
    dataIndex: number | null;
    timestamp: number | null;
    valueLabel: string | null;
  }>({ dataIndex: null, timestamp: null, valueLabel: null });
  const crosshairRafRef = useRef<number | null>(null);
  const pendingCrosshairRef = useRef<{
    dataIndex: number | null;
    timestamp: number | null;
    valueLabel: string | null;
  } | null>(null);
  const [settingsIndicatorId, setSettingsIndicatorId] = useState<string | null>(null);
  const [settingsOverlayId, setSettingsOverlayId] = useState<string | null>(null);
  const [chartSettingsOpen, setChartSettingsOpen] = useState(false);
  const [chartSettingsSection, setChartSettingsSection] = useState<
    "symbol" | "status" | "scales" | "canvas" | "trading"
  >("status");
  const [goToOpen, setGoToOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templatePickerTab, setTemplatePickerTab] = useState<"chart" | "study">("chart");
  const [templateRevision, setTemplateRevision] = useState(0);
  const [overlays, setOverlays] = useState<TrackedOverlay[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    items: ContextMenuItem[];
    header?: string;
  } | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [toolbarDragOffset, setToolbarDragOffset] = useState({ x: 0, y: 0 });
  const [drawingToolbarBounds, setDrawingToolbarBounds] = useState<{
    width: number;
    height: number;
  }>({ width: 800, height: 400 });
  const chartOverlayRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState("__cursor__");
  const [replayActive, setReplayActive] = useState(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  const overlaysDirtyRef = useRef(false);
  const sync = useChartSync();
  const activeChartBridge = useActiveChartBridge();
  const sidebar = useSidebarOptional();

  const magnet = toolbarPrefs.magnet ?? false;
  const keepDrawing = toolbarPrefs.keepDrawing ?? false;
  const groupSelections = resolveGroupSelections(
    toolbarPrefs.groupSelections as Record<string, DrawingToolName> | undefined,
  );
  const chartTemplates = useMemo(
    () =>
      listPresetsByKind("chart").filter(
        (preset): preset is ChartTemplatePreset => preset.kind === "chart",
      ),
    [chartSettingsOpen, templatePickerOpen, templateRevision],
  );

  // Pane layout state derived from persisted config (paneOrder, collapsedPanes, maximizedPane).
  // This replaces previous local-only state so changes survive reloads.
  const collapsedKeys = new Set(config.collapsedPanes ?? []);
  const maximizedKey = config.maximizedPane ?? null;
  const paneOrder = config.paneOrder ?? [];

  // Subscribe to overlay changes from the Chart ref.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const unsub = chart.subscribeOverlayChange(() => {
      setOverlays(chart.getTrackedOverlays());
      overlaysDirtyRef.current = true;
      setHistoryRevision((r) => r + 1);
    });
    const unsubSel = chart.onSelectionChange?.((id) => {
      setSelectedOverlayId(id);
    });
    setOverlays(chart.getTrackedOverlays());
    return () => {
      unsub();
      unsubSel?.();
    };
  }, []);

  // Persist drawings to config when overlays change.
  useEffect(() => {
    if (!overlaysDirtyRef.current) return;
    overlaysDirtyRef.current = false;
    const timer = setTimeout(() => {
      const drawings = chartRef.current?.serializeDrawings();
      if (drawings) {
        onConfigChange({ ...config, drawings: drawings ?? [] });
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlays]);

  // Apply layout toolbar prefs to the chart when active or prefs change.
  useEffect(() => {
    if (!isActive) return;
    chartRef.current?.setMagnet(magnet);
    chartRef.current?.setKeepDrawingMode(keepDrawing);
  }, [isActive, magnet, keepDrawing]);

  // Disarm drawing tools when this cell loses focus.
  useEffect(() => {
    if (isActive) return;
    chartRef.current?.stopDrawing();
    setActiveTool('__cursor__');
  }, [isActive]);

  const pasteDrawingsRef = useRef<() => void>(() => {});

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
      setSelectedOverlayId(ids[ids.length - 1]);
    }
    setContextMenu(null);
  }, [crosshairData]);

  pasteDrawingsRef.current = handlePasteDrawings;

  const allLocked =
    overlays.length > 0 && overlays.every((o) => o.locked);
  const allHidden =
    overlays.length > 0 && overlays.every((o) => !o.visible);

  const update = useCallback(
    (patch: Partial<CellConfig>) => {
      onConfigChange({ ...config, ...patch });
    },
    [config, onConfigChange],
  );

  const handleRangeSelect = useCallback(
    (range: Range) => {
      onConfigChange(applyRangePresetSelect(config, range));
    },
    [config, onConfigChange],
  );

  const handleTimeZoneChange = useCallback(
    (timeZone: ChartTimeZone) => {
      onConfigChange({
        ...config,
        chartSettings: patchChartSettings(config.chartSettings, {
          symbol: { timeZone },
        }),
      });
    },
    [config, onConfigChange],
  );

  useEffect(() => {
    if (!replayActive) {
      setVisibleCount(null);
    }
  }, [replayActive]);

  const chartSettingsMerged = useMemo(
    () => mergeChartSettings(config.chartSettings),
    [config.chartSettings],
  );

  const canUndo =
    isActive &&
    typeof chartRef.current?.canUndo === 'function' &&
    chartRef.current.canUndo();
  const canRedo =
    isActive &&
    typeof chartRef.current?.canRedo === 'function' &&
    chartRef.current.canRedo();
  void historyRevision;

  const addIndicator = useCallback(
    (ind: Pick<IndicatorConfig, "name" | "pane">) => {
      update({
        indicators: [...config.indicators, createIndicatorInstance(ind.name, ind.pane)],
      });
    },
    [config.indicators, update],
  );

  const removeIndicator = useCallback(
    (id: string) => {
      update({
        indicators: config.indicators.filter((i) => i.id !== id),
      });
    },
    [config.indicators, update],
  );

  const handleToolSelect = useCallback((toolName: string) => {
    if (!isActive) return;
    setActiveTool(toolName);
    if (toolName === "__cursor__") {
      chartRef.current?.stopDrawing();
    } else {
      chartRef.current?.startDrawing(toolName);
    }
  }, [isActive]);

  const handleDrawingDisarmed = useCallback(() => {
    setActiveTool("__cursor__");
  }, []);

  const handleToggleMagnet = useCallback(
    (on: boolean) => {
      chartRef.current?.setMagnet(on);
      onToolbarPrefsChange({ ...toolbarPrefs, magnet: on });
    },
    [toolbarPrefs, onToolbarPrefsChange],
  );

  const handleToggleKeepDrawing = useCallback(
    (on: boolean) => {
      chartRef.current?.setKeepDrawingMode(on);
      onToolbarPrefsChange({ ...toolbarPrefs, keepDrawing: on });
    },
    [toolbarPrefs, onToolbarPrefsChange],
  );

  const handleGroupSelectionsChange = useCallback(
    (next: Record<string, DrawingToolName>) => {
      onToolbarPrefsChange({ ...toolbarPrefs, groupSelections: next });
    },
    [toolbarPrefs, onToolbarPrefsChange],
  );

  const handleToggleLockAll = useCallback(() => {
    const next = !allLocked;
    chartRef.current?.lockAllDrawings(next);
  }, [allLocked]);

  const handleToggleHideAll = useCallback(() => {
    const nextHidden = !allHidden;
    chartRef.current?.setAllDrawingsVisible(!nextHidden);
  }, [allHidden]);

  const handleZoomIn = useCallback(() => {
    chartRef.current?.zoomIn();
  }, []);

  const handleDataLoaded = useCallback(
    (info: { count: number }) => {
      setCandleCount(info.count);
      onCandleCount?.(info.count);
    },
    [onCandleCount],
  );

  const handleCandlesChange = useCallback((candles: Candle[]) => {
    displayCandlesRef.current = candles;
    setLastCandleTimestamp(candles.at(-1)?.t ?? null);
    setCandlesRevision((revision) => revision + 1);
  }, []);

  const handleCrosshairMove = useCallback(
    (ev: {
      timestamp: number | null;
      dataIndex: number | null;
      valueLabel: string | null;
    }) => {
      pendingCrosshairRef.current = ev;
      if (crosshairRafRef.current != null) return;
      crosshairRafRef.current = requestAnimationFrame(() => {
        crosshairRafRef.current = null;
        if (pendingCrosshairRef.current) {
          setCrosshairData(pendingCrosshairRef.current);
        }
      });
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (crosshairRafRef.current != null) {
        cancelAnimationFrame(crosshairRafRef.current);
      }
    };
  }, []);

  const handleLegendAction = useCallback((actionId: string) => {
    const match = /^settings-(.+)$/.exec(actionId);
    if (match) setSettingsIndicatorId(match[1]);
  }, []);

  const handleIndicatorParamsSave = useCallback(
    (
      id: string,
      patch: {
        inputs?: Record<string, import("@/lib/chart/plugin-api").InputValue>;
        styles?: Record<string, import("@/lib/chart/contracts").LineStyleOverride>;
      },
    ) => {
      onConfigChange({
        ...config,
        indicators: config.indicators.map((ind) =>
          ind.id === id
            ? {
                ...ind,
                inputs: patch.inputs ?? ind.inputs,
                styles: patch.styles ?? ind.styles,
                params: undefined,
              }
            : ind,
        ),
      });
    },
    [config, onConfigChange],
  );

  const handleChartSettingsSave = useCallback(
    (next: RequiredChartSettings) => {
      const prevMerged = mergeChartSettings(config.chartSettings);
      const serialized = serializeChartSettings(next);
      onConfigChange({ ...config, chartSettings: serialized });
      if (next.scales.priceScaleType !== prevMerged.scales.priceScaleType) {
        chartRef.current?.resetPriceScaleWindow(next);
      }
    },
    [config, onConfigChange],
  );

  const handleSaveChartTemplate = useCallback((settingsDraft?: RequiredChartSettings) => {
    const name = prompt("Chart template name:");
    if (!name?.trim()) return;
    const sourceConfig = settingsDraft
      ? { ...config, chartSettings: serializeChartSettings(settingsDraft) }
      : config;
    const preset = createChartPreset(name.trim(), chartTemplateFromCell(sourceConfig));
    const result = savePreset(preset);
    if (!result.ok) {
      alert("Template limit reached (50). Delete one to save a new template.");
    } else {
      setTemplateRevision((revision) => revision + 1);
    }
    setContextMenu(null);
  }, [config]);

  const handleApplyTemplate = useCallback(
    (preset: PresetEnvelope) => {
      if (preset.kind === "chart") {
        const { cell, skipped } = applyChartTemplate(config, preset.payload);
        onConfigChange(cell);
        if (skipped.length > 0) {
          alert(`Skipped unavailable indicators: ${skipped.join(", ")}`);
        }
      } else {
        const { cell, skipped } = applyStudyTemplate(config, preset.payload);
        onConfigChange(cell);
        if (skipped.length > 0) {
          alert(`Could not apply study: ${skipped.join(", ")}`);
        }
      }
    },
    [config, onConfigChange],
  );

  const handleSaveStudyTemplate = useCallback(
    (indicator: IndicatorConfig) => {
      const name = prompt("Study template name:");
      if (!name?.trim()) return;
      const preset = createStudyPreset(
        name.trim(),
        studyTemplateFromIndicator(indicator),
      );
      const result = savePreset(preset);
      if (!result.ok) {
        alert("Template limit reached (50). Delete one to save a new template.");
      } else {
        setTemplateRevision((revision) => revision + 1);
      }
    },
    [],
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
    [config, onConfigChange],
  );

  const handlePriceScaleContextMenu = useCallback(
    (pos: { clientX: number; clientY: number; priceScaleMode: "auto" | "manual" }) => {
      const merged = mergeChartSettings(config.chartSettings);
      const items = buildPriceScaleContextMenuItems(
        {
          settings: merged,
          priceScaleMode: pos.priceScaleMode,
        },
        {
          resetPriceScale: () => {
            chartRef.current?.resetPriceScaleWindow();
            setContextMenu(null);
          },
          setPriceScaleType: applyPriceScaleType,
          openScaleSettings: () => {
            setChartSettingsSection("scales");
            setChartSettingsOpen(true);
            setContextMenu(null);
          },
          patchSettings: (patch) => {
            const patched = patchChartSettings(config.chartSettings, patch);
            const merged = mergeChartSettings(patched);
            onConfigChange({ ...config, chartSettings: patched });
            if (patch.scales?.priceScaleType != null || patch.priceScaleType != null) {
              chartRef.current?.resetPriceScaleWindow(merged);
            }
            setContextMenu(null);
          },
        },
      );
      setContextMenu({ position: { x: pos.clientX, y: pos.clientY }, items });
    },
    [applyPriceScaleType, config, onConfigChange],
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
    [config.symbol, config.interval],
  );

  const settingsIndicator = useMemo(
    () => config.indicators.find((i) => i.id === settingsIndicatorId) ?? null,
    [config.indicators, settingsIndicatorId],
  );

  const settingsDrawing = useMemo(() => {
    if (!settingsOverlayId) return null;
    const drawings = chartRef.current?.serializeDrawings() ?? [];
    return drawings.find((d) => d.id === settingsOverlayId) ?? null;
  }, [settingsOverlayId, overlays]);

  const selectedDrawing = useMemo(() => {
    if (!selectedOverlayId) return null;
    const drawings = chartRef.current?.serializeDrawings() ?? [];
    return drawings.find((d) => d.id === selectedOverlayId) ?? null;
  }, [selectedOverlayId, overlays]);

  useEffect(() => {
    setToolbarDragOffset({ x: 0, y: 0 });
  }, [selectedOverlayId]);

  useEffect(() => {
    const el = chartOverlayRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDrawingToolbarBounds({
          width: Math.max(100, width),
          height: Math.max(100, height),
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selectedDrawingBounds = useMemo(() => {
    if (!selectedOverlayId) return null;
    return chartRef.current?.getDrawingScreenBounds(selectedOverlayId) ?? null;
  }, [selectedOverlayId, overlays, drawingToolbarBounds]);

  const handleDrawingStylesSave = useCallback((id: string, patch: Partial<DrawingStyles>) => {
    chartRef.current?.updateDrawingStyles(id, patch);
    overlaysDirtyRef.current = true;
  }, []);

  // Pane actions - uniform for price pane (PRICE_PANE_KEY) and indicator panes.
  // Operate on paneOrder / collapsedPanes / maximizedPane in config for persistence.
  const getPaneOrder = () => {
    const subKeys = config.indicators
      .filter((i) => i.pane === 'sub')
      .map((i) => indicatorKey(i));
    return config.paneOrder && config.paneOrder.length > 0
      ? [...config.paneOrder]
      : [PRICE_PANE_KEY, ...subKeys];
  };

  const handleCollapsePane = useCallback(
    (key: string) => {
      const currentCollapsed = new Set(config.collapsedPanes ?? []);
      if (currentCollapsed.has(key)) {
        currentCollapsed.delete(key);
      } else {
        currentCollapsed.add(key);
      }
      const nextMax = config.maximizedPane === key ? null : config.maximizedPane;
      update({
        collapsedPanes: Array.from(currentCollapsed),
        maximizedPane: nextMax,
      });
    },
    [config.collapsedPanes, config.maximizedPane, update],
  );

  const handleMaximizePane = useCallback(
    (key: string) => {
      const isCurrentlyMax = config.maximizedPane === key;
      const nextMax = isCurrentlyMax ? null : key;
      // When maximizing, ensure target not collapsed.
      const nextCollapsed = new Set(config.collapsedPanes ?? []);
      nextCollapsed.delete(key);
      update({
        collapsedPanes: Array.from(nextCollapsed),
        maximizedPane: nextMax,
      });
    },
    [config.collapsedPanes, config.maximizedPane, update],
  );

  const handleMovePaneUp = useCallback(
    (key: string) => {
      const order = getPaneOrder();
      const idx = order.indexOf(key);
      if (idx <= 0) return;
      [order[idx], order[idx - 1]] = [order[idx - 1], order[idx]];
      update({ paneOrder: order });
    },
    [config.paneOrder, config.indicators, update],
  );

  const handleMovePaneDown = useCallback(
    (key: string) => {
      const order = getPaneOrder();
      const idx = order.indexOf(key);
      if (idx < 0 || idx >= order.length - 1) return;
      [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
      update({ paneOrder: order });
    },
    [config.paneOrder, config.indicators, update],
  );

  const handlePaneHeightsChange = useCallback(
    (heights: Record<string, number>) => {
      update({ paneHeights: heights });
    },
    [update],
  );

  const handleClearDrawings = useCallback(() => {
    chartRef.current?.clearDrawings();
    setSelectedOverlayId(null);
    setActiveTool("__cursor__");
  }, []);

  // Overlay actions (wired to both context menu and object tree).
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
      subscribe: (cb: () => void) => {
        return chartRef.current?.subscribeOverlayChange(cb) ?? (() => {});
      },
    }),
    [selectedOverlayId],
  );

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
      getCandles: () => chartRef.current?.getCandles() ?? [],
      selectDrawing: (id: string | null) => chartRef.current?.selectDrawing(id),
      getSelectedDrawingId: () => chartRef.current?.getSelectedDrawingId() ?? null,
      updateDrawingStyles: (id: string, patch: Parameters<NonNullable<typeof chartRef.current>["updateDrawingStyles"]>[1]) =>
        chartRef.current?.updateDrawingStyles(id, patch),
      restoreDrawings: (data: SerializedDrawing[]) => chartRef.current?.restoreDrawings(data),
      canCaptureSnapshot: () => chartRef.current?.canCaptureSnapshot() ?? false,
      captureSnapshot: (opts) => {
        const chart = chartRef.current;
        if (!chart?.canCaptureSnapshot()) {
          return Promise.reject(new SnapshotCaptureError("no_data"));
        }
        return chart.captureSnapshot(opts);
      },
    }),
    [],
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedOverlayId) {
      chartRef.current?.removeOverlay(selectedOverlayId);
      setSelectedOverlayId(null);
      setContextMenu(null);
    }
  }, [selectedOverlayId]);

  const handleRenameSelected = useCallback(() => {
    if (!selectedOverlayId) return;
    const overlay = overlays.find((o) => o.id === selectedOverlayId);
    if (!overlay) return;
    const name = prompt("Rename drawing:", overlay.label);
    if (name?.trim()) {
      overlayActions().rename(selectedOverlayId, name.trim());
    }
  }, [selectedOverlayId, overlays, overlayActions]);

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
  }, [selectedOverlayId]);

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

  const uiCommands = useCallback(
    () => ({
      openGoTo: () => setGoToOpen(true),
      runSnapshot: (action: SnapshotAction) => runCellSnapshot(action),
    }),
    [runCellSnapshot],
  );

  useEffect(() => {
    if (!activeChartBridge) return;

    if (!isActive) {
      activeChartBridge.unregister(chartId);
      return;
    }

    return () => {
      activeChartBridge.unregister(chartId);
    };
  }, [activeChartBridge, isActive, chartId]);

  useEffect(() => {
    if (!activeChartBridge || !isActive) return;

    activeChartBridge.register(chartId, {
      chartId,
      config,
      theme,
      overlays,
      dataWindow: {
        dataIndex: crosshairData.dataIndex,
        candles: displayCandlesRef.current,
        indicators: config.indicators.filter((i) => i.visible !== false),
        symbol: config.symbol,
        symbolName: config.symbolName,
        exchange: config.exchange,
        interval: config.interval,
        theme,
      },
      overlayActions: overlayActions(),
      onConfigChange,
      openIndicatorPicker: () => setPickerOpen(true),
      headerCommands: {
        replayActive,
        canUndo: Boolean(canUndo),
        canRedo: Boolean(canRedo),
        openSettings: () => {
          setChartSettingsSection("status");
          setChartSettingsOpen(true);
        },
        openStudyTemplate: () => {
          setTemplatePickerTab("study");
          setTemplatePickerOpen(true);
        },
        openChartTemplate: () => {
          setTemplatePickerTab("chart");
          setTemplatePickerOpen(true);
        },
        toggleReplay: () => setReplayActive((a) => !a),
        undo: () => {
          chartRef.current?.undo();
          setHistoryRevision((r) => r + 1);
        },
        redo: () => {
          chartRef.current?.redo();
          setHistoryRevision((r) => r + 1);
        },
        addFavoriteIndicator: (name) => {
          const meta = getCatalogMeta(name);
          if (meta) {
            addIndicator({ name, pane: meta.defaultPane });
          }
        },
      },
      chartCommands: chartCommands(),
      drawingCommands: drawingCommands(),
      uiCommands: uiCommands(),
    });
  }, [
    activeChartBridge,
    isActive,
    chartId,
    config,
    theme,
    overlays,
    crosshairData.dataIndex,
    candlesRevision,
    overlayActions,
    onConfigChange,
    replayActive,
    canUndo,
    canRedo,
    addIndicator,
    chartCommands,
    drawingCommands,
    uiCommands,
  ]);

  const handleOverlayRightClick = useCallback(
    (overlay: TrackedOverlay, pos: { x: number; y: number }) => {
      setSelectedOverlayId(overlay.id);
      const actions = overlayActions();
      setContextMenu({
        position: pos,
        header: overlay.label || overlay.name,
        items: buildOverlayContextMenuItems(
          overlay,
          actions,
          (id) => {
            const o = overlays.find((ov) => ov.id === id);
            if (o) {
              const name = prompt("Rename drawing:", o.label);
              if (name?.trim()) actions.rename(id, name.trim());
            }
            setContextMenu(null);
          },
          (id) => {
            setSettingsOverlayId(id);
            setContextMenu(null);
          },
          {
            onCopy: () => {
              const drawings = chartRef.current?.serializeDrawings() ?? [];
              const one = drawings.filter((d) => d.id === overlay.id);
              if (one.length > 0) copyDrawings(one);
              setContextMenu(null);
            },
            onPaste: handlePasteDrawings,
            canPaste: hasDrawingClipboard(),
          },
        ),
      });
    },
    [overlayActions, overlays, handlePasteDrawings],
  );

  const handleChartContextMenu = useCallback(
    (pos: { x: number; y: number }) => {
      const modified = chartRef.current?.isViewportModified() ?? false;
      const items = buildChartContextMenuItems(
        {
          viewportModified: modified,
          drawingCount: overlays.length,
          indicatorCount: config.indicators.length,
          priceLabel: crosshairData.valueLabel,
          canPasteDrawings: hasDrawingClipboard(),
        },
        {
          resetView: () => {
            chartRef.current?.resetChartView();
            setContextMenu(null);
          },
          copyPrice: (price) => {
            void navigator.clipboard.writeText(price);
            setContextMenu(null);
          },
          openObjectTree: () => {
            sidebar?.openPanel("object-tree");
            setContextMenu(null);
          },
          pasteDrawings: handlePasteDrawings,
          saveChartTemplate: handleSaveChartTemplate,
          applyChartTemplate: () => {
            setTemplatePickerTab("chart");
            setTemplatePickerOpen(true);
            setContextMenu(null);
          },
          removeDrawings: () => {
            handleClearDrawings();
            setContextMenu(null);
          },
          removeIndicators: () => {
            update({ indicators: [] });
            setContextMenu(null);
          },
          openSettings: () => {
            setChartSettingsSection("status");
            setChartSettingsOpen(true);
            setContextMenu(null);
          },
          openGoTo: () => {
            setGoToOpen(true);
            setContextMenu(null);
          },
        },
      );
      setContextMenu({ position: pos, items });
    },
    [
      overlays.length,
      config.indicators.length,
      crosshairData.valueLabel,
      handleClearDrawings,
      handlePasteDrawings,
      handleSaveChartTemplate,
      update,
      sidebar,
    ],
  );

  // Crosshair sync helpers.
  const handleCrosshairFire = useCallback(
    (ts: number | null) => {
      sync?.broadcast(chartId, ts);
    },
    [sync, chartId],
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      onPointerDown={() => onFocus?.()}
    >
      {/* Body: drawing rail + chart */}
      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="relative z-20 flex h-full shrink-0 self-stretch overflow-visible">
          <DrawingToolbar
          theme={theme}
          compact={compact}
          disabled={!isActive}
          activeTool={activeTool}
          magnet={magnet}
          keepDrawing={keepDrawing}
          allLocked={allLocked}
          allHidden={allHidden}
          groupSelections={groupSelections}
          onGroupSelectionsChange={handleGroupSelectionsChange}
          onToolSelect={handleToolSelect}
          onClear={handleClearDrawings}
          onToggleMagnet={handleToggleMagnet}
          onToggleKeepDrawing={handleToggleKeepDrawing}
          onToggleLockAll={handleToggleLockAll}
          onToggleHideAll={handleToggleHideAll}
          onZoomIn={handleZoomIn}
          onDeleteSelected={
            selectedOverlayId && isActive ? handleDeleteSelected : undefined
          }
          />
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--tv-surface-chart)] p-px" ref={chartOverlayRef}>
          <EdgeChart
            ref={chartRef}
            config={config}
            theme={theme}
            compact={compact}
            visibleCount={visibleCount}
            chartId={chartId}
            onCrosshairTimestamp={handleCrosshairFire}
            onCrosshairMove={handleCrosshairMove}
            onLegendAction={handleLegendAction}
            onDrawingDisarmed={handleDrawingDisarmed}
            onConfigChange={onConfigChange}
            onOverlayRightClick={handleOverlayRightClick}
            onChartContextMenu={handleChartContextMenu}
            onPriceScaleContextMenu={handlePriceScaleContextMenu}
            onRemoveIndicator={removeIndicator}
            onCollapseIndicator={handleCollapsePane}
            onMaximizeIndicator={handleMaximizePane}
            onMoveIndicatorUp={handleMovePaneUp}
            onMoveIndicatorDown={handleMovePaneDown}
            onPaneHeightsChange={handlePaneHeightsChange}
            onDataLoaded={handleDataLoaded}
            onCandlesChange={handleCandlesChange}
            collapsedKeys={collapsedKeys}
            maximizedKey={maximizedKey}
            paneOrder={paneOrder}
          />
          {isActive && selectedDrawing && selectedOverlayId && (
            <DrawingSelectionToolbar
              theme={theme}
              drawing={selectedDrawing}
              bounds={selectedDrawingBounds}
              containerWidth={drawingToolbarBounds.width}
              containerHeight={drawingToolbarBounds.height}
              dragOffset={toolbarDragOffset}
              onDragOffsetChange={setToolbarDragOffset}
              onStyleChange={(patch) => {
                chartRef.current?.updateDrawingStyles(selectedOverlayId, patch);
                overlaysDirtyRef.current = true;
              }}
              onMetadataChange={(patch) => {
                chartRef.current?.updateDrawingMetadata(selectedOverlayId, patch);
                overlaysDirtyRef.current = true;
              }}
              onAcceptProposal={() => {
                chartRef.current?.updateDrawingMetadata(selectedOverlayId, {
                  status: "active",
                  source: selectedDrawing.metadata?.source ?? "ai",
                });
                overlaysDirtyRef.current = true;
              }}
              onDismissProposal={() => {
                chartRef.current?.updateDrawingMetadata(selectedOverlayId, {
                  status: "invalidated",
                });
                overlaysDirtyRef.current = true;
              }}
              onOpenSettings={() => setSettingsOverlayId(selectedOverlayId)}
              onToggleLock={() => {
                chartRef.current?.setOverlayLocked(selectedOverlayId, !selectedDrawing.locked);
              }}
              onDelete={handleDeleteSelected}
              onMore={(clientX, clientY) => {
                const overlay = overlays.find((o) => o.id === selectedOverlayId);
                if (overlay) {
                  handleOverlayRightClick(overlay, { x: clientX, y: clientY });
                }
              }}
            />
          )}
        </div>
      </div>

      {!compact && candleCount > 0 && (
        <ChartRangeBar
          selectedPreset={config.rangePreset ?? null}
          theme={theme}
          timeZone={chartSettingsMerged.symbol.timeZone}
          exchange={config.exchange}
          onRangeSelect={handleRangeSelect}
          onGoToClick={() => setGoToOpen(true)}
          onTimeZoneChange={handleTimeZoneChange}
        />
      )}

      {!compact && replayActive && (
        <BarReplay
          total={candleCount}
          onVisibleChange={setVisibleCount}
          disabled={false}
        />
      )}

      <IndicatorPicker
        open={pickerOpen}
        active={config.indicators}
        theme={theme}
        onAdd={addIndicator}
        onClose={() => setPickerOpen(false)}
      />

      <IndicatorSettingsModal
        open={settingsIndicatorId != null}
        indicator={settingsIndicator}
        theme={theme}
        onClose={() => setSettingsIndicatorId(null)}
        onSave={handleIndicatorParamsSave}
        onSaveAsTemplate={
          settingsIndicator
            ? () => handleSaveStudyTemplate(settingsIndicator)
            : undefined
        }
      />

      <DrawingSettingsModal
        open={settingsOverlayId != null}
        drawing={settingsDrawing}
        theme={theme}
        onClose={() => setSettingsOverlayId(null)}
        onSave={handleDrawingStylesSave}
      />

      <ChartSettingsModal
        open={chartSettingsOpen}
        settings={config.chartSettings}
        initialSection={chartSettingsSection}
        onClose={() => setChartSettingsOpen(false)}
        onSave={handleChartSettingsSave}
        chartTemplates={chartTemplates}
        onSaveTemplate={handleSaveChartTemplate}
        onApplyTemplate={(preset) => {
          handleApplyTemplate(preset);
          setChartSettingsOpen(false);
        }}
      />

      <ChartGoToModal
        open={goToOpen}
        theme={theme}
        interval={config.interval}
        defaultTimestampMs={
          crosshairData.timestamp ??
          lastCandleTimestamp ??
          null
        }
        onClose={() => setGoToOpen(false)}
        onGoTo={(req) => chartRef.current?.goTo(req) ?? Promise.resolve({ ok: false, reason: 'no_data' })}
      />

      <TemplatePickerModal
        open={templatePickerOpen}
        initialTab={templatePickerTab}
        onClose={() => setTemplatePickerOpen(false)}
        onApply={handleApplyTemplate}
      />

      <ContextMenu
        open={!!contextMenu}
        position={contextMenu?.position ?? null}
        items={contextMenu?.items ?? []}
        header={contextMenu?.header}
        onClose={() => setContextMenu(null)}
      />

      {/* Crosshair sync wiring */}
      <ChartSyncBridge chartRef={chartRef} chartId={chartId} />
    </div>
  );
}

/**
 * Subscribes to crosshair timestamps from peer charts via ChartSyncContext.
 */
function ChartSyncBridge({
  chartRef,
  chartId,
}: {
  chartRef: React.RefObject<ChartHandle | null>;
  chartId: string;
}) {
  const sync = useChartSync();

  useEffect(() => {
    if (!sync) return;
    return sync.subscribe(chartId, (ts) => {
      chartRef.current?.setCrosshairFromSync(ts);
    });
  }, [sync, chartId, chartRef]);

  return null;
}

type OverlayActionHandlers = {
  remove: (id: string) => void;
  setVisible: (id: string, visible: boolean) => void;
  setLocked: (id: string, locked: boolean) => void;
  rename: (id: string, label: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  duplicate: (id: string) => void;
};

type OverlayClipboardHandlers = {
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
};

function buildOverlayContextMenuItems(
  overlay: TrackedOverlay,
  actions: OverlayActionHandlers,
  onRenamePrompt: (id: string) => void,
  onOpenSettings: (id: string) => void,
  clipboard: OverlayClipboardHandlers,
): ContextMenuItem[] {
  return [
    {
      id: "rename",
      label: "Rename",
      shortcut: getShortcutLabel("renameDrawing"),
      action: () => onRenamePrompt(overlay.id),
    },
    {
      id: "settings",
      label: "Settings…",
      action: () => onOpenSettings(overlay.id),
      dividerAfter: true,
    },
    {
      id: "copy",
      label: "Copy",
      shortcut: getShortcutLabel("copyDrawing"),
      action: clipboard.onCopy,
      dividerAfter: !clipboard.canPaste,
    },
    ...(clipboard.canPaste
      ? [
          {
            id: "paste",
            label: "Paste",
            shortcut: getShortcutLabel("pasteDrawing"),
            action: clipboard.onPaste,
            dividerAfter: true,
          } as ContextMenuItem,
        ]
      : []),
    {
      id: "lock",
      label: overlay.locked ? "Unlock" : "Lock",
      shortcut: getShortcutLabel("lockDrawing"),
      action: () => actions.setLocked(overlay.id, !overlay.locked),
    },
    {
      id: "hide",
      label: overlay.visible ? "Hide" : "Show",
      action: () => actions.setVisible(overlay.id, !overlay.visible),
    },
    {
      id: "forward",
      label: "Bring to Front",
      action: () => actions.bringForward(overlay.id),
      dividerAfter: true,
    },
    {
      id: "backward",
      label: "Send to Back",
      action: () => actions.sendBackward(overlay.id),
      dividerAfter: true,
    },
    {
      id: "duplicate",
      label: "Duplicate",
      shortcut: getShortcutLabel("duplicateDrawing"),
      action: () => actions.duplicate(overlay.id),
      dividerAfter: true,
    },
    {
      id: "remove",
      label: "Remove",
      shortcut: getShortcutLabel("deleteDrawing"),
      danger: true,
      action: () => actions.remove(overlay.id),
    },
  ];
}