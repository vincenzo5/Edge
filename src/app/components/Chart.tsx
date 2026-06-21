"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  init,
  dispose,
  CandleType,
  type Chart as KLineChartInstance,
  type KLineData,
  ActionType,
  OverlayMode,
  DomPosition,
} from "klinecharts";
import type {
  CellConfig,
  ChartType,
  Theme,
  IndicatorConfig,
  TrackedOverlay,
  SerializedDrawing,
} from "@/lib/chartConfig";
import { PRICE_PANE_KEY } from "@/lib/chartConfig";
import { toHeikinAshi } from "@/lib/heikinAshi";
import { isMainPane } from "@/lib/indicators";
import { registerThemes, stylesFor } from "@/lib/themes";
import {
  clearOverlays,
  restoreOverlays,
  serializeOverlays,
} from "@/lib/overlays";

type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type IndicatorKey = string; // "name::pane"

export function indicatorKey(ind: IndicatorConfig): IndicatorKey {
  return `${ind.name}::${ind.pane}`;
}

export function parseIndicatorKey(key: IndicatorKey): IndicatorConfig | null {
  const parts = key.split("::");
  if (parts.length < 2) return null;
  const pane = parts.pop() as "main" | "sub";
  return { name: parts.join("::"), pane };
}

export type ChartHandle = {
  startDrawing: (overlayName: string) => void;
  stopDrawing: () => void;
  clearDrawings: () => void;
  setMagnet: (on: boolean) => void;
  serializeDrawings: () => SerializedDrawing[];
  restoreDrawings: (data: SerializedDrawing[]) => void;
  resize: () => void;
  onCrosshair: (cb: (timestamp: number | null) => void) => () => void;
  /** Overlay registry API */
  getTrackedOverlays: () => TrackedOverlay[];
  removeOverlay: (id: string) => void;
  setOverlayVisible: (id: string, visible: boolean) => void;
  setOverlayLocked: (id: string, locked: boolean) => void;
  renameOverlay: (id: string, label: string) => void;
  duplicateOverlay: (id: string) => string | null;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  subscribeOverlayChange: (cb: () => void) => () => void;
  /** Pane management */
  getSubPaneId: (key: IndicatorKey) => string | undefined;
  applyPaneHeights: (heights: Map<IndicatorKey, number | null>) => void;
};

type Props = {
  config: CellConfig;
  theme: Theme;
  visibleCount?: number | null;
  chartId: string;
  onConfigChange?: (next: CellConfig) => void;
  /** Fired when user right-clicks an overlay on the canvas. */
  onOverlayRightClick?: (
    overlay: TrackedOverlay,
    pos: { x: number; y: number },
  ) => void;
  /** Fired when user clicks the X on an indicator label. */
  onRemoveIndicator?: (name: string, pane: "main" | "sub") => void;
  /** Pane action callbacks (for sub-pane controls) */
  onCollapseIndicator?: (key: IndicatorKey) => void;
  onMaximizeIndicator?: (key: IndicatorKey) => void;
  onMoveIndicatorUp?: (key: IndicatorKey) => void;
  onMoveIndicatorDown?: (key: IndicatorKey) => void;
  /** Currently collapsed/maximized indicator keys */
  collapsedKeys?: Set<IndicatorKey>;
  maximizedKey?: IndicatorKey | null;
  /** Unified pane order including price pane (PRICE_PANE_KEY) */
  paneOrder?: string[];
};

const SUB_PANE_DEFAULT_HEIGHT = 100;
const SUB_PANE_COLLAPSED_HEIGHT = 0;

