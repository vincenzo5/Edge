'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type {
  CellConfig,
  Theme,
  IndicatorConfig,
  TrackedOverlay,
  SerializedDrawing,
} from '@/lib/chartConfig';
import type { SyncedTimeWindow, VisibleRange } from '@/lib/chart/contracts';
import { PRICE_PANE_KEY } from '@/lib/chartConfig';
import ChartCanvas from '@/lib/chart/canvas';
import { createInitialLayout, type PaneLayout } from '@/lib/chart/panes';
import { fetchYahooCandles, toHeikinAshi, applyVisibleSlice } from '@/lib/chart/series';
import type { Candle } from '@/lib/chart/contracts';
import { IndicatorRegistry, DrawingRegistry } from '@/lib/chart/pluginHost';

export type IndicatorKey = string;
export function indicatorKey(ind: IndicatorConfig): IndicatorKey {
  return `${ind.name}::${ind.pane}`;
}
export function parseIndicatorKey(key: IndicatorKey): IndicatorConfig | null {
  const parts = key.split('::');
  if (parts.length < 2) return null;
  const pane = parts.pop() as 'main' | 'sub';
  return { name: parts.join('::'), pane };
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
  getTrackedOverlays: () => TrackedOverlay[];
  removeOverlay: (id: string) => void;
  setOverlayVisible: (id: string, visible: boolean) => void;
  setOverlayLocked: (id: string, locked: boolean) => void;
  renameOverlay: (id: string, label: string) => void;
  duplicateOverlay: (id: string) => string | null;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  subscribeOverlayChange: (cb: () => void) => () => void;
  getSubPaneId: (key: IndicatorKey) => string | undefined;
  applyPaneHeights: (heights: Map<IndicatorKey, number | null>) => void;
};

type Props = {
  config: CellConfig;
  theme: Theme;
  visibleCount?: number | null;
  chartId: string;
  onConfigChange?: (next: CellConfig) => void;
  onOverlayRightClick?: (overlay: TrackedOverlay, pos: { x: number; y: number }) => void;
  onRemoveIndicator?: (name: string, pane: 'main' | 'sub') => void;
  onCollapseIndicator?: (key: IndicatorKey) => void;
  onMaximizeIndicator?: (key: IndicatorKey) => void;
  onMoveIndicatorUp?: (key: IndicatorKey) => void;
  onMoveIndicatorDown?: (key: IndicatorKey) => void;
  collapsedKeys?: Set<IndicatorKey>;
  maximizedKey?: IndicatorKey | null;
  paneOrder?: string[];
};

