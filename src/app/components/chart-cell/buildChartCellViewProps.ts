import type { RefObject } from "react";
import type { ChartHandle } from "./EdgeChart";
import type { ChartCellViewProps } from "./ChartCellView";
import type { ChartAnnotationChannelMarker } from "@edge/chart-core";
import type { CellConfig, ToolbarPrefs } from "@/lib/chartConfig";
import type { ChartTimeZone } from "@edge/chart-core/timeZone";
import type { PaletteId } from "@/lib/design-system/palettes";
import type { RailMode } from "@/lib/responsive/responsiveLayout";
import type { useChartCellModalState, useChartCellModalSelection } from "./useChartCellModalState";
import type { useChartCellFeedBinding } from "./useChartCellFeedBinding";
import type { useChartCellOrchestration } from "./useChartCellOrchestration";
import type { useDrawingLayoutSync } from "./useDrawingLayoutSync";
import type { useCopilotActions } from "../copilot/CopilotContext";
import type { usePatternLibraryOptional } from "../pattern-library/PatternLibraryContext";
import type { useScriptLibraryOptional } from "@/lib/scriptLibrary/ScriptLibraryContext";

type BuildParams = {
  chartId: string;
  config: CellConfig;
  configRevision: number;
  theme: "light" | "dark";
  palette: PaletteId;
  compact: boolean;
  railMode: RailMode;
  isActive: boolean;
  showDrawingRail: boolean;
  toolbarPrefs: ToolbarPrefs;
  onFocus?: () => void;
  onConfigChange: (next: CellConfig) => void;
  journalMarkers: ChartAnnotationChannelMarker[];
  chartRef: RefObject<ChartHandle | null>;
  appTimeZone: ChartTimeZone;
  replayActive: boolean;
  activeTool: string;
  modal: ReturnType<typeof useChartCellModalState>;
  selection: ReturnType<typeof useChartCellModalSelection>;
  feed: ReturnType<typeof useChartCellFeedBinding>;
  drawing: ReturnType<typeof useDrawingLayoutSync>;
  orchestration: ReturnType<typeof useChartCellOrchestration>;
  copilot: ReturnType<typeof useCopilotActions>;
  patternLibrary: ReturnType<typeof usePatternLibraryOptional>;
  scriptLibrary: ReturnType<typeof useScriptLibraryOptional>;
  policyApply?: {
    accountId: string;
    environment: import("@/lib/trading/types").TradingEnvironment;
    dollarRisk: number | null;
    playbookInstances: import("@/lib/trading/playbook/types").PlaybookInstance[];
    onPlaybookInstancesChange: () => void;
    onTradeSetup: (drawingId: string, seedQuantity?: number) => void;
  };
};

