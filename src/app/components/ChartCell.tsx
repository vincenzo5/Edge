"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EdgeChart, { type ChartHandle } from "./EdgeChart";
import DrawingToolbar, { resolveGroupSelections } from "./DrawingToolbar";
import DrawingSelectionToolbar from "./DrawingSelectionToolbar";
import ChartRangeBar from "./ChartRangeBar";
import ChartCellDialogs from "./chart-cell/ChartCellDialogs";
import ChartErrorBoundary from "./chart-cell/ChartErrorBoundary";
import ChartSyncBridge from "./chart-cell/ChartSyncBridge";
import { useJournalChartOverlay } from "./journal/JournalChartOverlayProvider";
import { usePatternChartGoto, usePatternLibraryOptional } from "./pattern-library/PatternLibraryContext";
import { useDrawingLayoutSync } from "./chart-cell/useDrawingLayoutSync";
import { useRegisterActiveChart } from "./chart-cell/useRegisterActiveChart";
import { useTradeDrawingBinding } from "./chart-cell/useTradeDrawingBinding";
import { usePaneLayoutActions } from "./chart-cell/usePaneLayoutActions";
import { useJournalPatternGoto } from "./chart-cell/useJournalPatternGoto";
import { usePatternCapture } from "./chart-cell/usePatternCapture";
import { useCellCrosshair } from "./chart-cell/useCellCrosshair";
import { useDrawingToolbarCommands } from "./chart-cell/useDrawingToolbarCommands";
import { useChartTemplateActions } from "./chart-cell/useChartTemplateActions";
import { useChartCellContextMenus } from "./chart-cell/useChartCellContextMenus";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";
import { useChartSync } from "./ChartSyncContext";
import { useActiveChartBridge } from "./ActiveChartContext";
import { useMarketDataQuotes } from "./MarketDataProvider";
import { useSidebarOptional } from "./SidebarContext";
import type { Candle, DrawingStyles } from "@/lib/chart/contracts";
import type { ChartDataMeta } from "@edge/chart-core";
import type { MarketSessionKind } from "@edge/chart-core";
import { resolveMarketSession, sessionStatusLabel } from "@edge/chart-core";
import {
  createIndicatorInstance,
  mergeChartSettings,
  patchChartSettings,
  serializeChartSettings,
  type CellConfig,
  type RequiredChartSettings,
  type IndicatorConfig,
  type ToolbarPrefs,
} from "@/lib/chartConfig";
import type { Range } from "@/lib/chart/contracts";
import type { ChartTimeZone } from "@/lib/chart/timeZone";
import { applyRangePresetSelect } from "@/lib/chart/rangePresetTransition";
import type { DrawingToolName } from "./chart-icons/toolGroups";
import { useTradeSetupBindingOptional } from "./trading/TradeSetupBindingContext";
import MarketContextBreadcrumb from "./chart-chrome/MarketContextBreadcrumb";
import PatternCapturePanel from "./chart-chrome/PatternCapturePanel";
import PatternCaptureOverlay from "./chart-chrome/PatternCaptureOverlay";
import type { PriceScaleSide } from "@/lib/chart/layout";
import type { ChartSymbolNav } from "./ChartGrid";
import type { SymbolSelectResult } from "@/lib/watchlist/types";
import type { RailMode } from "@/lib/responsive/responsiveLayout";

const EMPTY_CONTEXT_MENU_ITEMS: ContextMenuItem[] = [];

