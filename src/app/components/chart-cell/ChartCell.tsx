"use client";

import { memo, useMemo, useRef, useState } from "react";
import { type ChartHandle } from "./EdgeChart";
import { useJournalChartOverlay } from "../journal/journalChartOverlayContext";
import { usePatternChartGoto, usePatternLibraryOptional } from "../pattern-library/PatternLibraryContext";
import { useDrawingLayoutSync } from "./useDrawingLayoutSync";
import { useViewportPersistSync } from "./useViewportPersistSync";
import { useChartCellModalState, useChartCellModalSelection } from "./useChartCellModalState";
import { useChartCellFeedBinding } from "./useChartCellFeedBinding";
import {
  useChartCellEngineMount,
  useChartCellOrchestration,
} from "./useChartCellOrchestration";
import { buildChartCellViewProps } from "./buildChartCellViewProps";
import ChartCellView from "./ChartCellView";
import { useChartSync } from "../ChartSyncContext";
import { useActiveChartBridge } from "../ActiveChartContext";
import { useMarketDataQuotes } from "../MarketDataProvider";
import { useSidebarOptional } from "../SidebarContext";
import { useCopilotActions } from "../copilot/CopilotContext";
import type { ChartAnnotationChannelMarker } from "@edge/chart-core";
import { type CellConfig, type ToolbarPrefs } from "@/lib/chartConfig";
import { useTradeSetupBindingOptional } from "../trading/TradeSetupBindingContext";
import { useRiskPositionBindingOptional } from "../risk/RiskPositionBindingContext";
import { useScriptLibraryOptional } from "@/lib/scriptLibrary/ScriptLibraryContext";
import { useScriptLibraryMountRequest } from "@/app/components/app-workspace/ScriptLibraryMountGate";
import { useOptionalAppWorkspace } from "../app-workspace/AppWorkspaceContext";
import { useAppTimeZone } from "../AppTimeZoneProvider";
import { useAccountTradingIdentity } from "../AccountProvider";
import { usePlaybookInstances } from "../trading/usePlaybookInstances";
import {
  manageLevelsForSymbol,
  manageLevelsToPriceAxisAnnotations,
} from "@/lib/trading/playbook/manageLevels";
import type { PriceAxisAnnotation } from "@edge/chart-core/priceAxisTypes";
import type { ChartSymbolNav } from "../chart-chrome/ChartGrid";
import type { RailMode } from "@/lib/responsive/responsiveLayout";
import { DEFAULT_PALETTE, type PaletteId } from "@/lib/design-system/palettes";
import { useCellLayoutConfig, useCellLayoutRevision } from "@/lib/chart/useCellLayoutConfig";

type Props = {
  chartId: string;
  config: CellConfig;
  theme: "light" | "dark";
  palette?: PaletteId;
  compact?: boolean;
  railMode?: RailMode;
  isActive?: boolean;
  /** Candle stream subscription; defaults to isActive when unset. */
  live?: boolean;
  /** Mount EdgeChart engine; defaults to active cell or explicit live. */
  mountChartEngine?: boolean;
  showDrawingRail?: boolean;
  toolbarPrefs: ToolbarPrefs;
  symbolNav?: ChartSymbolNav;
  onFocus?: () => void;
  onConfigChange: (next: CellConfig) => void;
  onToolbarPrefsChange: (next: ToolbarPrefs) => void;
  onCandleCount?: (n: number) => void;
  /** When set, replaces journal overlay markers from URL deep-link. */
  journalAnnotationMarkersOverride?: ChartAnnotationChannelMarker[];
};