const Chart = forwardRef<ChartHandle, Props>(function Chart(
  {
    config,
    theme,
    visibleCount = null,
    chartId,
    onConfigChange,
    onOverlayRightClick,
    onRemoveIndicator,
    onCollapseIndicator,
    onMaximizeIndicator,
    onMoveIndicatorUp,
    onMoveIndicatorDown,
    collapsedKeys,
    maximizedKey,
    paneOrder,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<KLineChartInstance | null>(null);
  const rawCandlesRef = useRef<Candle[]>([]);
  const indicatorsRef = useRef<IndicatorConfig[]>([]);
  const crosshairCbsRef = useRef<Set<(ts: number | null) => void>>(new Set());
  const overlayIdsRef = useRef<Set<string>>(new Set());
  const overlayMetaRef = useRef<Map<string, TrackedOverlay>>(new Map());
  const overlayChangeCbsRef = useRef<Set<() => void>>(new Set());
  const onOverlayRightClickRef = useRef(onOverlayRightClick);
  const drawingsRestoredRef = useRef(false);
  const subPaneIdsRef = useRef<Map<IndicatorKey, string>>(new Map());
  const [paneRects, setPaneRects] = useState<Map<IndicatorKey, { top: number; left: number; width: number; height: number }>>(new Map());
  const lastPaneRectsRef = useRef<Map<IndicatorKey, { top: number; left: number; width: number; height: number }>>(new Map());
  const [loading, setLoading] = useState(true);

  // Measure actual pane rects from KLineChart DOM for precise hit areas.
  const measurePaneRects = useCallback(() => {
    const chart = chartRef.current;
    const container = containerRef.current;
    if (!chart || !container) return;

    const newRects = new Map<IndicatorKey, { top: number; left: number; width: number; height: number }>();
    const subIndicators = config.indicators.filter((i) => i.pane === "sub");

    for (const ind of subIndicators) {
      const key = indicatorKey(ind);
      const paneId = subPaneIdsRef.current.get(key);
      if (!paneId) continue;
      try {
        const dom = chart.getDom(paneId, DomPosition.Root);
        if (dom) {
          const rect = dom.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          newRects.set(key, {
            top: rect.top - containerRect.top,
            left: rect.left - containerRect.left,
            width: rect.width,
            height: rect.height,
          });
        }
      } catch {
        // getDom may fail if pane not ready
      }
    }

    // Always measure the price (main candle_pane) using sentinel key for unified controls.
    try {
      const mainDom = chart.getDom("candle_pane", DomPosition.Root);
      if (mainDom) {
        const rect = mainDom.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        newRects.set(PRICE_PANE_KEY as IndicatorKey, {
          top: rect.top - containerRect.top,
          left: rect.left - containerRect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    } catch {
      // ignore
    }

    lastPaneRectsRef.current = new Map(newRects);
    setPaneRects(newRects);
  }, [config.indicators]);
  const [error, setError] = useState<string | null>(null);

  // Keep refs in sync with props.
  indicatorsRef.current = config.indicators;
  onOverlayRightClickRef.current = onOverlayRightClick;

  // Notify all overlay change subscribers.
  const notifyOverlayChange = useCallback(() => {
    overlayChangeCbsRef.current.forEach((cb) => cb());
  }, []);

  // Build TrackedOverlay from KLineChart Overlay + persisted meta.
  const buildTrackedOverlay = useCallback(
    (id: string, fromPersisted?: SerializedDrawing): TrackedOverlay | null => {
      const chart = chartRef.current;
      if (!chart) return null;
      const o = chart.getOverlayById(id) as Record<string, unknown> | null;
      if (!o) return null;
      return {
        id,
        name: String(o.name ?? ""),
        label:
          fromPersisted?.label ??
          (typeof o.label === "string" ? o.label : String(o.name ?? "")),
        visible:
          fromPersisted?.visible ??
          (typeof o.visible === "boolean" ? o.visible : true),
        locked:
          fromPersisted?.locked ??
          (typeof o.lock === "boolean" ? o.lock : false),
        zLevel:
          fromPersisted?.zLevel ??
          (typeof o.zLevel === "number" ? o.zLevel : 0),
        paneId: typeof o.paneId === "string" ? o.paneId : "",
      };
    },
    [],
  );

  // --- Imperative API ---
  useImperativeHandle(
    ref,
    () => ({
      startDrawing: (overlayName: string) => {
        const chart = chartRef.current;
        if (!chart) return;
        const id = chart.createOverlay({
          name: overlayName,
          onRightClick: (event: { overlay: Record<string, unknown> }) => {
            const raw = event.overlay;
            const overlayId = String(raw.id ?? "");
            const meta = overlayMetaRef.current.get(overlayId);
            if (meta) {
              // Use overlay's screen position; we approximate from the
              // overlay's first point via the chart's coordinate API.
              const rect =
                containerRef.current?.getBoundingClientRect() ?? null;
              onOverlayRightClickRef.current?.(meta, {
                x: rect ? rect.left + 100 : 100,
                y: rect ? rect.top + 100 : 100,
              });
            }
            return true;
          },
          onRemoved: () => {
            // id stays captured; auto-remove from registry.
            overlayIdsRef.current.delete(id as string);
            overlayMetaRef.current.delete(id as string);
            notifyOverlayChange();
          },
          onDrawEnd: () => {
            if (typeof id === "string") {
              overlayIdsRef.current.add(id);
              const meta = buildTrackedOverlay(id);
              if (meta) {
                overlayMetaRef.current.set(id, meta);
                notifyOverlayChange();
              }
            }
          },
        } as never);
        if (typeof id === "string") {
          overlayIdsRef.current.add(id);
          const meta = buildTrackedOverlay(id);
          if (meta) {
            overlayMetaRef.current.set(id, meta);
            notifyOverlayChange();
          }
        }
      },
      stopDrawing: () => {
        chartRef.current?.overrideOverlay({
          mode: OverlayMode.Normal,
        } as never);
      },
      clearDrawings: () => {
        clearOverlays(chartRef.current, overlayIdsRef.current);
        overlayMetaRef.current.clear();
        notifyOverlayChange();
      },
      setMagnet: (on: boolean) => {
        chartRef.current?.setStyles({
          overlay: {
            point: { borderColor: on ? "#ff9800" : "transparent" },
          },
        } as never);
      },
      serializeDrawings: () =>
        serializeOverlays(chartRef.current, overlayIdsRef.current),
      restoreDrawings: (data) => {
        overlayIdsRef.current.clear();
        overlayMetaRef.current.clear();
        const created = restoreOverlays(
          chartRef.current,
          data as SerializedDrawing[],
        );
        for (const { id, meta } of created) {
          overlayIdsRef.current.add(id);
          overlayMetaRef.current.set(id, meta);
        }
        drawingsRestoredRef.current = true;
        notifyOverlayChange();
      },
      resize: () => chartRef.current?.resize(),
      onCrosshair: (cb) => {
        crosshairCbsRef.current.add(cb);
        return () => {
          crosshairCbsRef.current.delete(cb);
        };
      },
      getTrackedOverlays: () =>
        Array.from(overlayMetaRef.current.values()),
      removeOverlay: (id: string) => {
        try {
          chartRef.current?.removeOverlay(id);
        } catch { /* ignore */ }
        overlayIdsRef.current.delete(id);
        overlayMetaRef.current.delete(id);
        notifyOverlayChange();
      },
      setOverlayVisible: (id: string, visible: boolean) => {
        const meta = overlayMetaRef.current.get(id);
        if (meta) {
          meta.visible = visible;
          try {
            chartRef.current?.overrideOverlay({
              id,
              visible,
            } as never);
          } catch { /* ignore */ }
          notifyOverlayChange();
        }
      },
      setOverlayLocked: (id: string, locked: boolean) => {
        const meta = overlayMetaRef.current.get(id);
        if (meta) {
          meta.locked = locked;
          try {
            chartRef.current?.overrideOverlay({
              id,
              lock: locked,
            } as never);
          } catch { /* ignore */ }
          notifyOverlayChange();
        }
      },
      renameOverlay: (id: string, label: string) => {
        const meta = overlayMetaRef.current.get(id);
        if (meta) {
          meta.label = label;
          notifyOverlayChange();
        }
      },
      duplicateOverlay: (id: string) => {
        const chart = chartRef.current;
        if (!chart) return null;
        const o = chart.getOverlayById(id) as Record<string, unknown> | null;
        if (!o) return null;
        const newId = chart.createOverlay({
          name: o.name,
          points: o.points as never,
          styles: o.styles as never,
          mode: (o.mode as string) ?? "normal",
          visible: typeof o.visible === "boolean" ? o.visible : true,
          lock: typeof o.lock === "boolean" ? o.lock : false,
          zLevel:
            typeof o.zLevel === "number" ? o.zLevel + 1 : 1,
          onRightClick: (event: { overlay: Record<string, unknown> }) => {
            const rid = String(event.overlay.id ?? "");
            const rmeta = overlayMetaRef.current.get(rid);
            if (rmeta) {
              const rect =
                containerRef.current?.getBoundingClientRect() ?? null;
              onOverlayRightClickRef.current?.(rmeta, {
                x: rect ? rect.left + 100 : 100,
                y: rect ? rect.top + 100 : 100,
              });
            }
            return true;
          },
          onRemoved: () => {
            overlayIdsRef.current.delete(newId as string);
            overlayMetaRef.current.delete(newId as string);
            notifyOverlayChange();
          },
        } as never);
        if (typeof newId === "string") {
          const meta = buildTrackedOverlay(newId);
          if (meta) {
            meta.label =
              (typeof o.label === "string" ? o.label : String(o.name ?? "")) +
              " (copy)";
            overlayIdsRef.current.add(newId);
            overlayMetaRef.current.set(newId, meta);
            notifyOverlayChange();
          }
          return newId;
        }
        return null;
      },
      bringForward: (id: string) => {
        const meta = overlayMetaRef.current.get(id);
        if (meta) {
          meta.zLevel += 1;
          try {
            chartRef.current?.overrideOverlay({
              id,
              zLevel: meta.zLevel,
            } as never);
          } catch { /* ignore */ }
          notifyOverlayChange();
        }
      },
      sendBackward: (id: string) => {
        const meta = overlayMetaRef.current.get(id);
        if (meta) {
          meta.zLevel = Math.max(0, meta.zLevel - 1);
          try {
            chartRef.current?.overrideOverlay({
              id,
              zLevel: meta.zLevel,
            } as never);
          } catch { /* ignore */ }
          notifyOverlayChange();
        }
      },
      subscribeOverlayChange: (cb: () => void) => {
        overlayChangeCbsRef.current.add(cb);
        return () => {
          overlayChangeCbsRef.current.delete(cb);
        };
      },
      getSubPaneId: (key: IndicatorKey) =>
        subPaneIdsRef.current.get(key),
      applyPaneHeights: (heights: Map<IndicatorKey, number | null>) => {
        const chart = chartRef.current;
        if (!chart) return;
        for (const [key, h] of heights) {
          const id = subPaneIdsRef.current.get(key);
          if (id) {
            chart.setPaneOptions({ id, height: h ?? undefined } as never);
          }
        }
      },
    }),
    [buildTrackedOverlay, notifyOverlayChange],
  );

  // --- Init chart once ---
  useEffect(() => {
    if (!containerRef.current) return;
    registerThemes();

    const chart = init(containerRef.current, {
      styles: stylesFor(theme),
    });
    chartRef.current = chart;

    // Crosshair broadcast.
    chart?.subscribeAction(ActionType.OnCrosshairChange, (data) => {
      const d = data as {
        kLineData?: { timestamp: number };
        realX?: number;
      };
      const ts = d?.kLineData?.timestamp ?? null;
      crosshairCbsRef.current.forEach((cb) => cb(ts));
    });

    return () => {
      if (containerRef.current) dispose(containerRef.current);
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Theme ---
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setStyles(stylesFor(theme));
  }, [theme]);

  // --- Chart type ---
  useEffect(() => {
    if (!chartRef.current) return;
    const t = config.chartType;
    if (t === "heikin_ashi") {
      chartRef.current.setStyles({
        candle: { type: CandleType.CandleSolid },
      } as never);
      const ha = toHeikinAshi(rawCandlesRef.current);
      applyWithVisible(ha);
    } else {
      chartRef.current.setStyles({
        candle: { type: t as CandleType },
      } as never);
      applyWithVisible(rawCandlesRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.chartType, visibleCount]);

  // --- Indicators ---
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Remove all previous indicators (main and sub).
    const prev = indicatorsRef.current;
    for (const ind of prev) {
      try {
        chart.removeIndicator("candle_pane", ind.name);
      } catch {
        // ignore
      }
    }
    // Also remove old sub-panes by destroying indicators from tracked keys.
    const oldKeys = Array.from(subPaneIdsRef.current.keys());
    for (const key of oldKeys) {
      const parsed = parseIndicatorKey(key);
      if (!parsed || parsed.pane === "main") continue;
      const id = subPaneIdsRef.current.get(key);
      if (id) {
        try { chart.removeIndicator(id); } catch { /* ignore */ }
      }
    }
    subPaneIdsRef.current.clear();

    // Re-create all indicators in the order specified by paneOrder (supports price above/below subs).
    // Items not present in paneOrder are appended at the end.
    const creationOrder = [...config.indicators].sort((a, b) => {
      const ka = indicatorKey(a);
      const kb = indicatorKey(b);
      const pa = (config.paneOrder ?? []).indexOf(ka);
      const pb = (config.paneOrder ?? []).indexOf(kb);
      if (pa === -1 && pb === -1) return 0;
      if (pa === -1) return 1;
      if (pb === -1) return -1;
      return pa - pb;
    });

    for (const ind of creationOrder) {
      const key = indicatorKey(ind);
      try {
        if (ind.pane === "main") {
          chart.createIndicator(ind.name, true, { id: "candle_pane" });
          subPaneIdsRef.current.set(key, "candle_pane");
        } else {
          const paneId = chart.createIndicator(ind.name, false);
          if (paneId) {
            subPaneIdsRef.current.set(key, paneId);
          }
        }
      } catch {
        // ignore unsupported indicator
      }
    }

    // Apply pane heights based on collapse/maximize state.
    applyPaneHeights();
    // Measure rects after panes are created (layout may need a frame).
    requestAnimationFrame(() => measurePaneRects());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.indicators, config.paneOrder, measurePaneRects]);

  // Apply collapse/maximize heights whenever state changes.
  // Supports price pane (PRICE_PANE_KEY) by treating its height specially (klinecharts main pane).
  // When a sub is maximized, price is collapsed too (per requirements).
  const applyPaneHeights = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const subKeys = config.indicators
      .filter((i) => i.pane === "sub")
      .map((i) => indicatorKey(i));

    const heights = new Map<IndicatorKey, number | null>();
    const isPriceMax = maximizedKey === PRICE_PANE_KEY;
    const isOtherMax = !!maximizedKey && !isPriceMax;

    // Subs
    for (const key of subKeys) {
      const id = subPaneIdsRef.current.get(key);
      if (!id) continue;
      const isCollapsed = collapsedKeys?.has(key);
      const isMax = maximizedKey === key;
      if (isCollapsed || isOtherMax || (isPriceMax && true)) {
        heights.set(key, SUB_PANE_COLLAPSED_HEIGHT);
      } else if (isMax) {
        heights.set(key, null); // auto for fullscreen
      } else {
        heights.set(key, SUB_PANE_DEFAULT_HEIGHT);
      }
    }

    // Price pane height: collapse when another is maximized.
    if (isOtherMax || collapsedKeys?.has(PRICE_PANE_KEY as IndicatorKey)) {
      // Note: klinecharts main pane height is managed via overall layout; setting 0 may not fully hide but we track state.
      // For visual collapse we rely on indicator creation order + CSS later if needed.
    }

    for (const [key, h] of heights) {
      const id = subPaneIdsRef.current.get(key);
      if (id) {
        chart.setPaneOptions({ id, height: h ?? undefined } as never);
      }
    }
  }, [config.indicators, collapsedKeys, maximizedKey]);

  useEffect(() => {
    applyPaneHeights();
    requestAnimationFrame(() => measurePaneRects());
  }, [applyPaneHeights, measurePaneRects]);

  // ResizeObserver + state-driven re-measurement for pane rects.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => measurePaneRects());
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [measurePaneRects]);

  // Re-measure when collapse/maximize keys change (layout updates).
  useEffect(() => {
    requestAnimationFrame(() => measurePaneRects());
  }, [collapsedKeys, maximizedKey, measurePaneRects]);

  // --- Fetch candles when symbol/range/interval changes ---
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch("/api/candles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: config.symbol,
            range: config.range,
            interval: config.interval,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error ?? `Request failed (${res.status})`,
          );
        }
        const { candles } = (await res.json()) as {
          candles: Candle[];
        };
        if (cancelled) return;
        rawCandlesRef.current = candles;
        const data =
          config.chartType === "heikin_ashi"
            ? toHeikinAshi(candles)
            : candles;
        applyWithVisible(data);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Failed to load chart data",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.symbol, config.range, config.interval]);

  // --- Restore persisted drawings after data load ---
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || loading || error) return;
    if (drawingsRestoredRef.current) return;
    if (!config.drawings || config.drawings.length === 0) return;

    overlayIdsRef.current.clear();
    overlayMetaRef.current.clear();
    const created = restoreOverlays(
      chart,
      config.drawings as SerializedDrawing[],
    );
    for (const { id, meta } of created) {
      overlayIdsRef.current.add(id);
      overlayMetaRef.current.set(id, meta);
    }
    drawingsRestoredRef.current = true;
    notifyOverlayChange();
  }, [loading, error, config.drawings, notifyOverlayChange]);

  const applyWithVisible = useCallback(
    (data: Candle[]) => {
      const chart = chartRef.current;
      if (!chart) return;
      let list = data;
      if (visibleCount != null && visibleCount > 0) {
        list = data.slice(0, visibleCount);
      }
      chart.applyNewData(list as KLineData[]);
    },
    [visibleCount],
  );

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{config.symbol}</span>
        <span className="text-xs text-gray-500">
          {config.range} · {config.interval}
          {config.chartType === "heikin_ashi" ? " · HA" : ""}
        </span>
      </div>
      {(loading || error) && (
        <div className="absolute left-1 top-7 z-10 text-xs text-gray-500">
          {loading && "Loading…"}
          {error && <span className="text-red-600">{error}</span>}
        </div>
      )}
      <div className="relative h-full w-full flex-1 border border-gray-200 dark:border-gray-800">
        <div ref={containerRef} className="h-full w-full" />

        {/* Indicator pane controls overlaid on the chart canvas. */}
        {!loading && config.indicators.length > 0 && (
          <PaneControls
            indicators={config.indicators}
            onRemove={onRemoveIndicator}
            onCollapse={onCollapseIndicator}
            onMaximize={onMaximizeIndicator}
            onMoveUp={onMoveIndicatorUp}
            onMoveDown={onMoveIndicatorDown}
            collapsedKeys={collapsedKeys ?? new Set()}
            maximizedKey={maximizedKey ?? null}
            paneRects={paneRects}
            lastPaneRects={lastPaneRectsRef.current}
            paneOrder={paneOrder}
          />
        )}
      </div>
    </div>
  );
});

