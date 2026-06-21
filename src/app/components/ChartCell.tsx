"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EdgeChart, { type ChartHandle, indicatorKey } from "./EdgeChart";
import SearchBar from "./SearchBar";
import DrawingToolbar from "./DrawingToolbar";
import BarReplay from "./BarReplay";
import IndicatorPicker from "./IndicatorPicker";
import ObjectTree from "./ObjectTree";
import OverlayContextMenu from "./OverlayContextMenu";
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
  onConfigChange: (next: CellConfig) => void;
  onCandleCount?: (n: number) => void;
};

export default function ChartCell({
  chartId,
  config,
  theme,
  onConfigChange,
  onCandleCount,
}: Props) {
  const chartRef = useRef<ChartHandle>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [candleCount, setCandleCount] = useState(0);
  const [objectTreeVisible, setObjectTreeVisible] = useState(false);
  const [overlays, setOverlays] = useState<TrackedOverlay[]>([]);
  const [ctxMenu, setCtxMenu] = useState<{
    overlay: TrackedOverlay;
    position: { x: number; y: number };
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
    // Initial load.
    setOverlays(chart.getTrackedOverlays());
    return unsub;
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
    (symbol: string) => update({ symbol }),
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
    if (toolName === "__cursor__") {
      chartRef.current?.stopDrawing();
    } else {
      chartRef.current?.startDrawing(toolName);
    }
  }, []);

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

  const handleClearDrawings = useCallback(() => {
    chartRef.current?.clearDrawings();
    setSelectedOverlayId(null);
  }, []);

  const handleToggleMagnet = useCallback((on: boolean) => {
    chartRef.current?.setMagnet(on);
  }, []);

  // Overlay right-click on canvas.
  const handleOverlayRightClick = useCallback(
    (overlay: TrackedOverlay, pos: { x: number; y: number }) => {
      setCtxMenu({ overlay, position: pos });
      setSelectedOverlayId(overlay.id);
    },
    [],
  );

  // Overlay actions (wired to both context menu and object tree).
  const overlayActions = useCallback(
    () => ({
      remove: (id: string) => {
        chartRef.current?.removeOverlay(id);
        if (selectedOverlayId === id) setSelectedOverlayId(null);
        setCtxMenu(null);
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
        setCtxMenu(null);
      },
      subscribe: (cb: () => void) => {
        return chartRef.current?.subscribeOverlayChange(cb) ?? (() => {});
      },
    }),
    [selectedOverlayId],
  );

  // Delete selected drawing.
  const handleDeleteSelected = useCallback(() => {
    if (selectedOverlayId) {
      chartRef.current?.removeOverlay(selectedOverlayId);
      setSelectedOverlayId(null);
      setCtxMenu(null);
    }
  }, [selectedOverlayId]);

  // Crosshair sync helpers.
  const handleCrosshairFire = useCallback(
    (ts: number | null) => {
      sync?.broadcast(chartId, ts);
    },
    [sync, chartId],
  );

  const setCrosshairReceiver = useCallback(
    (cb: (ts: number | null) => void) => { void cb; },
    [],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Compact cell toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 px-1 py-1 dark:border-gray-800">
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
      </div>

      {/* Body: drawing rail + chart + optional tree */}
      <div className="flex flex-1 overflow-hidden">
        <DrawingToolbar
          onToolSelect={handleToolSelect}
          onClear={handleClearDrawings}
          onToggleMagnet={handleToggleMagnet}
          onDeleteSelected={
            selectedOverlayId ? handleDeleteSelected : undefined
          }
        />
        <div className="flex flex-1 flex-col overflow-hidden p-1">
          <EdgeChart
            ref={chartRef}
            config={config}
            theme={theme}
            visibleCount={visibleCount}
            chartId={chartId}
            onConfigChange={onConfigChange}
            onOverlayRightClick={handleOverlayRightClick}
            onRemoveIndicator={(name, pane) => toggleIndicator({ name, pane })}
            onCollapseIndicator={handleCollapsePane}
            onMaximizeIndicator={handleMaximizePane}
            onMoveIndicatorUp={handleMovePaneUp}
            onMoveIndicatorDown={handleMovePaneDown}
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

      <BarReplay
        total={candleCount}
        onVisibleChange={setVisibleCount}
        disabled={false}
      />

      <IndicatorPicker
        open={pickerOpen}
        active={config.indicators}
        onToggle={toggleIndicator}
        onClose={() => setPickerOpen(false)}
      />

      {/* Overlay context menu (rendered at root level, positioned fixed) */}
      <OverlayContextMenu
        overlay={ctxMenu?.overlay ?? null}
        position={ctxMenu?.position ?? null}
        onRemove={(id) => overlayActions().remove(id)}
        onLock={(id, locked) => overlayActions().setLocked(id, locked)}
        onHide={(id, visible) => overlayActions().setVisible(id, visible)}
        onRename={(id) => {
          const o = overlays.find((ov) => ov.id === id);
          if (o) {
            const name = prompt("Rename drawing:", o.label);
            if (name?.trim()) overlayActions().rename(id, name.trim());
          }
          setCtxMenu(null);
        }}
        onBringForward={(id) => overlayActions().bringForward(id)}
        onSendBackward={(id) => overlayActions().sendBackward(id)}
        onDuplicate={(id) => overlayActions().duplicate(id)}
        onClose={() => setCtxMenu(null)}
      />

      {/* Crosshair sync wiring */}
      <ChartSyncBridge
        chartRef={chartRef}
        chartId={chartId}
        onFire={handleCrosshairFire}
        onReceiver={setCrosshairReceiver}
      />
    </div>
  );
}

/**
 * Internal helper that wires up crosshair subscribe/broadcast via the chart
 * ref's onCrosshair method.
 */
function ChartSyncBridge({
  chartRef,
  chartId,
  onFire,
  onReceiver,
}: {
  chartRef: React.RefObject<ChartHandle | null>;
  chartId: string;
  onFire: (ts: number | null) => void;
  onReceiver: (cb: (ts: number | null) => void) => void;
}) {
  const sync = useChartSync();

  useMemo(() => {
    if (!sync) return;
    const unsubscribe = sync.subscribe(chartId, (ts) => {
      if (ts != null) {
        // Future: programmatic crosshair. For now, no-op.
      }
    });
    const unsubFire = chartRef.current?.onCrosshair((ts) => onFire(ts));
    onReceiver((ts) => {
      void ts;
    });
    return () => {
      unsubscribe();
      unsubFire?.();
    };
  }, [sync, chartId, chartRef, onFire, onReceiver]);

  return null;
}