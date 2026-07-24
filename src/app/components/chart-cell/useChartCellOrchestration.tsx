"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { PriceScaleSide } from "@edge/chart-core/layout";
import { useRouter } from "next/navigation";
import { resolveGroupSelections } from "../drawing/DrawingToolbar";
import { useTradeDrawingBinding } from "./useTradeDrawingBinding";
import { useRiskDrawingBinding } from "./useRiskDrawingBinding";
import { usePaneLayoutActions } from "./usePaneLayoutActions";
import { useJournalPatternGoto } from "./useJournalPatternGoto";
import { usePatternCapture } from "./usePatternCapture";
import { useCellCrosshair } from "./useCellCrosshair";
import { useDrawingToolbarCommands } from "./useDrawingToolbarCommands";
import { useChartTemplateActions } from "./useChartTemplateActions";
import { useChartCellContextMenus } from "./useChartCellContextMenus";
import { useChartCellIndicatorActions } from "./useChartCellIndicatorActions";
import { useRegisterActiveChart } from "./useRegisterActiveChart";
import MarketContextBreadcrumb from "../chart-chrome/MarketContextBreadcrumb";
import {
  mergeChartSettings,
  migrateChartSettings,
  patchChartSettings,
  stripLegacyFactoryTimeZoneOnLoad,
  type CellConfig,
  type RequiredChartSettings,
  type ToolbarPrefs,
} from "@/lib/chartConfig";
import type { DrawingStyles } from "@edge/chart-core/contracts";
import type { Range } from "@edge/chart-core/contracts";
import type { ChartTimeZone } from "@edge/chart-core/timeZone";
import { applyRangePresetSelect } from "@edge/chart-react/engine/rangePresetTransition";
import { injectScriptFixtures, isScriptFixtureDevEnabled } from "@/lib/chart/scriptFixtureDev";
import { buildAlertPrefillFromDrawing } from "@/lib/alerts/drawingAlertGeometry";
import { buildAlertPrefillWorkspaceLink } from "@/lib/alerts/openAlertPrefill";
import { createTradePlanAlerts } from "@/lib/alerts/tradePlanAlerts";
import { positionOrderLevelsFromDrawing } from "@/lib/trading/positionTradeSetup";
import { buildWorkspaceDeepLink } from "@/lib/appWorkspace/deepLinks";
import type { ChartHandle } from "./EdgeChart";
import type { useChartCellModalState } from "./useChartCellModalState";
import type { useChartCellFeedBinding } from "./useChartCellFeedBinding";
import type { useDrawingLayoutSync } from "./useDrawingLayoutSync";
import type { ChartSymbolNav } from "../chart-chrome/ChartGrid";
import type { SymbolSelectResult } from "@/lib/watchlist/types";
import type { PriceAxisAnnotation } from "@edge/chart-core/priceAxisTypes";
import type { useMarketDataQuotes } from "../MarketDataProvider";
import type { useScriptLibraryOptional } from "@/lib/scriptLibrary/ScriptLibraryContext";
import type { useOptionalAppWorkspace } from "../app-workspace/AppWorkspaceContext";
import type { usePatternLibraryOptional } from "../pattern-library/PatternLibraryContext";
import type { useChartSync } from "../ChartSyncContext";
import type { useSidebarOptional } from "../SidebarContext";
import type { useTradeSetupBindingOptional } from "../trading/TradeSetupBindingContext";
import type { useRiskPositionBindingOptional } from "../risk/RiskPositionBindingContext";

type ModalState = ReturnType<typeof useChartCellModalState>;
type FeedBinding = ReturnType<typeof useChartCellFeedBinding>;
type DrawingSync = ReturnType<typeof useDrawingLayoutSync>;

