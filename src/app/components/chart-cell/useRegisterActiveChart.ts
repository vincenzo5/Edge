"use client";

import { useEffect, useMemo, type RefObject } from "react";
import type { ChartHandle } from "../EdgeChart";
import type { useActiveChartBridge } from "../ActiveChartContext";
import type { Candle } from "@/lib/chart/contracts";
import type { ChartDataMeta } from "@edge/chart-core";
import type {
  CellConfig,
  IndicatorConfig,
  Theme,
  TrackedOverlay,
} from "@/lib/chartConfig";
import type {
  ActiveChartCommands,
  ActiveChartDataWindowActions,
  ActiveChartDrawingCommands,
  ActiveChartHeaderActions,
  ActiveChartOverlayActions,
  ActiveChartUICommands,
} from "../ActiveChartContext";
import { getCatalogMeta } from "@/lib/chart/indicators/catalog";

type Params = {
  activeChartBridge: ReturnType<typeof useActiveChartBridge>;
  isActive: boolean;
  chartId: string;
  chartRef: RefObject<ChartHandle | null>;
  config: CellConfig;
  theme: Theme;
  overlays: TrackedOverlay[];
  dataMeta: ChartDataMeta | null;
  crosshairDataIndex: number | null;
  displayCandlesRef: RefObject<Candle[]>;
  candlesRevision: number;
  overlayActions: () => ActiveChartOverlayActions;
  dataWindowActions: () => ActiveChartDataWindowActions;
  onConfigChange: (next: CellConfig) => void;
  setPickerOpen: (open: boolean) => void;
  replayActive: boolean;
  canUndo: boolean;
  canRedo: boolean;
  setChartSettingsSection: (section: "symbol" | "status" | "scales" | "canvas" | "trading") => void;
  setChartSettingsOpen: (open: boolean) => void;
  setTemplatePickerTab: (tab: "chart" | "study") => void;
  setTemplatePickerOpen: (open: boolean) => void;
  setReplayActive: React.Dispatch<React.SetStateAction<boolean>>;
  setHistoryRevision: React.Dispatch<React.SetStateAction<number>>;
  addIndicator: (ind: Pick<IndicatorConfig, "name" | "pane">) => void;
  chartCommands: () => ActiveChartCommands;
  drawingCommands: () => ActiveChartDrawingCommands;
  uiCommands: () => ActiveChartUICommands;
};

export function useRegisterActiveChart({
  activeChartBridge,
  isActive,
  chartId,
  chartRef,
  config,
  theme,
  overlays,
  dataMeta,
  crosshairDataIndex,
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
  uiCommands,
}: Params) {
  const chartCommandRefs = useMemo(() => chartCommands(), [chartCommands]);
  const drawingCommandRefs = useMemo(() => drawingCommands(), [drawingCommands]);
  const overlayActionRefs = useMemo(() => overlayActions(), [overlayActions]);
  const dataWindowActionRefs = useMemo(() => dataWindowActions(), [dataWindowActions]);
  const uiCommandRefs = useMemo(() => uiCommands(), [uiCommands]);
  const openIndicatorPicker = useMemo(
    () => () => setPickerOpen(true),
    [setPickerOpen],
  );

  const headerActions = useMemo<ActiveChartHeaderActions>(
    () => ({
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
    }),
    [
      chartRef,
      setChartSettingsSection,
      setChartSettingsOpen,
      setTemplatePickerTab,
      setTemplatePickerOpen,
      setReplayActive,
      setHistoryRevision,
      addIndicator,
    ],
  );

  const headerState = useMemo(
    () => ({
      replayActive,
      canUndo: Boolean(canUndo),
      canRedo: Boolean(canRedo),
    }),
    [replayActive, canUndo, canRedo],
  );

  const dataWindow = useMemo(
    () => ({
      dataIndex: crosshairDataIndex,
      candles: displayCandlesRef.current,
      indicators: config.indicators,
      symbol: config.symbol,
      symbolName: config.symbolName,
      exchange: config.exchange,
      interval: config.interval,
      theme,
      chartSettings: config.chartSettings,
      mainSeriesVisible: config.mainSeriesVisible,
      dataMeta: dataMeta
        ? {
            source: dataMeta.source,
            asOf: dataMeta.asOf,
            stale: dataMeta.stale,
            warnings: dataMeta.warnings,
            streaming: dataMeta.streaming,
            streamError: dataMeta.streamError,
            lastUpdateAt: dataMeta.lastUpdateAt,
          }
        : null,
    }),
    [
      crosshairDataIndex,
      candlesRevision,
      displayCandlesRef,
      config.indicators,
      config.symbol,
      config.symbolName,
      config.exchange,
      config.interval,
      config.chartSettings,
      config.mainSeriesVisible,
      theme,
      dataMeta,
    ],
  );

  const readState = useMemo(
    () => ({
      config,
      theme,
      overlays,
      dataMeta,
      dataWindow,
      headerState,
    }),
    [config, theme, overlays, dataMeta, dataWindow, headerState],
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
      chartCommands: chartCommandRefs,
      drawingCommands: drawingCommandRefs,
      overlayActions: overlayActionRefs,
      dataWindowActions: dataWindowActionRefs,
      uiCommands: uiCommandRefs,
      headerActions,
      onConfigChange,
      openIndicatorPicker,
      readState,
    });
  }, [
    activeChartBridge,
    isActive,
    chartId,
    chartCommandRefs,
    drawingCommandRefs,
    overlayActionRefs,
    dataWindowActionRefs,
    uiCommandRefs,
    headerActions,
    onConfigChange,
    openIndicatorPicker,
    readState,
  ]);
}