const EdgeChart = forwardRef<ChartHandle, Props>(function EdgeChart(props, ref) {
  const {
    config,
    theme,
    visibleCount = null,
    onConfigChange,
    onOverlayRightClick,
    collapsedKeys,
    maximizedKey,
    paneOrder,
    onRemoveIndicator,
    onCollapseIndicator,
    onMaximizeIndicator,
    onMoveIndicatorUp,
    onMoveIndicatorDown,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dims, setDims] = useState<{ width: number; height: number }>({ width: 800, height: 400 });
  const [drawTick, setDrawTick] = useState(0);
  const [syncedTime, setSyncedTime] = useState<SyncedTimeWindow | null>(null);
  const overlayChangeCbsRef = useRef<Set<() => void>>(new Set());
  const crosshairCbsRef = useRef<Set<(ts: number | null) => void>>(new Set());
  const drawingsRef = useRef<SerializedDrawing[]>(config.drawings ?? []);
  const trackedRef = useRef<Map<string, TrackedOverlay>>(new Map());
  const layoutRef = useRef<PaneLayout | null>(null);
  const [activeDrawingTool, setActiveDrawingTool] = useState<string | null>(null);

  const notifyOverlayChange = useCallback(() => {
    overlayChangeCbsRef.current.forEach((cb) => cb());
    setDrawTick((n) => n + 1);
  }, []);

  // Imperative handle (matches old ChartHandle exactly)
  useImperativeHandle(ref, () => ({
    startDrawing: (name: string) => {
      setActiveDrawingTool(name);
    },
    stopDrawing: () => {
      setActiveDrawingTool(null);
    },
    clearDrawings: () => {
      drawingsRef.current = [];
      trackedRef.current.clear();
      notifyOverlayChange();
    },
    setMagnet: (on: boolean) => {
      console.log('[EdgeChart] magnet', on);
    },
    serializeDrawings: () => drawingsRef.current,
    restoreDrawings: (data) => {
      const withIds = data.map((d, i) => ({ ...d, id: (d as any).id ?? `d${i}` }));
      drawingsRef.current = withIds;
      const restored = withIds.map((d, i) => ({ id: (d as any).id, name: d.name, label: d.label, visible: d.visible, locked: d.locked, zLevel: d.zLevel, paneId: 'candle_pane' } as TrackedOverlay));
      restored.forEach((o) => trackedRef.current.set(o.id, o));
      notifyOverlayChange();
    },
    resize: () => {
      const el = containerRef.current;
      if (el) setDims({ width: el.clientWidth, height: el.clientHeight });
    },
    onCrosshair: (cb) => {
      crosshairCbsRef.current.add(cb);
      return () => crosshairCbsRef.current.delete(cb);
    },
    getTrackedOverlays: () => Array.from(trackedRef.current.values()),
    removeOverlay: (id) => {
      trackedRef.current.delete(id);
      drawingsRef.current = drawingsRef.current.filter((d) => (d as any).id !== id);
      notifyOverlayChange();
    },
    setOverlayVisible: (id, visible) => {
      const o = trackedRef.current.get(id);
      if (o) {
        o.visible = visible;
        const d = drawingsRef.current.find((x) => (x as any).id === id);
        if (d) (d as any).visible = visible;
        notifyOverlayChange();
      }
    },
    setOverlayLocked: (id, locked) => {
      const o = trackedRef.current.get(id);
      if (o) {
        o.locked = locked;
        const d = drawingsRef.current.find((x) => (x as any).id === id);
        if (d) (d as any).locked = locked;
        notifyOverlayChange();
      }
    },
    renameOverlay: (id, label) => {
      const o = trackedRef.current.get(id);
      if (o) {
        o.label = label;
        const d = drawingsRef.current.find((x) => (x as any).id === id);
        if (d) d.label = label;
        notifyOverlayChange();
      }
    },
    duplicateOverlay: (id) => null,
    bringForward: (id) => {},
    sendBackward: (id) => {},
    subscribeOverlayChange: (cb) => {
      overlayChangeCbsRef.current.add(cb);
      return () => overlayChangeCbsRef.current.delete(cb);
    },
    getSubPaneId: (key) => key,
    applyPaneHeights: (heights) => {},
  }), [notifyOverlayChange]);

  // Data fetch (same contract as before)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const raw = await fetchYahooCandles(config.symbol, config.range, config.interval);
        if (cancelled) return;
        const data = config.chartType === 'heikin_ashi' ? toHeikinAshi(raw) : raw;
        const sliced = applyVisibleSlice(data, visibleCount);
        setCandles(sliced);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.symbol, config.range, config.interval, config.chartType, visibleCount]);

  // Resize observer for real dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDims({ width: Math.max(100, width), height: Math.max(100, height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Restore drawings after data load
  useEffect(() => {
    if (loading || error || candles.length === 0) return;
    if (drawingsRef.current.length === 0 && config.drawings?.length) {
      const withIds = config.drawings.map((d, i) => ({ ...d, id: (d as any).id ?? `d${i}` }));
      drawingsRef.current = withIds;
      const restored = withIds.map((d, i) => ({ id: (d as any).id, name: d.name, label: d.label, visible: d.visible, locked: d.locked, zLevel: d.zLevel, paneId: 'candle_pane' } as TrackedOverlay));
      restored.forEach((o) => trackedRef.current.set(o.id, o));
      notifyOverlayChange();
    }
  }, [loading, error, candles.length, config.drawings, notifyOverlayChange]);

  const handleCrosshair = (ts: number | null) => {
    crosshairCbsRef.current.forEach((cb) => cb(ts));
  };

  const latestVpRef = useRef<VisibleRange | null>(null);
  const handleViewport = useCallback((vp: VisibleRange, paneId: string) => {
    if (paneId === 'price') latestVpRef.current = vp;
    const next: SyncedTimeWindow = {
      startIndex: vp.startIndex,
      endIndex: vp.endIndex,
      scaleMode: vp.scaleMode ?? 'auto',
    };
    setSyncedTime((prev) => {
      if (
        prev &&
        prev.startIndex === next.startIndex &&
        prev.endIndex === next.endIndex &&
        prev.scaleMode === next.scaleMode
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  // Basic drawing creation on click when tool active
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!activeDrawingTool) return;
    const plugin = DrawingRegistry.get(activeDrawingTool);
    if (!plugin) return;

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Use live viewport from canvas if available, else fallback
    const liveVp = latestVpRef.current ?? { startIndex: 0, endIndex: 100, priceMin: 0, priceMax: 100, width: dims.width, height: dims.height, xForIndex: (i: number) => i, yForPrice: (p: number) => p, indexForX: (x: number) => x, priceForY: (y: number) => y } as any;
    const newDrawing = plugin.create({ x, y }, liveVp);
    const id = `d${Date.now()}`;
    (newDrawing as any).id = id;

    drawingsRef.current = [...drawingsRef.current, newDrawing];
    trackedRef.current.set(id, { id, name: newDrawing.name, label: newDrawing.label, visible: true, locked: false, zLevel: 0, paneId: 'candle_pane' });
    notifyOverlayChange();
    setActiveDrawingTool(null); // exit tool after one creation (simple UX)
  };

  // Compute pane layout for price + sub indicators
  const subKeys = config.indicators.filter((i) => i.pane === 'sub').map(indicatorKey);
  const layout: PaneLayout = createInitialLayout(subKeys, dims.height || 400, collapsedKeys ?? new Set(), maximizedKey ?? null);
  layoutRef.current = layout; // for getSubPaneId

  return (
    <div ref={containerRef} className="relative flex h-full w-full flex-col" onClick={handleCanvasClick}>
      {(loading || error) && (
        <div className="absolute left-2 top-2 z-10 text-xs text-gray-500">
          {loading ? 'Loading…' : error}
        </div>
      )}

      {/* Price pane (main indicators + drawings) */}
      <div style={{ height: layout.pricePane.height || '60%' }}>
        <ChartCanvas
          key={`price-${drawTick}`}
          paneId="price"
          candles={candles}
          chartType={config.chartType}
          theme={theme}
          visibleCount={visibleCount}
          width={dims.width}
          height={layout.pricePane.height || dims.height * 0.6}
          drawings={[...drawingsRef.current]}
          indicators={config.indicators.filter((i) => i.pane === 'main')}
          syncedTime={syncedTime ?? undefined}
          onCrosshair={handleCrosshair}
          onViewportChange={handleViewport}
        />
      </div>

      {/* Sub-panes for sub indicators (MACD, RSI, etc.) */}
      {layout.subPanes.map((sub) => {
        const subInd = config.indicators.find((i) => indicatorKey(i) === sub.key);
        if (!subInd) return null;
        return (
          <div key={sub.id} style={{ height: sub.height || 100, borderTop: '1px solid #374151' }}>
            <ChartCanvas
              key={`${sub.id}-${drawTick}`}
              paneId={sub.key}
              candles={candles}
              chartType={config.chartType}
              theme={theme}
              visibleCount={visibleCount}
              width={dims.width}
              height={sub.height || 100}
              drawings={[]}
              indicators={[subInd]}
              syncedTime={syncedTime ?? undefined}
              onCrosshair={handleCrosshair}
              onViewportChange={handleViewport}
            />
          </div>
        );
      })}
    </div>
  );
});

export default EdgeChart;
