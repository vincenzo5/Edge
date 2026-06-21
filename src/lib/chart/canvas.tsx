'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Candle, VisibleRange, Theme, SerializedDrawing, IndicatorConfig, SyncedTimeWindow } from './contracts';
import {
  createViewport,
  pan as panVp,
  zoom as zoomVp,
  applyAutoPriceScale,
  applyMomentum,
  updateViewportDimensions,
  scalePrice,
  scaleTime,
  panPrice,
  resetPriceScale,
  SCROLL_BUFFER_CANDLES,
} from './viewport';
import { resolveDragMode, PRICE_AXIS_WIDTH, type DragMode } from './layout';
import { drawGrid, drawCandles, drawCrosshair, drawLastPrice, drawAxes, getColors } from './renderer';
import { DrawingRegistry, IndicatorRegistry } from './pluginHost';

type Props = {
  candles: Candle[];
  chartType: string;
  theme: Theme;
  visibleCount?: number | null;
  width: number;
  height: number;
  drawings?: SerializedDrawing[];
  indicators?: IndicatorConfig[];
  paneId?: string;
  syncedTime?: SyncedTimeWindow;
  onCrosshair?: (ts: number | null) => void;
  onViewportChange?: (vp: VisibleRange, paneId: string) => void;
};

function rebindViewport(vp: VisibleRange, totalCandles: number): VisibleRange {
  const next = vp as any;
  next.xForIndex = (i: number) => {
    const visible = next.endIndex - next.startIndex;
    if (visible <= 0) return 0;
    return ((i - next.startIndex) / visible) * next.width;
  };
  next.yForPrice = (p: number) => {
    const range = next.priceMax - next.priceMin;
    if (range <= 0) return 0;
    return ((next.priceMax - p) / range) * next.height;
  };
  next.indexForX = (x: number) => {
    const visible = next.endIndex - next.startIndex;
    if (visible <= 0) return 0;
    const idx = next.startIndex + Math.floor((x / next.width) * visible);
    return Math.max(next.startIndex, Math.min(next.endIndex - 1, idx));
  };
  next.priceForY = (y: number) => {
    const range = next.priceMax - next.priceMin;
    return next.priceMax - (y / next.height) * range;
  };
  return next as VisibleRange;
}