type Params = {
  chartRef: React.RefObject<ChartHandle | null>;
  chartId: string;
  config: CellConfig;
  theme: "light" | "dark";
  compact: boolean;
  isActive: boolean;
  toolbarPrefs: ToolbarPrefs;
  symbolNav?: ChartSymbolNav;
  onConfigChange: (next: CellConfig) => void;
  onToolbarPrefsChange: (next: ToolbarPrefs) => void;
  appTimeZone: ChartTimeZone;
  modal: ModalState;
  feed: FeedBinding;
  drawing: DrawingSync;
  flushDrawingsPersist: DrawingSync["flushDrawingsPersist"];
  flushViewportPersist: (chartOverride?: ChartHandle | null) => void;
  clearPersistedViewport: () => void;
  markViewportDirty: () => void;
  managePriceAxisAnnotations: PriceAxisAnnotation[];
  sync: ReturnType<typeof useChartSync>;
  marketData: ReturnType<typeof useMarketDataQuotes>;
  sidebar: ReturnType<typeof useSidebarOptional>;
  tradeBinding: ReturnType<typeof useTradeSetupBindingOptional>;
  riskBinding: ReturnType<typeof useRiskPositionBindingOptional>;
  scriptLibrary: ReturnType<typeof useScriptLibraryOptional>;
  workspace: ReturnType<typeof useOptionalAppWorkspace>;
  patternLibrary: ReturnType<typeof usePatternLibraryOptional>;
  requestScriptLibrary: () => void;
  journalGotoMs: number | null;
  patternGotoMs: number | null;
  consumeJournalGoto: () => void;
  consumePatternGoto: () => void;
  activeChartBridge: ReturnType<typeof import("../ActiveChartContext").useActiveChartBridge>;
  activeTool: string;
  setActiveTool: React.Dispatch<React.SetStateAction<string>>;
  replayActive: boolean;
  setReplayActive: React.Dispatch<React.SetStateAction<boolean>>;
  setHistoryRevision: React.Dispatch<React.SetStateAction<number>>;
  historyRevision: number;
};

export function useChartCellEngineMount({
  feed,
  chartRef,
  flushDrawingsPersist,
  flushViewportPersist,
  setActiveTool,
}: {
  feed: FeedBinding;
  chartRef: React.RefObject<ChartHandle | null>;
  flushDrawingsPersist: DrawingSync["flushDrawingsPersist"];
  flushViewportPersist: (chartOverride?: ChartHandle | null) => void;
  setActiveTool: React.Dispatch<React.SetStateAction<string>>;
}) {
  useLayoutEffect(() => {
    if (feed.mountChartEngine) {
      feed.lastChartHandleRef.current = chartRef.current;
    }
  });

  useLayoutEffect(() => {
    const wasMounted = feed.mountChartEngineRef.current;
    if (wasMounted && !feed.mountChartEngine) {
      const chart = feed.lastChartHandleRef.current;
      chart?.stopDrawing();
      setActiveTool("__cursor__");
      flushDrawingsPersist(chart);
      flushViewportPersist(chart);
      feed.lastChartHandleRef.current = null;
    }
    if (!wasMounted && feed.mountChartEngine) {
      feed.setChartEngineGeneration((generation) => generation + 1);
    }
    feed.mountChartEngineRef.current = feed.mountChartEngine;
  }, [feed.mountChartEngine, flushDrawingsPersist, flushViewportPersist, feed, chartRef, setActiveTool]);
}