export function buildChartCellViewProps({
  chartId,
  config,
  configRevision,
  theme,
  palette,
  compact,
  railMode,
  isActive,
  showDrawingRail,
  toolbarPrefs,
  onFocus,
  onConfigChange,
  journalMarkers,
  chartRef,
  appTimeZone,
  replayActive,
  activeTool,
  modal,
  selection,
  feed,
  drawing,
  orchestration,
  copilot,
  patternLibrary,
  scriptLibrary,
  policyApply,
}: BuildParams): ChartCellViewProps {
  const { overlays, overlaysDirtyRef, suppressDrawingPersistRef, lastAppliedDrawingRevisionRef } =
    drawing;
  const {
    patternCapture,
    crosshair,
    drawingToolbar,
    templates,
    contextMenus,
    indicators,
    handleDrawingStylesSave,
    paneLayout,
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
    collapsedKeys,
    maximizedKey,
    paneOrder,
    markViewportDirty,
  } = orchestration;

  return {
    chartId,
    config,
    configRevision,
    theme,
    palette,
    compact,
    railMode,
    isActive,
    live: feed.live,
    showDrawingRail,
    toolbarPrefs,
    onFocus,
    onConfigChange,
    journalMarkers,
    mountChartEngine: feed.mountChartEngine,
    chartRetryKey: feed.chartRetryKey,
    handleChartRetry: feed.handleChartRetry,
    chartReloadKey: feed.chartReloadKey,
    chartRef,
    chartOverlayRef: modal.chartOverlayRef,
    visibleCount: feed.visibleCount,
    appTimeZone,
    liveQuotePrice: feed.liveQuotePrice,
    liveMarketSession: feed.liveMarketSession,
    marketSessionLabel: feed.marketSessionLabel,
    legendContextSlot,
    contextMenu: modal.contextMenu,
    setContextMenu: modal.setContextMenu,
    activeTool,
    magnet,
    keepDrawing,
    allLocked: drawingToolbar.allLocked,
    allHidden: drawingToolbar.allHidden,
    groupSelections,
    handleGroupSelectionsChange: drawingToolbar.handleGroupSelectionsChange,
    handleToolSelect: drawingToolbar.handleToolSelect,
    handleClearDrawings: drawingToolbar.handleClearDrawings,
    handleToggleMagnet: drawingToolbar.handleToggleMagnet,
    handleToggleKeepDrawing: drawingToolbar.handleToggleKeepDrawing,
    handleToggleLockAll: drawingToolbar.handleToggleLockAll,
    handleToggleHideAll: drawingToolbar.handleToggleHideAll,
    handleZoomIn: drawingToolbar.handleZoomIn,
    selectedOverlayId: modal.selectedOverlayId,
    handleDeleteSelected: drawingToolbar.handleDeleteSelected,
    captureActive: patternCapture.captureActive,
    capture: {
      captureState: patternCapture.captureState,
      dispatchCapture: patternCapture.dispatchCapture,
      captureHoverBar: patternCapture.captureHoverBar,
      captureViewport: patternCapture.captureViewport,
      captureSaveMessage: patternCapture.captureSaveMessage,
      captureSavedRecordId: patternCapture.captureSavedRecordId,
      undoPatternCapture: patternCapture.undoPatternCapture,
      cancelPatternCapture: patternCapture.cancelPatternCapture,
      savePatternCapture: patternCapture.savePatternCapture,
      handleCaptureOverlayClick: patternCapture.handleCaptureOverlayClick,
      handleCaptureOverlayPointerMove: patternCapture.handleCaptureOverlayPointerMove,
      canSaveCapture: patternCapture.canSaveCapture,
      canUndoCapture: patternCapture.canUndoCapture,
    },
    priceScaleSide,
    patternLibrary,
    selectedDrawing: selection.selectedDrawing,
    selectedDrawingBounds: selection.selectedDrawingBounds,
    drawingToolbarBounds: modal.drawingToolbarBounds,
    toolbarDragOffset: modal.toolbarDragOffset,
    setToolbarDragOffset: modal.setToolbarDragOffset,
    overlays,
    overlaysDirtyRef,
    copilot,
    setSettingsOverlayId: modal.setSettingsOverlayId,
    handleOverlayRightClick: contextMenus.handleOverlayRightClick,
    handleCrosshairMove: crosshair.handleCrosshairMove,
    handleCrosshairFire,
    handleLegendAction: modal.handleLegendAction,
    handleDrawingDisarmed: drawingToolbar.handleDrawingDisarmed,
    handleChartContextMenu: contextMenus.handleChartContextMenu,
    handlePriceScaleContextMenu: contextMenus.handlePriceScaleContextMenu,
    removeIndicator: indicators.removeIndicator,
    handleCollapsePane: paneLayout.handleCollapsePane,
    handleMaximizePane: paneLayout.handleMaximizePane,
    handleMovePaneUp: paneLayout.handleMovePaneUp,
    handleMovePaneDown: paneLayout.handleMovePaneDown,
    handlePaneHeightsChange: paneLayout.handlePaneHeightsChange,
    handleDataLoaded: feed.handleDataLoaded,
    handleDataMetaChange: feed.handleDataMetaChange,
    handleCandlesChange: feed.handleCandlesChange,
    scriptLibrary,
    collapsedKeys,
    maximizedKey,
    paneOrder,
    markViewportDirty,
    managePriceAxisAnnotations,
    candleCount: feed.candleCount,
    chartSettingsMerged,
    handleRangeSelect,
    setGoToOpen: modal.setGoToOpen,
    handleTimeZoneChange,
    pickerOpen: modal.pickerOpen,
    setPickerOpen: modal.setPickerOpen,
    addIndicator: indicators.addIndicator,
    addScriptIndicator: indicators.addScriptIndicator,
    handleEditScript: indicators.handleEditScript,
    handleNewScript: indicators.handleNewScript,
    settingsIndicator: modal.settingsIndicator,
    settingsIndicatorId: modal.settingsIndicatorId,
    setSettingsIndicatorId: modal.setSettingsIndicatorId,
    handleIndicatorParamsSave: modal.handleIndicatorParamsSave,
    handleSaveStudyTemplate: templates.handleSaveStudyTemplate,
    settingsDrawing: selection.settingsDrawing,
    settingsOverlayId: modal.settingsOverlayId,
    handleDrawingStylesSave,
    chartSettingsOpen: modal.chartSettingsOpen,
    chartSettingsSection: modal.chartSettingsSection,
    onChartSettingsClose: () => modal.setChartSettingsOpen(false),
    handleChartSettingsSave: modal.handleChartSettingsSave,
    chartTemplates: templates.chartTemplates,
    handleSaveChartTemplate: templates.handleSaveChartTemplate,
    handleApplyTemplate: templates.handleApplyTemplate,
    goToOpen: modal.goToOpen,
    onGoToClose: () => modal.setGoToOpen(false),
    lastCandleTimestamp: feed.lastCandleTimestamp,
    renameOverlayId: modal.renameOverlayId,
    renameOverlayLabel: selection.renameOverlay?.label ?? "",
    onRenameOverlayClose: () => modal.setRenameOverlayId(null),
    handleRenameOverlaySave: modal.handleRenameOverlaySave,
    templatePickerOpen: modal.templatePickerOpen,
    templatePickerTab: modal.templatePickerTab,
    onTemplatePickerClose: () => modal.setTemplatePickerOpen(false),
    replayActive,
    setVisibleCount: feed.setVisibleCount,
    suppressDrawingPersistRef,
    lastAppliedDrawingRevisionRef,
    policyApply,
  };
}
