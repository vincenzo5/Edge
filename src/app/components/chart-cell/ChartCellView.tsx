"use client";

import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import EdgeChart, { type ChartHandle, type DrawingScreenBounds } from "./EdgeChart";
import DrawingToolbar from "../drawing/DrawingToolbar";
import DrawingSelectionToolbar from "../drawing/DrawingSelectionToolbar";
import ChartRangeBar from "../chart-chrome/ChartRangeBar";
import ChartCellDialogs from "./ChartCellDialogs";
import ChartErrorBoundary from "./ChartErrorBoundary";
import InactiveChartSurface from "./InactiveChartSurface";
import ChartSyncBridge from "./ChartSyncBridge";
import ContextMenu, { type ContextMenuItem } from "../ContextMenu";
import MarketContextBreadcrumb from "../chart-chrome/MarketContextBreadcrumb";
import PatternCapturePanel from "../chart-chrome/PatternCapturePanel";
import PatternCaptureOverlay from "../chart-chrome/PatternCaptureOverlay";
import type { Candle, DrawingStyles, SerializedDrawing } from "@/lib/chart/contracts";
import type { ChartAnnotationChannelMarker, ChartDataMeta } from "@edge/chart-core";
import type { MarketSessionKind } from "@edge/chart-core";
import type {
  CellConfig,
  IndicatorConfig,
  RequiredChartSettings,
  ToolbarPrefs,
  TrackedOverlay,
} from "@/lib/chartConfig";
import type { Range } from "@/lib/chart/contracts";
import type { ChartTimeZone } from "@/lib/chart/timeZone";
import type { DrawingToolName } from "../chart-icons/toolGroups";
import type { PriceAxisAnnotation } from "@edge/chart-core/priceAxisTypes";
import type { RailMode } from "@/lib/responsive/responsiveLayout";
import type { PaletteId } from "@/lib/design-system/palettes";
import type { PriceScaleSide } from "@/lib/chart/layout";
import type { InputValue } from "@/lib/chart/plugin-api";
import type { LineStyleOverride } from "@/lib/chart/contracts";
import type { PresetEnvelope } from "@/lib/chart/presets/types";
import type { usePatternCapture } from "./usePatternCapture";
import type { useCellCrosshair } from "./useCellCrosshair";
import type { useCopilot } from "../copilot/CopilotContext";
import type { usePatternLibraryOptional } from "../pattern-library/PatternLibraryContext";
import type { useScriptLibraryOptional } from "@/lib/scriptLibrary/ScriptLibraryContext";

const EMPTY_CONTEXT_MENU_ITEMS: ContextMenuItem[] = [];

type CaptureSlice = Pick<
  ReturnType<typeof usePatternCapture>,
  | "captureState"
  | "dispatchCapture"
  | "captureHoverBar"
  | "captureViewport"
  | "captureSaveMessage"
  | "captureSavedRecordId"
  | "undoPatternCapture"
  | "cancelPatternCapture"
  | "savePatternCapture"
  | "handleCaptureOverlayClick"
  | "handleCaptureOverlayPointerMove"
  | "canSaveCapture"
  | "canUndoCapture"
>;