export function useChartCellOrchestration({
  chartRef,
  chartId,
  config,
  theme,
  compact,
  isActive,
  toolbarPrefs,
  symbolNav,
  onConfigChange,
  onToolbarPrefsChange,
  appTimeZone,
  modal,
  feed,
  drawing,
  flushDrawingsPersist,
  flushViewportPersist,
  clearPersistedViewport,
  markViewportDirty,
  managePriceAxisAnnotations,
  sync,
  marketData,
  sidebar,
  tradeBinding,
  riskBinding,
  scriptLibrary,
  workspace,
  patternLibrary,
  requestScriptLibrary,
  journalGotoMs,
  patternGotoMs,
  consumeJournalGoto,
  consumePatternGoto,
  activeChartBridge,
  activeTool,
  setActiveTool,
  replayActive,
  setReplayActive,
  setHistoryRevision,
  historyRevision,
}: Params) {
  const { overlays, overlaysDirtyRef } = drawing;
  const router = useRouter();

  const handleDrawingStylesSave = useCallback(
    (id: string, patch: Partial<DrawingStyles>) => {
      modal.handleDrawingStylesSave(id, patch, () => {
        overlaysDirtyRef.current = true;
      });
    },
    [modal.handleDrawingStylesSave, overlaysDirtyRef],
  );

  const update = useCallback(
    (patch: Partial<CellConfig>) => {
      const next = { ...config, ...patch };
      const sessionChanged =
        (patch.symbol !== undefined && patch.symbol !== config.symbol) ||
        (patch.interval !== undefined && patch.interval !== config.interval) ||
        (patch.range !== undefined && patch.range !== config.range) ||
        (patch.rangePreset !== undefined && patch.rangePreset !== config.rangePreset);
      if (sessionChanged) {
        next.viewport = undefined;
      }
      onConfigChange(next);
    },
    [config, onConfigChange],
  );

  const handleResetChartView = useCallback(() => {
    chartRef.current?.resetChartView();
    clearPersistedViewport();
  }, [chartRef, clearPersistedViewport]);

  useTradeDrawingBinding({
    chartRef,
    chartId,
    overlays,
    tradeBinding,
  });
  useRiskDrawingBinding({ chartRef, chartId, overlays, isActive, riskBinding });

  const paneLayout = usePaneLayoutActions({ config, update });

  useJournalPatternGoto({
    chartRef,
    isActive,
    candleCount: feed.candleCount,
    journalGotoMs,
    patternGotoMs,
    consumeJournalGoto,
    consumePatternGoto,
  });

  const magnet = toolbarPrefs.magnet ?? false;
  const keepDrawing = toolbarPrefs.keepDrawing ?? false;
  const groupSelections = resolveGroupSelections(
    toolbarPrefs.groupSelections as Record<string, import("../chart-icons/toolGroups").DrawingToolName> | undefined,
  );

  useEffect(() => {
    if (!isActive) return;
    chartRef.current?.setMagnet(magnet);
    chartRef.current?.setKeepDrawingMode(keepDrawing);
  }, [isActive, magnet, keepDrawing, chartRef]);

  const scriptFixtureInjectedRef = useRef(false);
  useEffect(() => {
    if (scriptFixtureInjectedRef.current || !isScriptFixtureDevEnabled()) return;
    scriptFixtureInjectedRef.current = true;
    const next = injectScriptFixtures(config);
    if (next !== config) {
      onConfigChange(next);
    }
  }, [config, onConfigChange]);

  const strippedFactoryTzRef = useRef(false);
  useEffect(() => {
    if (strippedFactoryTzRef.current) return;
    strippedFactoryTzRef.current = true;
    const rawTz = migrateChartSettings(config.chartSettings).symbol?.timeZone;
    if (rawTz !== "UTC") return;
    onConfigChange({
      ...config,
      chartSettings: stripLegacyFactoryTimeZoneOnLoad(config.chartSettings),
    });
  }, [config, onConfigChange]);

  const chartSettingsMerged = useMemo(
    (): RequiredChartSettings =>
      mergeChartSettings(config.chartSettings, { defaultTimeZone: appTimeZone }),
    [config.chartSettings, appTimeZone],
  );

  const priceScaleSide: PriceScaleSide =
    chartSettingsMerged.scales.priceScalePlacement === "left" ? "left" : "right";

  const patternCapture = usePatternCapture({
    chartRef,
    chartOverlayRef: modal.chartOverlayRef,
    chartId,
    config,
    isActive,
    priceScaleSide,
    patternLibrary,
    setActiveTool,
  });

  const crosshair = useCellCrosshair({
    captureActive: patternCapture.captureActive,
    refreshCaptureViewport: patternCapture.refreshCaptureViewport,
    setVisibleRangeTick: patternCapture.setVisibleRangeTick,
    setCaptureHoverBar: patternCapture.setCaptureHoverBar,
  });

  const drawingToolbar = useDrawingToolbarCommands({
    chartRef,
    config,
    isActive,
    captureActive: patternCapture.captureActive,
    toolbarPrefs,
    overlays,
    selectedOverlayId: modal.selectedOverlayId,
    crosshairData: crosshair.crosshairData,
    overlaysDirtyRef,
    setActiveTool,
    setSelectedOverlayId: modal.setSelectedOverlayId,
    setContextMenu: modal.setContextMenu,
    setHistoryRevision,
    setRenameOverlayId: modal.setRenameOverlayId,
    onToolbarPrefsChange,
    onConfigChange,
    onResetChartView: handleResetChartView,
  });

  const templates = useChartTemplateActions({
    config,
    onConfigChange,
    chartSettingsOpen: modal.chartSettingsOpen,
    templatePickerOpen: modal.templatePickerOpen,
    templateRevision: modal.templateRevision,
    setContextMenu: modal.setContextMenu,
    setTemplateRevision: modal.setTemplateRevision,
    setTemplatePickerTab: modal.setTemplatePickerTab,
    setTemplatePickerOpen: modal.setTemplatePickerOpen,
  });

  const handleOpenAlertFromDrawing = useCallback(
    (overlayId: string) => {
      const symbol = config.symbol.trim().toUpperCase();
      if (!symbol) return;
      const drawings = chartRef.current?.serializeDrawings() ?? [];
      const drawingEntry = drawings.find((entry) => entry.id === overlayId);
      if (!drawingEntry) return;
      const quote = marketData?.quotesBySymbol.get(symbol) ?? null;
      const quotePrice = quote?.regularMarketPrice ?? null;
      const prefill = buildAlertPrefillFromDrawing({ symbol, drawing: drawingEntry, quotePrice });
      if (!prefill) return;
      router.push(buildAlertPrefillWorkspaceLink(prefill));
    },
    [config.symbol, marketData?.quotesBySymbol, router, chartRef],
  );

  const handleAddTradePlanAlerts = useCallback(
    async (overlayId: string) => {
      const symbol = config.symbol.trim().toUpperCase();
      if (!symbol) return;
      const drawings = chartRef.current?.serializeDrawings() ?? [];
      const drawingEntry = drawings.find((entry) => entry.id === overlayId);
      if (!drawingEntry?.id) return;
      const levels = positionOrderLevelsFromDrawing(drawingEntry);
      if (!levels) return;
      await createTradePlanAlerts({ symbol, drawingId: drawingEntry.id, levels });
      router.push(buildWorkspaceDeepLink({ surface: "alerts" }));
    },
    [config.symbol, router, chartRef],
  );

  const contextMenus = useChartCellContextMenus({
    chartRef,
    chartId,
    config,
    overlays,
    crosshairData: crosshair.crosshairData,
    displayCandlesRef: feed.displayCandlesRef,
    chartSettingsMerged,
    latestCrosshairPlotXRef: crosshair.latestCrosshairPlotXRef,
    sidebar,
    tradeBinding,
    onOpenAlertFromDrawing: handleOpenAlertFromDrawing,
    onAddTradePlanAlerts: handleAddTradePlanAlerts,
    setContextMenu: modal.setContextMenu,
    setChartSettingsSection: modal.setChartSettingsSection,
    setChartSettingsOpen: modal.setChartSettingsOpen,
    setGoToOpen: modal.setGoToOpen,
    setTemplatePickerOpen: modal.setTemplatePickerOpen,
    setSettingsOverlayId: modal.setSettingsOverlayId,
    setSelectedOverlayId: modal.setSelectedOverlayId,
    update,
    onConfigChange,
    handleClearDrawings: drawingToolbar.handleClearDrawings,
    handlePasteDrawings: drawingToolbar.handlePasteDrawings,
    handleSaveChartTemplate: templates.handleSaveChartTemplate,
    openChartTemplatePicker: templates.openChartTemplatePicker,
    overlayActions: drawingToolbar.overlayActions,
    openRenameOverlay: drawingToolbar.openRenameOverlay,
    applyPriceScaleType: drawingToolbar.applyPriceScaleType,
    onResetChartView: handleResetChartView,
  });

  const indicators = useChartCellIndicatorActions({
    config,
    update,
    scriptLibrary,
    workspace,
    requestScriptLibrary,
    setPickerOpen: modal.setPickerOpen,
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
      onConfigChange({ ...applyRangePresetSelect(config, range), viewport: undefined });
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

  const uiCommands = useCallback(
    () => ({
      openGoTo: () => modal.setGoToOpen(true),
      runSnapshot: (action: import("@/lib/chart/chartSnapshot").SnapshotAction) =>
        drawingToolbar.runCellSnapshot(action),
      togglePatternCapture: patternCapture.togglePatternCapture,
      undoPatternCapture: patternCapture.undoPatternCapture,
      savePatternCapture: () => void patternCapture.savePatternCapture(),
      cancelPatternCapture: patternCapture.cancelPatternCapture,
      isPatternCaptureActive: () => patternCapture.captureActive,
      canSavePatternCapture: () => patternCapture.canSaveCapture(),
    }),
    [modal.setGoToOpen, drawingToolbar.runCellSnapshot, patternCapture],
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
    dataMeta: feed.dataMeta,
    crosshairDataIndex: crosshair.crosshairData.dataIndex,
    displayCandlesRef: feed.displayCandlesRef,
    candlesRevision: feed.candlesRevision,
    overlayActions: drawingToolbar.overlayActions,
    dataWindowActions,
    onConfigChange,
    setPickerOpen: modal.setPickerOpen,
    replayActive,
    canUndo,
    canRedo,
    setChartSettingsSection: modal.setChartSettingsSection,
    setChartSettingsOpen: modal.setChartSettingsOpen,
    setTemplatePickerTab: modal.setTemplatePickerTab,
    setTemplatePickerOpen: modal.setTemplatePickerOpen,
    setReplayActive,
    setHistoryRevision,
    addIndicator: indicators.addIndicator,
    chartCommands: drawingToolbar.chartCommands,
    drawingCommands: drawingToolbar.drawingCommands,
    drawingToolbarActions: drawingToolbar.drawingToolbarActions,
    uiCommands,
    activeTool,
    allLocked: drawingToolbar.allLocked,
    allHidden: drawingToolbar.allHidden,
    hasDrawingSelection: modal.selectedOverlayId != null,
    captureActive: patternCapture.captureActive,
  });

  const handleCrosshairFire = useCallback(
    (ts: number | null) => {
      sync?.broadcast(chartId, ts);
    },
    [sync, chartId],
  );

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

  return {
    handleDrawingStylesSave,
    paneLayout,
    patternCapture,
    crosshair,
    drawingToolbar,
    templates,
    contextMenus,
    indicators,
    handleRangeSelect,
    handleTimeZoneChange,
    handleCrosshairFire,
    legendContextSlot,
    chartSettingsMerged,
    priceScaleSide,
    magnet,
    keepDrawing,
    groupSelections,
    managePriceAxisAnnotations,
    collapsedKeys: new Set(config.collapsedPanes ?? []),
    maximizedKey: config.maximizedPane ?? null,
    paneOrder: config.paneOrder ?? [],
    markViewportDirty,
  };
}
