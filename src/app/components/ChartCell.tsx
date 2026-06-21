"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EdgeChart, { type ChartHandle, indicatorKey } from "./EdgeChart";
import SearchBar from "./SearchBar";
import DrawingToolbar from "./DrawingToolbar";
import BarReplay from "./BarReplay";
import IndicatorPicker from "./IndicatorPicker";
import ObjectTree from "./ObjectTree";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";
import { useChartSync } from "./ChartSyncContext";
import {
  CHART_TYPES,
  INTERVALS,
  RANGES,
  PRICE_PANE_KEY,
  type CellConfig,
  type IndicatorConfig,
  type TrackedOverlay,
} from "@/lib/chartConfig";

type Props = {
  chartId: string;
  config: CellConfig;
  theme: "light" | "dark";
  compact?: boolean;
  isActive?: boolean;
  onFocus?: () => void;
  onConfigChange: (next: CellConfig) => void;
  onCandleCount?: (n: number) => void;
};

export default function ChartCell({
  chartId,
  config,
  theme,
  compact = false,
  isActive = true,
  onFocus,
  onConfigChange,
  onCandleCount,
}: Props) {
  const chartRef = useRef<ChartHandle>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [candleCount, setCandleCount] = useState(0);
  const [objectTreeVisible, setObjectTreeVisible] = useState(false);
  const [overlays, setOverlays] = useState<TrackedOverlay[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    items: ContextMenuItem[];
    header?: string;
  } | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const overlaysDirtyRef = useRef(false);
  const sync = useChartSync();

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

  const update = useCallback(
    (patch: Partial<CellConfig>) => {
      onConfigChange({ ...config, ...patch });
    },
    [config, onConfigChange],
  );

  const handleSymbolSelect = useCallback(
    (result: { symbol: string; name: string; exchange: string }) =>
      update({
        symbol: result.symbol,
        symbolName: result.name,
        exchange: result.exchange,
      }),
    [update],
  );

  const handleRangeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      update({ range: e.target.value as CellConfig["range"] }),
    [update],
  );

  const handleIntervalChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      update({ interval: e.target.value as CellConfig["interval"] }),
    [update],
  );

  const handleChartTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      update({ chartType: e.target.value as CellConfig["chartType"] }),
    [update],
  );

  const toggleIndicator = useCallback(
    (ind: IndicatorConfig) => {
      const exists = config.indicators.find(
        (i) => i.name === ind.name && i.pane === ind.pane,
      );
      const next = exists
        ? config.indicators.filter(
            (i) => !(i.name === ind.name && i.pane === ind.pane),
          )
        : [...config.indicators, ind];
      update({ indicators: next });
    },
    [config.indicators, update],
  );

  const handleToolSelect = useCallback((toolName: string) => {
    if (!isActive) return;
    if (toolName === "__cursor__") {
      chartRef.current?.stopDrawing();
    } else {
      chartRef.current?.startDrawing(toolName);
    }
  }, [isActive]);

  // Pane actions - uniform for price pane (PRICE_PANE_KEY) and indicator panes.
  // Operate on paneOrder / collapsedPanes / maximizedPane in config for persistence.
  const getPaneOrder = () => (config.paneOrder && config.paneOrder.length > 0
    ? [...config.paneOrder]
    : [PRICE_PANE_KEY, ...config.indicators.map((i) => indicatorKey(i))]);

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
  }, []);

  const handleToggleMagnet = useCallback((on: boolean) => {
    chartRef.current?.setMagnet(on);
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

  const handleOverlayRightClick = useCallback(
    (overlay: TrackedOverlay, pos: { x: number; y: number }) => {
      setSelectedOverlayId(overlay.id);
      const actions = overlayActions();
      setContextMenu({
        position: pos,
        header: overlay.label || overlay.name,
        items: buildOverlayContextMenuItems(overlay, actions, (id) => {
          const o = overlays.find((ov) => ov.id === id);
          if (o) {
            const name = prompt("Rename drawing:", o.label);
            if (name?.trim()) actions.rename(id, name.trim());
          }
          setContextMenu(null);
        }),
      });
    },
    [overlayActions, overlays],
  );

  const handleChartContextMenu = useCallback((pos: { x: number; y: number }) => {
    const modified = chartRef.current?.isViewportModified() ?? false;
    const items: ContextMenuItem[] = [];
    if (modified) {
      items.push({
        id: "reset-view",
        label: "Reset chart view",
        action: () => {
          chartRef.current?.resetChartView();
          setContextMenu(null);
        },
      });
    }
    if (items.length === 0) return;
    setContextMenu({ position: pos, items });
  }, []);

  // Delete selected drawing.
  const handleDeleteSelected = useCallback(() => {
    if (selectedOverlayId) {
      chartRef.current?.removeOverlay(selectedOverlayId);
      setSelectedOverlayId(null);
      setContextMenu(null);
    }
  }, [selectedOverlayId]);

  // Crosshair sync helpers.
  const handleCrosshairFire = useCallback(
    (ts: number | null) => {
      sync?.broadcast(chartId, ts);
    },
    [sync, chartId],
  );

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden ${
        isActive ? "ring-2 ring-inset ring-blue-500" : "ring-1 ring-inset ring-transparent"
      }`}
      onPointerDown={() => onFocus?.()}
    >
      {/* Compact cell toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-gray-200 px-1 py-1 dark:border-gray-800">
        <SearchBar
          onSelect={handleSymbolSelect}
          initial={config.symbol}
          compact
        />
        <select
          value={config.range}
          onChange={handleRangeChange}
          className="rounded border border-gray-300 bg-transparent px-1 py-1 text-xs dark:border-gray-700"
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={config.interval}
          onChange={handleIntervalChange}
          className="rounded border border-gray-300 bg-transparent px-1 py-1 text-xs dark:border-gray-700"
        >
          {INTERVALS.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
        {!compact && (
          <>
            <select
              value={config.chartType}
              onChange={handleChartTypeChange}
              className="rounded border border-gray-300 bg-transparent px-1 py-1 text-xs dark:border-gray-700"
            >
              {CHART_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              className="rounded border border-gray-300 px-1.5 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              +Indicators
            </button>
            <button
              type="button"
              onClick={() => setObjectTreeVisible((o) => !o)}
              className={`rounded border px-1.5 py-1 text-xs transition-colors ${
                objectTreeVisible
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              }`}
            >
              Tree {objectTreeVisible ? "▾" : "▸"}
            </button>
          </>
        )}
      </div>

      {/* Body: drawing rail + chart + optional tree */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DrawingToolbar
          compact={compact}
          disabled={!isActive}
          onToolSelect={handleToolSelect}
          onClear={handleClearDrawings}
          onToggleMagnet={handleToggleMagnet}
          onDeleteSelected={
            selectedOverlayId && isActive ? handleDeleteSelected : undefined
          }
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-1">
          <EdgeChart
            ref={chartRef}
            config={config}
            theme={theme}
            visibleCount={visibleCount}
            chartId={chartId}
            onCrosshairTimestamp={handleCrosshairFire}
            onConfigChange={onConfigChange}
            onOverlayRightClick={handleOverlayRightClick}
            onChartContextMenu={handleChartContextMenu}
            onRemoveIndicator={(name, pane) => toggleIndicator({ name, pane })}
            onCollapseIndicator={handleCollapsePane}
            onMaximizeIndicator={handleMaximizePane}
            onMoveIndicatorUp={handleMovePaneUp}
            onMoveIndicatorDown={handleMovePaneDown}
            onPaneHeightsChange={handlePaneHeightsChange}
            collapsedKeys={collapsedKeys}
            maximizedKey={maximizedKey}
            paneOrder={paneOrder}
          />
        </div>
        {objectTreeVisible && (
          <ObjectTree
            chartId={chartId}
            config={config}
            overlays={overlays}
            onConfigChange={onConfigChange}
            onOverlayAction={overlayActions()}
            onAddIndicator={() => setPickerOpen(true)}
          />
        )}
      </div>

      {!compact && (
        <BarReplay
          total={candleCount}
          onVisibleChange={setVisibleCount}
          disabled={false}
        />
      )}

      <IndicatorPicker
        open={pickerOpen}
        active={config.indicators}
        onToggle={toggleIndicator}
        onClose={() => setPickerOpen(false)}
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

function buildOverlayContextMenuItems(
  overlay: TrackedOverlay,
  actions: OverlayActionHandlers,
  onRenamePrompt: (id: string) => void,
): ContextMenuItem[] {
  return [
    {
      id: "rename",
      label: "Rename",
      shortcut: "F2",
      action: () => onRenamePrompt(overlay.id),
    },
    {
      id: "lock",
      label: overlay.locked ? "Unlock" : "Lock",
      shortcut: "⌘L",
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
      shortcut: "⌘D",
      action: () => actions.duplicate(overlay.id),
      dividerAfter: true,
    },
    {
      id: "remove",
      label: "Remove",
      shortcut: "⌫",
      danger: true,
      action: () => actions.remove(overlay.id),
    },
  ];
}