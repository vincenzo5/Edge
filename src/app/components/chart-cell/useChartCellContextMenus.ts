"use client";

import { useCallback, type RefObject } from "react";
import type { ChartHandle } from "../EdgeChart";
import type { ContextMenuItem } from "../ContextMenu";
import { buildChartContextMenuItems, buildPriceScaleContextMenuItems } from "../chartContextMenu";
import { buildChartCopyItems } from "../chartCopyMenu";
import { buildOverlayContextMenuItems } from "./overlayContextMenu";
import {
  copyDrawings,
  hasDrawingClipboard,
} from "@/lib/chart/chartClipboard";
import {
  mergeChartSettings,
  patchChartSettings,
  type CellConfig,
  type RequiredChartSettings,
  type PriceScaleType,
  type TrackedOverlay,
} from "@/lib/chartConfig";
import type { Candle } from "@/lib/chart/contracts";
import type { useSidebarOptional } from "../SidebarContext";
import type { useTradeSetupBindingOptional } from "../trading/TradeSetupBindingContext";

type ContextMenuState = {
  position: { x: number; y: number };
  items: ContextMenuItem[];
  header?: string;
} | null;

type Params = {
  chartRef: RefObject<ChartHandle | null>;
  chartId: string;
  config: CellConfig;
  overlays: TrackedOverlay[];
  crosshairData: {
    dataIndex: number | null;
    timestamp: number | null;
    valueLabel: string | null;
  };
  displayCandlesRef: RefObject<Candle[]>;
  chartSettingsMerged: RequiredChartSettings;
  latestCrosshairPlotXRef: RefObject<number | null>;
  sidebar: ReturnType<typeof useSidebarOptional>;
  tradeBinding: ReturnType<typeof useTradeSetupBindingOptional>;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState>>;
  setChartSettingsSection: React.Dispatch<
    React.SetStateAction<"symbol" | "status" | "scales" | "canvas" | "trading">
  >;
  setChartSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setGoToOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setTemplatePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSettingsOverlayId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedOverlayId: React.Dispatch<React.SetStateAction<string | null>>;
  update: (patch: Partial<CellConfig>) => void;
  onConfigChange: (next: CellConfig) => void;
  handleClearDrawings: () => void;
  handlePasteDrawings: () => void;
  handleSaveChartTemplate: (settingsDraft?: RequiredChartSettings) => void;
  openChartTemplatePicker: () => void;
  overlayActions: () => {
    remove: (id: string) => void;
    setVisible: (id: string, visible: boolean) => void;
    setLocked: (id: string, locked: boolean) => void;
    rename: (id: string, label: string) => void;
    bringForward: (id: string) => void;
    sendBackward: (id: string) => void;
    duplicate: (id: string) => void;
    subscribe: (cb: () => void) => () => void;
  };
  openRenameOverlay: (id: string) => void;
  applyPriceScaleType: (type: PriceScaleType) => void;
};

export function useChartCellContextMenus({
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
}: Params) {
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
          openRenameOverlay,
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
          {
            onTradeSetup: tradeBinding
              ? () => {
                  tradeBinding.openTradeFromDrawing(chartId, overlay.id, config.symbol);
                  setContextMenu(null);
                }
              : undefined,
          },
        ),
      });
    },
    [
      overlayActions,
      handlePasteDrawings,
      openRenameOverlay,
      tradeBinding,
      chartId,
      config.symbol,
      chartRef,
      setContextMenu,
      setSelectedOverlayId,
      setSettingsOverlayId,
    ],
  );

  const handleChartContextMenu = useCallback(
    (pos: { x: number; y: number }) => {
      const modified = chartRef.current?.isViewportModified() ?? false;
      const candles =
        displayCandlesRef.current.length > 0
          ? displayCandlesRef.current
          : (chartRef.current?.getCandles() ?? []);
      const copyItems = buildChartCopyItems({
        valueLabel: crosshairData.valueLabel,
        timestamp: crosshairData.timestamp,
        dataIndex: crosshairData.dataIndex,
        candles,
        symbol: config.symbol,
        exchange: config.exchange,
        interval: config.interval,
        range: config.range,
        rangePreset: config.rangePreset,
        chartType: config.chartType,
        timeZone: chartSettingsMerged.symbol.timeZone,
      });
      const items = buildChartContextMenuItems(
        {
          viewportModified: modified,
          drawingCount: overlays.length,
          indicatorCount: config.indicators.length,
          copyItems,
          canPasteDrawings: hasDrawingClipboard(),
          lockCrosshairToTime: chartSettingsMerged.canvas.lockCrosshairToTime,
        },
        {
          resetView: () => {
            chartRef.current?.resetChartView();
            setContextMenu(null);
          },
          copyText: (text) => {
            void navigator.clipboard.writeText(text);
            setContextMenu(null);
          },
          openObjectTree: () => {
            sidebar?.openPanel("object-tree");
            setContextMenu(null);
          },
          pasteDrawings: handlePasteDrawings,
          saveChartTemplate: handleSaveChartTemplate,
          applyChartTemplate: openChartTemplatePicker,
          removeDrawings: () => {
            handleClearDrawings();
            setContextMenu(null);
          },
          removeIndicators: () => {
            update({ indicators: [] });
            setContextMenu(null);
          },
          removeAll: () => {
            handleClearDrawings();
            update({ indicators: [] });
            setContextMenu(null);
          },
          toggleLockCrosshairToTime: () => {
            const nextLock = !chartSettingsMerged.canvas.lockCrosshairToTime;
            update({
              chartSettings: patchChartSettings(config.chartSettings, {
                canvas: {
                  lockCrosshairToTime: nextLock,
                  lockedCrosshairPlotX: nextLock ? latestCrosshairPlotXRef.current : null,
                },
              }),
            });
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
      config,
      crosshairData.valueLabel,
      crosshairData.timestamp,
      crosshairData.dataIndex,
      chartSettingsMerged.symbol.timeZone,
      chartSettingsMerged.canvas.lockCrosshairToTime,
      handleClearDrawings,
      handlePasteDrawings,
      handleSaveChartTemplate,
      openChartTemplatePicker,
      update,
      sidebar,
      chartRef,
      displayCandlesRef,
      latestCrosshairPlotXRef,
      setContextMenu,
      setChartSettingsSection,
      setChartSettingsOpen,
      setGoToOpen,
    ],
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
            const mergedNext = mergeChartSettings(patched);
            onConfigChange({ ...config, chartSettings: patched });
            if (patch.scales?.priceScaleType != null || patch.priceScaleType != null) {
              chartRef.current?.resetPriceScaleWindow(mergedNext);
            }
            setContextMenu(null);
          },
        },
      );
      setContextMenu({ position: { x: pos.clientX, y: pos.clientY }, items });
    },
    [
      applyPriceScaleType,
      config,
      onConfigChange,
      chartRef,
      setContextMenu,
      setChartSettingsSection,
      setChartSettingsOpen,
    ],
  );

  return {
    handleOverlayRightClick,
    handleChartContextMenu,
    handlePriceScaleContextMenu,
  };
}
