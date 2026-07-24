"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { ContextMenuItem } from "../ContextMenu";
import type { ChartHandle } from "./EdgeChart";
import {
  mergeChartSettings,
  persistChartSettings,
  type CellConfig,
  type RequiredChartSettings,
  type TrackedOverlay,
} from "@/lib/chartConfig";
import type { DrawingStyles } from "@edge/chart-core/contracts";
import type { ChartTimeZone } from "@edge/chart-core/timeZone";

type Params = {
  chartRef: RefObject<ChartHandle | null>;
  config: CellConfig;
  onConfigChange: (next: CellConfig) => void;
  appTimeZone: ChartTimeZone;
  requestScriptLibrary: () => void;
};

export function useChartCellModalState({
  chartRef,
  config,
  onConfigChange,
  appTimeZone,
  requestScriptLibrary,
}: Params) {
  const [pickerOpen, setPickerOpenState] = useState(false);
  const setPickerOpen = useCallback(
    (open: boolean) => {
      if (open) requestScriptLibrary();
      setPickerOpenState(open);
    },
    [requestScriptLibrary],
  );

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
  const [drawingToolbarBounds, setDrawingToolbarBounds] = useState({
    width: 800,
    height: 400,
  });
  const chartOverlayRef = useRef<HTMLDivElement>(null);

  const settingsIndicator = useMemo(
    () => config.indicators.find((i) => i.id === settingsIndicatorId) ?? null,
    [config.indicators, settingsIndicatorId],
  );

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

  const handleLegendAction = useCallback((actionId: string) => {
    const match = /^settings-(.+)$/.exec(actionId);
    if (match) setSettingsIndicatorId(match[1]);
  }, []);

  const handleIndicatorParamsSave = useCallback(
    (
      id: string,
      patch: {
        inputs?: Record<string, import("@edge/chart-core/plugin-api").InputValue>;
        styles?: Record<string, import("@edge/chart-core/contracts").LineStyleOverride>;
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
      const prevMerged = mergeChartSettings(config.chartSettings, { defaultTimeZone: appTimeZone });
      const serialized = persistChartSettings(next, { defaultTimeZone: appTimeZone });
      onConfigChange({ ...config, chartSettings: serialized });
      if (next.scales.priceScaleType !== prevMerged.scales.priceScaleType) {
        chartRef.current?.resetPriceScaleWindow(next);
      }
    },
    [config, onConfigChange, appTimeZone, chartRef],
  );

  const handleDrawingStylesSave = useCallback(
    (id: string, patch: Partial<DrawingStyles>, markDirty: () => void) => {
      chartRef.current?.updateDrawingStyles(id, patch);
      markDirty();
    },
    [chartRef],
  );

  const handleRenameOverlaySave = useCallback(
    (label: string) => {
      if (!renameOverlayId) return;
      chartRef.current?.renameOverlay(renameOverlayId, label);
      setRenameOverlayId(null);
    },
    [renameOverlayId, chartRef],
  );

  return {
    pickerOpen,
    setPickerOpen,
    settingsIndicatorId,
    setSettingsIndicatorId,
    settingsOverlayId,
    setSettingsOverlayId,
    chartSettingsOpen,
    setChartSettingsOpen,
    chartSettingsSection,
    setChartSettingsSection,
    goToOpen,
    setGoToOpen,
    renameOverlayId,
    setRenameOverlayId,
    templatePickerOpen,
    setTemplatePickerOpen,
    templatePickerTab,
    setTemplatePickerTab,
    templateRevision,
    setTemplateRevision,
    contextMenu,
    setContextMenu,
    selectedOverlayId,
    setSelectedOverlayId,
    toolbarDragOffset,
    setToolbarDragOffset,
    drawingToolbarBounds,
    chartOverlayRef,
    settingsIndicator,
    handleLegendAction,
    handleIndicatorParamsSave,
    handleChartSettingsSave,
    handleDrawingStylesSave,
    handleRenameOverlaySave,
  };
}

type SelectionParams = {
  chartRef: RefObject<ChartHandle | null>;
  overlays: TrackedOverlay[];
  settingsOverlayId: string | null;
  selectedOverlayId: string | null;
  renameOverlayId: string | null;
  drawingToolbarBounds: { width: number; height: number };
};

export function useChartCellModalSelection({
  chartRef,
  overlays,
  settingsOverlayId,
  selectedOverlayId,
  renameOverlayId,
  drawingToolbarBounds,
}: SelectionParams) {
  const settingsDrawing = useMemo(() => {
    if (!settingsOverlayId) return null;
    const drawings = chartRef.current?.serializeDrawings() ?? [];
    return drawings.find((d) => d.id === settingsOverlayId) ?? null;
  }, [settingsOverlayId, overlays, chartRef]);

  const selectedDrawing = useMemo(() => {
    if (!selectedOverlayId) return null;
    const drawings = chartRef.current?.serializeDrawings() ?? [];
    return drawings.find((d) => d.id === selectedOverlayId) ?? null;
  }, [selectedOverlayId, overlays, chartRef]);

  const selectedDrawingBounds = useMemo(() => {
    if (!selectedOverlayId) return null;
    return chartRef.current?.getDrawingScreenBounds(selectedOverlayId) ?? null;
  }, [selectedOverlayId, overlays, drawingToolbarBounds, chartRef]);

  const renameOverlay = renameOverlayId
    ? (overlays.find((overlay) => overlay.id === renameOverlayId) ?? null)
    : null;

  return {
    settingsDrawing,
    selectedDrawing,
    selectedDrawingBounds,
    renameOverlay,
  };
}