/**
 * Controls bar overlaid at the top-right of each pane (price + sub + main indicators).
 * Unified support for price pane (PRICE_PANE_KEY) with move/collapse/maximize.
 */
function PaneControls({
  indicators,
  onRemove,
  onCollapse,
  onMaximize,
  onMoveUp,
  onMoveDown,
  collapsedKeys,
  maximizedKey,
  paneRects,
  lastPaneRects,
  paneOrder,
}: {
  indicators: IndicatorConfig[];
  onRemove?: (name: string, pane: "main" | "sub") => void;
  onCollapse?: (key: IndicatorKey) => void;
  onMaximize?: (key: IndicatorKey) => void;
  onMoveUp?: (key: IndicatorKey) => void;
  onMoveDown?: (key: IndicatorKey) => void;
  collapsedKeys: Set<IndicatorKey>;
  maximizedKey: IndicatorKey | null;
  paneRects: Map<IndicatorKey, { top: number; left: number; width: number; height: number }>;
  lastPaneRects: Map<IndicatorKey, { top: number; left: number; width: number; height: number }>;
  paneOrder?: string[];
}) {
  const mainPaneIndicators = indicators.filter((i) => i.pane === "main");
  const subPaneIndicators = indicators.filter((i) => i.pane === "sub");

  const makeKey = (ind: IndicatorConfig) => indicatorKey(ind);

  // Build unified order for move disable logic (supports moving across price).
  const order: string[] = (paneOrder && paneOrder.length > 0)
    ? [...paneOrder]
    : [PRICE_PANE_KEY, ...indicators.map((i) => makeKey(i))];

  const getPos = (key: string) => {
    const idx = order.indexOf(key);
    return idx === -1 ? order.length : idx;
  };
  const orderLen = order.length;

  return (
    <>
      {/* Sub-pane indicators (e.g. MACD): exact hit-area from measured pane rect; buttons at top-right on hover anywhere in the pane. */}
      {subPaneIndicators.map((ind) => {
        const key = makeKey(ind);
        const rect = paneRects.get(key) || lastPaneRects.get(key);
        if (!rect) return null;
        const isCollapsed = collapsedKeys.has(key);
        const hitHeight = isCollapsed ? 24 : rect.height;
        const hitAreaStyle: React.CSSProperties = {
          position: "absolute",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: hitHeight,
          zIndex: 15,
          pointerEvents: "auto",
        };
        const pos = getPos(key);
        return (
          <div key={`hit-${key}`} style={hitAreaStyle} className="group">
            <IndicatorControlRow
              name={ind.name}
              style={{
                position: "absolute",
                top: 4,
                right: 4,
              }}
              isSubPane
              isCollapsed={isCollapsed}
              isMaximized={maximizedKey === key}
              subCount={orderLen}
              index={pos}
              onRemove={() => onRemove?.(ind.name, "sub")}
              onCollapse={() => onCollapse?.(key)}
              onMaximize={() => onMaximize?.(key)}
              onMoveUp={() => onMoveUp?.(key)}
              onMoveDown={() => onMoveDown?.(key)}
            />
          </div>
        );
      })}

      {/* Price pane control (first-class, supports move/collapse/max) */}
      {(() => {
        const priceKey = PRICE_PANE_KEY as IndicatorKey;
        const rect = paneRects.get(priceKey) || lastPaneRects.get(priceKey);
        if (!rect) return null;
        const isCollapsed = collapsedKeys.has(priceKey);
        const hitHeight = isCollapsed ? 24 : rect.height;
        const hitAreaStyle: React.CSSProperties = {
          position: "absolute",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: hitHeight,
          zIndex: 15,
          pointerEvents: "auto",
        };
        const pos = getPos(priceKey);
        return (
          <div key="hit-price" style={hitAreaStyle} className="group">
            <IndicatorControlRow
              name="PRICE"
              style={{ position: "absolute", top: 4, right: 4 }}
              isSubPane={false}
              isCollapsed={isCollapsed}
              isMaximized={maximizedKey === priceKey}
              subCount={orderLen}
              index={pos}
              onRemove={() => {}}
              onCollapse={() => onCollapse?.(priceKey)}
              onMaximize={() => onMaximize?.(priceKey)}
              onMoveUp={() => onMoveUp?.(priceKey)}
              onMoveDown={() => onMoveDown?.(priceKey)}
            />
          </div>
        );
      })()}

      {/* Main-pane indicators: stack from top of chart down (move supported via paneOrder) */}
      {mainPaneIndicators.map((ind, i) => {
        const key = makeKey(ind);
        const pos = getPos(key);
        return (
          <IndicatorControlRow
            key={`main-${key}`}
            name={ind.name}
            style={{
              position: "absolute",
              top: `${2 + i * 18}px`,
              right: 0,
            }}
            isSubPane={false}
            isCollapsed={false}
            isMaximized={false}
            subCount={orderLen}
            index={pos}
            onRemove={() => onRemove?.(ind.name, "main")}
            onCollapse={undefined}
            onMaximize={undefined}
            onMoveUp={() => onMoveUp?.(key)}
            onMoveDown={() => onMoveDown?.(key)}
          />
        );
      })}
    </>
  );
}