export type ChartCellViewProps = {
  chartId: string;
  config: CellConfig;
  theme: "light" | "dark";
  palette: PaletteId;
  compact: boolean;
  railMode: RailMode;
  isActive: boolean;
  live: boolean;
  showDrawingRail: boolean;
  toolbarPrefs: ToolbarPrefs;
  onFocus?: () => void;
  onConfigChange: (next: CellConfig) => void;
  journalMarkers: ChartAnnotationChannelMarker[];
  mountChartEngine: boolean;
  chartRetryKey: number;
  handleChartRetry: () => void;
  chartReloadKey: number;
  chartRef: RefObject<ChartHandle | null>;
  chartOverlayRef: RefObject<HTMLDivElement | null>;
  visibleCount: number | null;
  appTimeZone: ChartTimeZone;
  liveQuotePrice: number | null;
  liveMarketSession: MarketSessionKind | null;
  marketSessionLabel: string | null;
  legendContextSlot: React.ReactNode;
  contextMenu: {
    position: { x: number; y: number };
    items: ContextMenuItem[];
    header?: string;
  } | null;
  setContextMenu: Dispatch<
    SetStateAction<{
      position: { x: number; y: number };
      items: ContextMenuItem[];
      header?: string;
    } | null>
  >;
  activeTool: string;
  magnet: boolean;
  keepDrawing: boolean;
  allLocked: boolean;
  allHidden: boolean;
  groupSelections: Record<string, DrawingToolName>;
  handleGroupSelectionsChange: (next: Record<string, DrawingToolName>) => void;
  handleToolSelect: (tool: string) => void;
  handleClearDrawings: () => void;
  handleToggleMagnet: (on: boolean) => void;
  handleToggleKeepDrawing: (on: boolean) => void;
  handleToggleLockAll: () => void;
  handleToggleHideAll: () => void;
  handleZoomIn: () => void;
  selectedOverlayId: string | null;
  handleDeleteSelected: () => void;
  captureActive: boolean;
  capture: CaptureSlice;
  priceScaleSide: PriceScaleSide;
  patternLibrary: ReturnType<typeof usePatternLibraryOptional>;
  selectedDrawing: SerializedDrawing | null;
  selectedDrawingBounds: DrawingScreenBounds | null;
  drawingToolbarBounds: { width: number; height: number };
  toolbarDragOffset: { x: number; y: number };
  setToolbarDragOffset: Dispatch<SetStateAction<{ x: number; y: number }>>;
  overlays: TrackedOverlay[];
  overlaysDirtyRef: MutableRefObject<boolean>;
  copilot: ReturnType<typeof useCopilot>;
  setSettingsOverlayId: Dispatch<SetStateAction<string | null>>;
  handleOverlayRightClick: (
    overlay: TrackedOverlay,
    position: { x: number; y: number },
  ) => void;
  crosshairData: ReturnType<typeof useCellCrosshair>["crosshairData"];
  handleCrosshairMove: ReturnType<typeof useCellCrosshair>["handleCrosshairMove"];
  handleCrosshairFire: (ts: number | null) => void;
  handleLegendAction: (actionId: string) => void;
  handleDrawingDisarmed: () => void;
  handleChartContextMenu: NonNullable<
    React.ComponentProps<typeof EdgeChart>["onChartContextMenu"]
  >;
  handlePriceScaleContextMenu: NonNullable<
    React.ComponentProps<typeof EdgeChart>["onPriceScaleContextMenu"]
  >;
  removeIndicator: (id: string) => void;
  handleCollapsePane: (key: string) => void;
  handleMaximizePane: (key: string) => void;
  handleMovePaneUp: (key: string) => void;
  handleMovePaneDown: (key: string) => void;
  handlePaneHeightsChange: (heights: Record<string, number>) => void;
  handleDataLoaded: (info: { count: number }) => void;
  handleDataMetaChange: (meta: ChartDataMeta | null) => void;
  handleCandlesChange: (candles: Candle[]) => void;
  scriptLibrary: ReturnType<typeof useScriptLibraryOptional>;
  collapsedKeys: Set<string>;
  maximizedKey: string | null;
  paneOrder: string[];
  markViewportDirty: () => void;
  managePriceAxisAnnotations: PriceAxisAnnotation[];
  candleCount: number;
  chartSettingsMerged: RequiredChartSettings;
  handleRangeSelect: (range: Range) => void;
  setGoToOpen: Dispatch<SetStateAction<boolean>>;
  handleTimeZoneChange: (timeZone: ChartTimeZone) => void;
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
  addIndicator: (ind: Pick<IndicatorConfig, "name" | "pane">) => void;
  addScriptIndicator: (params: {
    scriptId: string;
    revision: string;
    name: string;
    pane: "main" | "sub";
  }) => void;
  handleEditScript: (scriptId: string) => void;
  handleNewScript: () => void;
  settingsIndicator: IndicatorConfig | null;
  settingsIndicatorId: string | null;
  setSettingsIndicatorId: Dispatch<SetStateAction<string | null>>;
  handleIndicatorParamsSave: (
    id: string,
    patch: {
      inputs?: Record<string, InputValue>;
      styles?: Record<string, LineStyleOverride>;
    },
  ) => void;
  handleSaveStudyTemplate: (indicator: IndicatorConfig) => void;
  settingsDrawing: SerializedDrawing | null;
  settingsOverlayId: string | null;
  handleDrawingStylesSave: (id: string, patch: Partial<DrawingStyles>) => void;
  chartSettingsOpen: boolean;
  chartSettingsSection: "symbol" | "status" | "scales" | "canvas" | "trading";
  onChartSettingsClose: () => void;
  handleChartSettingsSave: (next: RequiredChartSettings) => void;
  chartTemplates: ReturnType<typeof import("./useChartTemplateActions").useChartTemplateActions>["chartTemplates"];
  handleSaveChartTemplate: ReturnType<
    typeof import("./useChartTemplateActions").useChartTemplateActions
  >["handleSaveChartTemplate"];
  handleApplyTemplate: (preset: PresetEnvelope) => void;
  goToOpen: boolean;
  onGoToClose: () => void;
  lastCandleTimestamp: number | null;
  renameOverlayId: string | null;
  renameOverlayLabel: string;
  onRenameOverlayClose: () => void;
  handleRenameOverlaySave: (label: string) => void;
  templatePickerOpen: boolean;
  templatePickerTab: "chart" | "study";
  onTemplatePickerClose: () => void;
  replayActive: boolean;
  setVisibleCount: Dispatch<SetStateAction<number | null>>;
  suppressDrawingPersistRef: MutableRefObject<boolean>;
  lastAppliedDrawingsRef: MutableRefObject<string>;
};