export default memo(function ChartCell({
  chartId,
  config: configProp,
  theme,
  palette = DEFAULT_PALETTE,
  compact = false,
  railMode = "full",
  isActive = true,
  live: liveProp,
  mountChartEngine: mountChartEngineProp,
  showDrawingRail = true,
  toolbarPrefs,
  symbolNav,
  onFocus,
  onConfigChange,
  onToolbarPrefsChange,
  onCandleCount,
  journalAnnotationMarkersOverride,
}: Props) {
  const config = useCellLayoutConfig(chartId, configProp);
  const configRevision = useCellLayoutRevision(chartId);
  const chartRef = useRef<ChartHandle>(null);
  const tradeBinding = useTradeSetupBindingOptional();
  const riskBinding = useRiskPositionBindingOptional();
  const account = useAccountTradingIdentity();
  const tradingAccountId = account?.activeTradingAccountId ?? "";
  const { instances: playbookInstances } = usePlaybookInstances(tradingAccountId || null);
  const managePriceAxisAnnotations = useMemo((): PriceAxisAnnotation[] => {
    if (!tradingAccountId) return [];
    return manageLevelsToPriceAxisAnnotations(
      manageLevelsForSymbol(playbookInstances, config.symbol),
    );
  }, [config.symbol, playbookInstances, tradingAccountId]);
  const playbookSync = useMemo(
    () =>
      tradingAccountId
        ? {
            symbol: config.symbol,
            accountId: tradingAccountId,
            environment: account?.tradingEnvironment ?? "paper",
            instances: playbookInstances,
          }
        : null,
    [account?.tradingEnvironment, config.symbol, playbookInstances, tradingAccountId],
  );

  const requestScriptLibrary = useScriptLibraryMountRequest();
  const sync = useChartSync();
  const activeChartBridge = useActiveChartBridge();
  const marketData = useMarketDataQuotes();
  const sidebar = useSidebarOptional();
  const copilotActions = useCopilotActions();
  const {
    markers: journalOverlayMarkers,
    gotoMs: journalGotoMs,
    consumeGoto: consumeJournalGoto,
  } = useJournalChartOverlay(config.symbol);
  const journalMarkers = journalAnnotationMarkersOverride ?? journalOverlayMarkers;
  const { gotoMs: patternGotoMs, consumeGoto: consumePatternGoto } =
    usePatternChartGoto(config.symbol);
  const patternLibrary = usePatternLibraryOptional();
  const scriptLibrary = useScriptLibraryOptional();
  const workspace = useOptionalAppWorkspace();
  const { timeZone: appTimeZone } = useAppTimeZone();

  const [activeTool, setActiveTool] = useState("__cursor__");
  const [replayActive, setReplayActive] = useState(false);
  const [historyRevision, setHistoryRevision] = useState(0);

  const modal = useChartCellModalState({
    chartRef,
    config,
    onConfigChange,
    appTimeZone,
    requestScriptLibrary,
  });

  const feed = useChartCellFeedBinding({
    isActive,
    liveProp,
    mountChartEngineProp,
    config,
    onCandleCount,
    reloadToken: marketData?.reloadToken,
    chartRef,
    replayActive,
  });

  const drawing = useDrawingLayoutSync({
    chartRef,
    config,
    configRevision,
    onConfigChange,
    chartId,
    isActive,
    sync,
    setSelectedOverlayId: modal.setSelectedOverlayId,
    setHistoryRevision,
    chartEngineGeneration: feed.chartEngineGeneration,
    playbookSync,
  });

  const { markViewportDirty, clearPersistedViewport, flushViewportPersist } =
    useViewportPersistSync({
      chartRef,
      config,
      onConfigChange,
      candleCount: feed.candleCount,
      sessionKey: feed.candleSessionKey,
      chartEngineGeneration: feed.chartEngineGeneration,
    });

  useChartCellEngineMount({
    feed,
    chartRef,
    flushDrawingsPersist: drawing.flushDrawingsPersist,
    flushViewportPersist,
    setActiveTool,
  });

  const selection = useChartCellModalSelection({
    chartRef,
    overlays: drawing.overlays,
    settingsOverlayId: modal.settingsOverlayId,
    selectedOverlayId: modal.selectedOverlayId,
    renameOverlayId: modal.renameOverlayId,
    drawingToolbarBounds: modal.drawingToolbarBounds,
  });

  const orchestration = useChartCellOrchestration({
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
    flushDrawingsPersist: drawing.flushDrawingsPersist,
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
  });

  return (
    <ChartCellView
      {...buildChartCellViewProps({
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
        copilot: copilotActions,
        patternLibrary,
        scriptLibrary,
      })}
    />
  );
});