type Props = {
  chartId: string;
  config: CellConfig;
  theme: "light" | "dark";
  compact?: boolean;
  railMode?: RailMode;
  isActive?: boolean;
  showDrawingRail?: boolean;
  toolbarPrefs: ToolbarPrefs;
  symbolNav?: ChartSymbolNav;
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
  railMode = "full",
  isActive = true,
  showDrawingRail = true,
  toolbarPrefs,
  symbolNav,
  onFocus,
  onConfigChange,
  onToolbarPrefsChange,
  onCandleCount,
}: Props) {
  const chartRef = useRef<ChartHandle>(null);
  const tradeBinding = useTradeSetupBindingOptional();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chartRetryKey, setChartRetryKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [candleCount, setCandleCount] = useState(0);
  const displayCandlesRef = useRef<Candle[]>([]);
  const [candlesRevision, setCandlesRevision] = useState(0);
  const resetAppliedForSymbolRef = useRef<string | null>(null);
  const [lastCandleTimestamp, setLastCandleTimestamp] = useState<number | null>(null);
  const [settingsIndicatorId, setSettingsIndicatorId] = useState<string | null>(null);
  const [settingsOverlayId, setSettingsOverlayId] = useState<string | null>(null);
  const [chartSettingsOpen, setChartSettingsOpen] = useState(false);
  const [chartSettingsSection, setChartSettingsSection] = useState<
    "symbol" | "status" | "scales" | "canvas" | "trading"
  >("status");
  const [goToOpen, setGoToOpen] = useState(false);
  const [renameOverlayId, setRenameOverlayId] = useState<string | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templatePickerTab, setTemplatePickerTab] = useState<"chart" | "study">("chart");
  const [templateRevision, setTemplateRevision] = useState(0);
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
  const [dataMeta, setDataMeta] = useState<ChartDataMeta | null>(null);
  const sync = useChartSync();
  const activeChartBridge = useActiveChartBridge();
  const marketData = useMarketDataQuotes();
  const sidebar = useSidebarOptional();
  const {
    markers: journalMarkers,
    gotoMs: journalGotoMs,
    consumeGoto: consumeJournalGoto,
  } = useJournalChartOverlay(config.symbol);
  const { gotoMs: patternGotoMs, consumeGoto: consumePatternGoto } =
    usePatternChartGoto(config.symbol);
  const patternLibrary = usePatternLibraryOptional();

  const magnet = toolbarPrefs.magnet ?? false;
  const keepDrawing = toolbarPrefs.keepDrawing ?? false;
  const groupSelections = resolveGroupSelections(
    toolbarPrefs.groupSelections as Record<string, DrawingToolName> | undefined,
  );

  const collapsedKeys = new Set(config.collapsedPanes ?? []);
  const maximizedKey = config.maximizedPane ?? null;
  const paneOrder = config.paneOrder ?? [];

  const {
    overlays,
    overlaysDirtyRef,
    suppressDrawingPersistRef,
    lastAppliedDrawingsRef,
  } = useDrawingLayoutSync({
    chartRef,
    config,
    onConfigChange,
    chartId,
    isActive,
    sync,
    setSelectedOverlayId,
    setHistoryRevision,
  });

  useTradeDrawingBinding({ chartRef, chartId, overlays, tradeBinding });

  const update = useCallback(
    (patch: Partial<CellConfig>) => {
      onConfigChange({ ...config, ...patch });
    },
    [config, onConfigChange],
  );

  const {
    handleCollapsePane,
    handleMaximizePane,
    handleMovePaneUp,
    handleMovePaneDown,
    handlePaneHeightsChange,
  } = usePaneLayoutActions({ config, update });

  useJournalPatternGoto({
    chartRef,
    isActive,
    candleCount,
    journalGotoMs,
    patternGotoMs,
    consumeJournalGoto,
    consumePatternGoto,
  });

  useEffect(() => {
    if (!isActive) return;
    chartRef.current?.setMagnet(magnet);
    chartRef.current?.setKeepDrawingMode(keepDrawing);
  }, [isActive, magnet, keepDrawing]);

  useEffect(() => {
    if (isActive) return;
    chartRef.current?.stopDrawing();
    setActiveTool("__cursor__");
  }, [isActive]);

  useEffect(() => {
    if (!replayActive) {
      setVisibleCount(null);
    }
  }, [replayActive]);

  const chartSettingsMerged = useMemo(
    () => mergeChartSettings(config.chartSettings),
    [config.chartSettings],
  );

  const priceScaleSide: PriceScaleSide =
    chartSettingsMerged.scales.priceScalePlacement === "left" ? "left" : "right";

  const {
    captureState,
    dispatchCapture,
    captureActive,
    captureSaveMessage,
    captureSavedRecordId,
    captureHoverBar,
    captureViewport,
    refreshCaptureViewport,
    setVisibleRangeTick,
    setCaptureHoverBar,
    togglePatternCapture,
    cancelPatternCapture,
    undoPatternCapture,
    savePatternCapture,
    handleCaptureOverlayClick,
    handleCaptureOverlayPointerMove,
    canSaveCapture,
    canUndoCapture,
  } = usePatternCapture({
    chartRef,
    chartOverlayRef,
    chartId,
    config,
    isActive,
    priceScaleSide,
    patternLibrary,
    setActiveTool,
  });

  const { crosshairData, latestCrosshairPlotXRef, handleCrosshairMove } = useCellCrosshair({
    captureActive,
    refreshCaptureViewport,
    setVisibleRangeTick,
    setCaptureHoverBar,
  });

  const {
    allLocked,
    allHidden,
    handleToolSelect,
    handleDrawingDisarmed,
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
  } = useDrawingToolbarCommands({
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
  });

  const {
    chartTemplates,
    handleSaveChartTemplate,
    handleApplyTemplate,
    handleSaveStudyTemplate,
    openChartTemplatePicker,
  } = useChartTemplateActions({
    config,
    onConfigChange,
    chartSettingsOpen,
    templatePickerOpen,
    templateRevision,
    setContextMenu,
    setTemplateRevision,
    setTemplatePickerTab,
    setTemplatePickerOpen,
  });

  const { handleOverlayRightClick, handleChartContextMenu, handlePriceScaleContextMenu } =
    useChartCellContextMenus({
      chartRef,
      chartId,
      config,
      overlays,
      crosshairData,
      displayCandlesRef,
      chartSettingsMerged,
      latestCrosshairPlotXRef,
      sidebar,
      tradeBinding,
      setContextMenu,
      setChartSettingsSection,
      setChartSettingsOpen,
      setGoToOpen,
      setTemplatePickerOpen,
      setSettingsOverlayId,
      setSelectedOverlayId,
      update,
      onConfigChange,
      handleClearDrawings,
      handlePasteDrawings,
      handleSaveChartTemplate,
      openChartTemplatePicker,
      overlayActions,
      openRenameOverlay,
      applyPriceScaleType,
    });

  const canUndo =
    isActive &&
    typeof chartRef.current?.canUndo === "function" &&
    chartRef.current.canUndo();
  const canRedo =
    isActive &&
    typeof chartRef.current?.canRedo === "function" &&
    chartRef.current.canRedo();
  void historyRevision;

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

  const handleDataMetaChange = useCallback((meta: ChartDataMeta | null) => {
    setDataMeta(meta);
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

  useEffect(() => {
    if (!isActive || candleCount === 0) return;
    if (resetAppliedForSymbolRef.current === config.symbol) return;

    const symbol = config.symbol;
    let cancelled = false;
    const applyReset = () => {
      if (cancelled || resetAppliedForSymbolRef.current === symbol) return;
      chartRef.current?.resetChartView();
      chartRef.current?.resetPriceScaleWindow();
      resetAppliedForSymbolRef.current = symbol;
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(applyReset);
    });

    return () => {
      cancelled = true;
    };
  }, [config.symbol, candleCount, isActive]);

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
  }, [overlaysDirtyRef]);

  const handleRenameOverlaySave = useCallback(
    (label: string) => {
      if (!renameOverlayId) return;
      chartRef.current?.renameOverlay(renameOverlayId, label);
      setRenameOverlayId(null);
    },
    [renameOverlayId],
  );

  const uiCommands = useCallback(
    () => ({
      openGoTo: () => setGoToOpen(true),
      runSnapshot: (action: import("@/lib/chart/chartSnapshot").SnapshotAction) =>
        runCellSnapshot(action),
      togglePatternCapture,
      undoPatternCapture,
      savePatternCapture: () => void savePatternCapture(),
      cancelPatternCapture,
      isPatternCaptureActive: () => captureActive,
      canSavePatternCapture: () => canSaveCapture(),
    }),
    [
      runCellSnapshot,
      togglePatternCapture,
      undoPatternCapture,
      savePatternCapture,
      cancelPatternCapture,
      captureActive,
      canSaveCapture,
    ],
  );

  const dataWindowActions = useCallback(
    () => ({
      setPriceVisible: (visible: boolean) => {
        onConfigChange({ ...config, mainSeriesVisible: visible });
      },
      setOhlcVisible: (visible: boolean) => {
        onConfigChange({
          ...config,
          chartSettings: patchChartSettings(config.chartSettings, {
            statusLine: {
              showChartValues: visible,
              showBarChangeValues: visible,
            },
          }),
        });
      },
      setVolumeVisible: (visible: boolean) => {
        const volInd = config.indicators.find((i) => i.name === "VOL");
        if (volInd) {
          onConfigChange({
            ...config,
            indicators: config.indicators.map((i) =>
              i.id === volInd.id ? { ...i, visible } : i,
            ),
          });
        } else {
          onConfigChange({
            ...config,
            chartSettings: patchChartSettings(config.chartSettings, {
              statusLine: { showVolume: visible },
            }),
          });
        }
      },
      setIndicatorVisible: (id: string, visible: boolean) => {
        onConfigChange({
          ...config,
          indicators: config.indicators.map((i) =>
            i.id === id ? { ...i, visible } : i,
          ),
        });
      },
    }),
    [config, onConfigChange],
  );

  useRegisterActiveChart({
    activeChartBridge,
    isActive,
    chartId,
    chartRef,
    config,
    theme,
    overlays,
    dataMeta,
    crosshairDataIndex: crosshairData.dataIndex,
    displayCandlesRef,
    candlesRevision,
    overlayActions,
    dataWindowActions,
    onConfigChange,
    setPickerOpen,
    replayActive,
    canUndo,
    canRedo,
    setChartSettingsSection,
    setChartSettingsOpen,
    setTemplatePickerTab,
    setTemplatePickerOpen,
    setReplayActive,
    setHistoryRevision,
    addIndicator,
    chartCommands,
    drawingCommands,
    drawingToolbarActions,
    uiCommands,
    activeTool,
    allLocked,
    allHidden,
    hasDrawingSelection: selectedOverlayId != null,
    captureActive,
  });

  const renameOverlay = renameOverlayId
    ? overlays.find((overlay) => overlay.id === renameOverlayId) ?? null
    : null;

  const handleCrosshairFire = useCallback(
    (ts: number | null) => {
      sync?.broadcast(chartId, ts);
    },
    [sync, chartId],
  );

  const liveQuote =
    marketData?.quotesBySymbol.get(config.symbol.trim().toUpperCase()) ?? null;
  const liveQuotePrice = liveQuote?.regularMarketPrice ?? null;
  const liveMarketSession: MarketSessionKind | null = liveQuote
    ? resolveMarketSession({
        atMs: liveQuote.updatedAt,
        marketState: liveQuote.marketState,
      })
    : null;
  const sessionMode = config.chartSettings?.symbol?.sessionMode ?? "regular";
  const marketSessionLabel =
    liveMarketSession != null
      ? sessionStatusLabel(liveMarketSession, sessionMode)
      : null;

  const handleContextSymbolSelect = useCallback(
    (result: SymbolSelectResult) => {
      if (symbolNav?.onSymbolSelect) {
        symbolNav.onSymbolSelect(result);
        return;
      }
      onConfigChange({
        ...config,
        symbol: result.symbol,
        symbolName: result.name,
        exchange: result.exchange,
      });
    },
    [symbolNav, config, onConfigChange],
  );

  const legendContextSlot =
    config.symbol.trim().length > 0 ? (
      <MarketContextBreadcrumb
        symbol={config.symbol}
        theme={theme}
        density={compact ? "compact" : "full"}
        onSymbolSelect={handleContextSymbolSelect}
      />
    ) : null;

  const handleChartRetry = useCallback(() => {
    setChartRetryKey((key) => key + 1);
  }, []);

  const chartReloadKey = (marketData?.reloadToken ?? 0) + chartRetryKey;

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      onPointerDown={() => onFocus?.()}
    >
      <div className="flex min-h-0 min-w-0 flex-1">
        {showDrawingRail ? (
          <div className="relative z-20 flex h-full shrink-0 self-stretch overflow-visible">
            <DrawingToolbar
              theme={theme}
              railMode={railMode}
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
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--edge-surface-chart)] p-px"
            ref={chartOverlayRef}
          >
            <ChartErrorBoundary resetKey={chartRetryKey} onRetry={handleChartRetry}>
              <EdgeChart
                key={chartRetryKey}
                ref={chartRef}
                config={config}
                theme={theme}
                compact={compact}
                visibleCount={visibleCount}
                chartId={chartId}
                reloadKey={chartReloadKey}
                onRetry={handleChartRetry}
                livePrice={liveQuotePrice}
                liveMarketSession={liveMarketSession}
                marketSessionLabel={marketSessionLabel}
                legendContextSlot={legendContextSlot}
                showDataHealthBadge={isActive}
                journalAnnotationMarkers={journalMarkers}
                onCrosshairTimestamp={handleCrosshairFire}
                onCrosshairMove={handleCrosshairMove}
                suppressCrosshair={contextMenu != null}
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
                onDataMetaChange={handleDataMetaChange}
                onCandlesChange={handleCandlesChange}
                collapsedKeys={collapsedKeys}
                maximizedKey={maximizedKey}
                paneOrder={paneOrder}
              />
            </ChartErrorBoundary>
            {isActive && captureActive ? (
              <>
                <div
                  className="absolute inset-0 z-[25] cursor-crosshair"
                  style={{ pointerEvents: "auto" }}
                  onPointerDown={handleCaptureOverlayClick}
                  onPointerMove={handleCaptureOverlayPointerMove}
                  data-testid="pattern-capture-click-layer"
                />
                <PatternCaptureOverlay
                  sections={captureState.sections}
                  pendingStart={captureState.pendingStart}
                  pendingEnd={captureState.pendingEnd}
                  hoverBarIndex={captureHoverBar}
                  visibleRange={captureViewport}
                  phase={captureState.phase}
                  clickDots={captureState.clickDots}
                  priceScaleSide={priceScaleSide}
                />
                <PatternCapturePanel
                  theme={theme}
                  phase={captureState.phase}
                  hasPendingStart={captureState.pendingStart != null}
                  sections={captureState.sections}
                  labelDraft={captureState.labelDraft}
                  error={captureState.error}
                  canSave={canSaveCapture()}
                  canUndo={canUndoCapture()}
                  saving={captureState.phase === "saving"}
                  saveMessage={captureSaveMessage}
                  savedRecordId={captureSavedRecordId}
                  onViewInPatterns={
                    captureSavedRecordId
                      ? () => patternLibrary?.openPatternsPanel(captureSavedRecordId)
                      : undefined
                  }
                  onLabelDraftChange={(label) =>
                    dispatchCapture({ type: "SET_LABEL_DRAFT", label })
                  }
                  onConfirmLabel={() => dispatchCapture({ type: "CONFIRM_LABEL" })}
                  onPickPreset={(index) => dispatchCapture({ type: "PICK_PRESET", index })}
                  onUndo={undoPatternCapture}
                  onCancel={cancelPatternCapture}
                  onSave={() => void savePatternCapture()}
                />
              </>
            ) : null}
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
                  chartRef.current?.setOverlayLocked(
                    selectedOverlayId,
                    !selectedDrawing.locked,
                  );
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
        </div>
      </div>

      <ChartCellDialogs
        compact={compact}
        theme={theme}
        config={config}
        chartRef={chartRef}
        pickerOpen={pickerOpen}
        onPickerClose={() => setPickerOpen(false)}
        onAddIndicator={addIndicator}
        settingsIndicator={settingsIndicator}
        settingsIndicatorId={settingsIndicatorId}
        onSettingsIndicatorClose={() => setSettingsIndicatorId(null)}
        onIndicatorParamsSave={handleIndicatorParamsSave}
        onSaveStudyTemplate={
          settingsIndicator ? () => handleSaveStudyTemplate(settingsIndicator) : undefined
        }
        settingsDrawing={settingsDrawing}
        settingsOverlayId={settingsOverlayId}
        onSettingsOverlayClose={() => setSettingsOverlayId(null)}
        onDrawingStylesSave={handleDrawingStylesSave}
        chartSettingsOpen={chartSettingsOpen}
        chartSettingsSection={chartSettingsSection}
        onChartSettingsClose={() => setChartSettingsOpen(false)}
        onChartSettingsSave={handleChartSettingsSave}
        chartTemplates={chartTemplates}
        onSaveChartTemplate={handleSaveChartTemplate}
        onApplyTemplate={handleApplyTemplate}
        goToOpen={goToOpen}
        onGoToClose={() => setGoToOpen(false)}
        crosshairTimestamp={crosshairData.timestamp}
        lastCandleTimestamp={lastCandleTimestamp}
        onGoTo={(req) =>
          chartRef.current?.goTo(req) ??
          Promise.resolve({ ok: false, reason: "no_data" })
        }
        renameOverlayId={renameOverlayId}
        renameOverlayLabel={renameOverlay?.label ?? ""}
        onRenameOverlayClose={() => setRenameOverlayId(null)}
        onRenameOverlaySave={handleRenameOverlaySave}
        templatePickerOpen={templatePickerOpen}
        templatePickerTab={templatePickerTab}
        onTemplatePickerClose={() => setTemplatePickerOpen(false)}
        replayActive={replayActive}
        candleCount={candleCount}
        onReplayVisibleChange={setVisibleCount}
      />

      <ContextMenu
        open={!!contextMenu}
        position={contextMenu?.position ?? null}
        items={contextMenu?.items ?? EMPTY_CONTEXT_MENU_ITEMS}
        header={contextMenu?.header}
        onClose={() => setContextMenu(null)}
      />

      <ChartSyncBridge
        chartRef={chartRef}
        chartId={chartId}
        suppressDrawingPersistRef={suppressDrawingPersistRef}
        lastAppliedDrawingsRef={lastAppliedDrawingsRef}
      />
    </div>
  );
}