export default function ChartCellView(props: ChartCellViewProps) {
  const {
    chartId,
    config,
    theme,
    palette,
    compact,
    railMode,
    isActive,
    live,
    showDrawingRail,
    onFocus,
    onConfigChange,
    journalMarkers,
    mountChartEngine,
    chartRetryKey,
    handleChartRetry,
    chartReloadKey,
    chartRef,
    chartOverlayRef,
    visibleCount,
    appTimeZone,
    liveQuotePrice,
    liveMarketSession,
    marketSessionLabel,
    legendContextSlot,
    contextMenu,
    setContextMenu,
    activeTool,
    magnet,
    keepDrawing,
    allLocked,
    allHidden,
    groupSelections,
    handleGroupSelectionsChange,
    handleToolSelect,
    handleClearDrawings,
    handleToggleMagnet,
    handleToggleKeepDrawing,
    handleToggleLockAll,
    handleToggleHideAll,
    handleZoomIn,
    selectedOverlayId,
    handleDeleteSelected,
    captureActive,
    capture,
    priceScaleSide,
    patternLibrary,
    selectedDrawing,
    selectedDrawingBounds,
    drawingToolbarBounds,
    toolbarDragOffset,
    setToolbarDragOffset,
    overlays,
    overlaysDirtyRef,
    copilot,
    setSettingsOverlayId,
    handleOverlayRightClick,
    crosshairData,
    handleCrosshairMove,
    handleCrosshairFire,
    handleLegendAction,
    handleDrawingDisarmed,
    handleChartContextMenu,
    handlePriceScaleContextMenu,
    removeIndicator,
    handleCollapsePane,
    handleMaximizePane,
    handleMovePaneUp,
    handleMovePaneDown,
    handlePaneHeightsChange,
    handleDataLoaded,
    handleDataMetaChange,
    handleCandlesChange,
    scriptLibrary,
    collapsedKeys,
    maximizedKey,
    paneOrder,
    markViewportDirty,
    managePriceAxisAnnotations,
    candleCount,
    chartSettingsMerged,
    handleRangeSelect,
    setGoToOpen,
    handleTimeZoneChange,
    pickerOpen,
    setPickerOpen,
    addIndicator,
    addScriptIndicator,
    handleEditScript,
    handleNewScript,
    settingsIndicator,
    settingsIndicatorId,
    setSettingsIndicatorId,
    handleIndicatorParamsSave,
    handleSaveStudyTemplate,
    settingsDrawing,
    settingsOverlayId,
    handleDrawingStylesSave,
    chartSettingsOpen,
    chartSettingsSection,
    onChartSettingsClose,
    handleChartSettingsSave,
    chartTemplates,
    handleSaveChartTemplate,
    handleApplyTemplate,
    goToOpen,
    onGoToClose,
    lastCandleTimestamp,
    renameOverlayId,
    renameOverlayLabel,
    onRenameOverlayClose,
    handleRenameOverlaySave,
    templatePickerOpen,
    templatePickerTab,
    onTemplatePickerClose,
    replayActive,
    setVisibleCount,
    suppressDrawingPersistRef,
    lastAppliedDrawingsRef,
  } = props;

  const {
    captureState,
    dispatchCapture,
    captureHoverBar,
    captureViewport,
    captureSaveMessage,
    captureSavedRecordId,
    canSaveCapture,
    canUndoCapture,
    undoPatternCapture,
    cancelPatternCapture,
    savePatternCapture,
    handleCaptureOverlayClick,
    handleCaptureOverlayPointerMove,
  } = capture;

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
              {mountChartEngine ? (
                <EdgeChart
                  key={chartRetryKey}
                  ref={chartRef}
                  config={config}
                  theme={theme}
                  palette={palette}
                  compact={compact}
                  visibleCount={visibleCount}
                  chartId={chartId}
                  reloadKey={chartReloadKey}
                  onRetry={handleChartRetry}
                  defaultTimeZone={appTimeZone}
                  live={live}
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
                  scriptSourceResolver={scriptLibrary?.resolver}
                  collapsedKeys={collapsedKeys}
                  maximizedKey={maximizedKey}
                  paneOrder={paneOrder}
                  onViewportChange={markViewportDirty}
                  extraPriceAxisAnnotations={managePriceAxisAnnotations}
                />
              ) : (
                <InactiveChartSurface symbol={config.symbol} />
              )}
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
                    status: "accepted",
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
                onOpenInChat={
                  selectedDrawing.metadata?.source === "ai"
                    ? () => {
                        copilot?.openAnnotationInChat({
                          messageId: selectedDrawing.metadata?.messageId,
                          threadId: selectedDrawing.metadata?.threadId,
                          rationale: selectedDrawing.metadata?.rationale,
                        });
                      }
                    : undefined
                }
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
        onAddScript={addScriptIndicator}
        onEditScript={handleEditScript}
        onNewScript={handleNewScript}
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
        defaultTimeZone={appTimeZone}
        onChartSettingsClose={onChartSettingsClose}
        onChartSettingsSave={handleChartSettingsSave}
        chartTemplates={chartTemplates}
        onSaveChartTemplate={handleSaveChartTemplate}
        onApplyTemplate={handleApplyTemplate}
        goToOpen={goToOpen}
        onGoToClose={onGoToClose}
        crosshairTimestamp={crosshairData.timestamp}
        lastCandleTimestamp={lastCandleTimestamp}
        onGoTo={(req) =>
          chartRef.current?.goTo(req) ??
          Promise.resolve({ ok: false, reason: "no_data" })
        }
        renameOverlayId={renameOverlayId}
        renameOverlayLabel={renameOverlayLabel}
        onRenameOverlayClose={onRenameOverlayClose}
        onRenameOverlaySave={handleRenameOverlaySave}
        templatePickerOpen={templatePickerOpen}
        templatePickerTab={templatePickerTab}
        onTemplatePickerClose={onTemplatePickerClose}
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

      {mountChartEngine ? (
        <ChartSyncBridge
          chartRef={chartRef}
          chartId={chartId}
          suppressDrawingPersistRef={suppressDrawingPersistRef}
          lastAppliedDrawingsRef={lastAppliedDrawingsRef}
        />
      ) : null}
    </div>
  );
}