export default function ChartCanvas({
  candles,
  chartType,
  theme,
  width,
  height,
  drawings = [],
  indicators = [],
  paneId = 'price',
  syncedTime,
  onCrosshair,
  onViewportChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vpRef = useRef<ReturnType<typeof createViewport> | null>(null);
  const rafRef = useRef<number | null>(null);
  const momentumRef = useRef(0);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const dragModeRef = useRef<DragMode>('body');
  const isDraggingRef = useRef(false);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const prevDimsRef = useRef({ width: 0, height: 0 });
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const emitViewport = (vp: VisibleRange) => {
    onViewportChangeRef.current?.(vp, paneId);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !vpRef.current) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    const vp = vpRef.current;

    drawGrid(ctx, vp, width, height, theme);
    drawCandles(ctx, candles, vp, theme, chartType as any);

    for (const ind of indicators) {
      const plugin = IndicatorRegistry.get(ind.name);
      if (plugin) {
        plugin.draw(ctx, candles, vp, theme, ind.params);
      }
    }

    for (const d of drawings) {
      if (!d.visible) continue;
      const plugin = DrawingRegistry.get(d.name);
      if (plugin) {
        plugin.draw(ctx, d, vp, theme, false);
      }
    }

    drawAxes(ctx, vp, width, height, theme, candles);

    const last = candles[candles.length - 1];
    if (last && Number.isFinite(last.c) && paneId === 'price') {
      drawLastPrice(ctx, last.c, vp, width, theme);
    }

    const mp = mousePosRef.current;
    if (mp) {
      drawCrosshair(ctx, mp.x, mp.y, vp, width, height, theme);
    }
  }, [candles, chartType, theme, width, height, drawings, indicators, paneId]);

  // Init viewport when data or size changes
  useEffect(() => {
    if (candles.length === 0) return;
    const prev = prevDimsRef.current;
    const dimsOnly = vpRef.current && prev.width === width && prev.height === height;
    if (dimsOnly && vpRef.current) {
      let vp = updateViewportDimensions(vpRef.current, width, height);
      vp = rebindViewport(vp, candles.length);
      vpRef.current = vp;
      emitViewport(vp);
      drawRef.current();
      prevDimsRef.current = { width, height };
      return;
    }
    if (!vpRef.current) {
      const initial = Math.min(150, candles.length);
      vpRef.current = createViewport(candles, width, height, initial);
    } else {
      let vp = vpRef.current;
      vp.endIndex = Math.min(vp.endIndex, candles.length + SCROLL_BUFFER_CANDLES);
      vp.startIndex = Math.max(
        -SCROLL_BUFFER_CANDLES,
        Math.min(vp.startIndex, vp.endIndex - 10)
      );
      vp = applyAutoPriceScale(vp, candles);
      vp = updateViewportDimensions(vp, width, height);
      vp = rebindViewport(vp, candles.length);
      vpRef.current = vp;
    }
    emitViewport(vpRef.current!);
    drawRef.current();
    prevDimsRef.current = { width, height };
  }, [candles, width, height]);

  // Sync time window from sibling panes
  useEffect(() => {
    if (!syncedTime || !vpRef.current || isDraggingRef.current) return;
    const vp = vpRef.current;
    const mode = vp.scaleMode ?? 'auto';
    if (
      vp.startIndex === syncedTime.startIndex &&
      vp.endIndex === syncedTime.endIndex &&
      mode === syncedTime.scaleMode
    ) {
      return;
    }
    let next = {
      ...vp,
      startIndex: syncedTime.startIndex,
      endIndex: syncedTime.endIndex,
      scaleMode: syncedTime.scaleMode,
    } as VisibleRange;
    next = rebindViewport(next, candles.length);
    next = applyAutoPriceScale(next, candles);
    vpRef.current = next;
    drawRef.current();
  }, [syncedTime, candles]);

  useEffect(() => {
    drawRef.current = draw;
    drawRef.current();
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    isDraggingRef.current = true;
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragModeRef.current = resolveDragMode(x, y, width, height);
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
    momentumRef.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!vpRef.current) return;
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDraggingRef.current) {
      if (dragModeRef.current === 'price') {
        const deltaY = e.clientY - lastYRef.current;
        lastYRef.current = e.clientY;
        vpRef.current = scalePrice(vpRef.current, deltaY);
        emitViewport(vpRef.current);
      } else if (dragModeRef.current === 'timeAxis') {
        const deltaX = e.clientX - lastXRef.current;
        lastXRef.current = e.clientX;
        vpRef.current = scaleTime(vpRef.current, deltaX, candles.length);
        emitViewport(vpRef.current);
      } else {
        const deltaX = e.clientX - lastXRef.current;
        const deltaY = e.clientY - lastYRef.current;
        lastXRef.current = e.clientX;
        lastYRef.current = e.clientY;
        momentumRef.current = deltaX * 0.8;

        let vp = vpRef.current;
        if (deltaX !== 0) {
          vp = panVp(vp, deltaX, candles.length);
        }
        if ((vp.scaleMode ?? 'auto') === 'manual' && deltaY !== 0) {
          vp = panPrice(vp, deltaY);
        }
        vp = applyAutoPriceScale(vp, candles);
        vpRef.current = vp;
        emitViewport(vp);
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => drawRef.current());
    } else {
      mousePosRef.current = { x, y };
      const idx =
        Math.floor((x / width) * (vpRef.current.endIndex - vpRef.current.startIndex)) + vpRef.current.startIndex;
      const ts = candles[idx]?.t ?? null;
      onCrosshair?.(ts);
      drawRef.current();
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (dragModeRef.current === 'body' && Math.abs(momentumRef.current) > 1) {
      const loop = () => {
        if (!vpRef.current) return;
        const res = applyMomentum(vpRef.current, momentumRef.current, candles.length);
        let vp = applyAutoPriceScale(res.vp, candles);
        vpRef.current = vp;
        momentumRef.current = res.velocity;
        emitViewport(vp);
        drawRef.current();
        if (Math.abs(momentumRef.current) > 0.5) {
          rafRef.current = requestAnimationFrame(loop);
        }
      };
      rafRef.current = requestAnimationFrame(loop);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!vpRef.current) return;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const anchorX = e.clientX - rect.left;
    let vp = zoomVp(vpRef.current, factor, anchorX, candles.length);
    vp = applyAutoPriceScale(vp, candles);
    vpRef.current = vp;
    emitViewport(vp);
    drawRef.current();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!vpRef.current) return;
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x >= width - PRICE_AXIS_WIDTH) {
      vpRef.current = resetPriceScale(vpRef.current, candles);
      emitViewport(vpRef.current);
      drawRef.current();
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        mousePosRef.current = null;
        drawRef.current();
      }}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    />
  );
}