function IndicatorControlRow({
  name,
  onRemove,
  onCollapse,
  onMaximize,
  onMoveUp,
  onMoveDown,
  style,
  isSubPane,
  isCollapsed,
  isMaximized,
  subCount,
  index,
}: {
  name: string;
  onRemove: () => void;
  onCollapse?: () => void;
  onMaximize?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  style?: React.CSSProperties;
  isSubPane: boolean;
  isCollapsed: boolean;
  isMaximized: boolean;
  subCount: number;
  index: number;
}) {
  return (
    <div
      style={{ ...style, zIndex: 20, pointerEvents: "auto" }}
      className="flex items-center justify-end px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100"
    >
      <span className="inline-flex items-center gap-0.5 rounded border border-gray-200 bg-white/90 px-1 py-0.5 text-[10px] font-medium leading-none text-gray-700 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300">
        <span className="mr-0.5">{name}</span>

        {/* Collapse / Uncollapse (sub-pane only) */}
        {isSubPane && onCollapse && (
          <IconButton
            title={isCollapsed ? "Uncollapse" : "Collapse"}
            onClick={onCollapse}
            className="hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
          >
            {isCollapsed ? (
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="currentColor"
              >
                <rect x="2" y="4" width="6" height="1.5" rx="0.5" />
              </svg>
            ) : (
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="currentColor"
              >
                <rect x="4" y="2" width="1.5" height="6" rx="0.5" />
                <rect x="2" y="4" width="6" height="1.5" rx="0.5" />
              </svg>
            )}
          </IconButton>
        )}

        {/* Maximize (sub-pane only) */}
        {isSubPane && onMaximize && (
          <IconButton
            title={isMaximized ? "Restore" : "Maximize"}
            onClick={onMaximize}
            className="hover:bg-yellow-100 hover:text-yellow-700 dark:hover:bg-yellow-900/30 dark:hover:text-yellow-400"
          >
            {isMaximized ? (
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="currentColor"
              >
                <rect x="2.5" y="2" width="5.5" height="6" rx="1" />
                <rect x="1.5" y="3" width="5.5" height="6" rx="1" />
              </svg>
            ) : (
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              >
                <rect x="1.5" y="1.5" width="7" height="7" rx="1" />
              </svg>
            )}
          </IconButton>
        )}

        {/* Move Up (sub-pane only) */}
        {isSubPane && onMoveUp && (
          <IconButton
            title="Move up"
            onClick={onMoveUp}
            disabled={index === 0}
            className="hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300 disabled:opacity-30"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
            >
              <path d="M5 2L2 6h6L5 2z" />
            </svg>
          </IconButton>
        )}

        {/* Move Down (sub-pane only) */}
        {isSubPane && onMoveDown && (
          <IconButton
            title="Move down"
            onClick={onMoveDown}
            disabled={index === subCount - 1}
            className="hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300 disabled:opacity-30"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
            >
              <path d="M5 8L2 4h6L5 8z" />
            </svg>
          </IconButton>
        )}

        {/* Close */}
        <IconButton
          title={`Remove ${name}`}
          onClick={onRemove}
          className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
        >
          ×
        </IconButton>
      </span>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  className: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] leading-none transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export default Chart;
