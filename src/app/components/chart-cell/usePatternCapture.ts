"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useState,
  type RefObject,
} from "react";
import type { ChartHandle } from "../EdgeChart";
import {
  INITIAL_CAPTURE_STATE,
  canSaveCapture,
  canUndoCapture,
  isCaptureActive,
  reduceCaptureState,
  type CaptureState,
} from "@/lib/patternCapture/fsm";
import { buildPatternRecordFromCapture } from "@/lib/patternCapture/buildRecord";
import { SECTION_LABEL_PRESETS } from "@/lib/patternCapture/presets";
import {
  barIndexFromClientX,
  resolveCaptureDotLayout,
  type CaptureViewport,
} from "@/lib/patternCapture/slice";
import type { PriceScaleSide } from "@/lib/chart/layout";
import type { OhlcvBar } from "@/lib/patternLibrary/types";
import type { CellConfig } from "@/lib/chartConfig";
import type { usePatternLibraryOptional } from "../pattern-library/PatternLibraryContext";

type Params = {
  chartRef: RefObject<ChartHandle | null>;
  chartOverlayRef: RefObject<HTMLDivElement | null>;
  chartId: string;
  config: CellConfig;
  isActive: boolean;
  priceScaleSide: PriceScaleSide;
  patternLibrary: ReturnType<typeof usePatternLibraryOptional>;
  setActiveTool: React.Dispatch<React.SetStateAction<string>>;
};

export function usePatternCapture({
  chartRef,
  chartOverlayRef,
  chartId,
  config,
  isActive,
  priceScaleSide,
  patternLibrary,
  setActiveTool,
}: Params) {
  const [captureState, dispatchCapture] = useReducer(
    reduceCaptureState,
    INITIAL_CAPTURE_STATE,
  );
  const [captureSaveMessage, setCaptureSaveMessage] = useState<string | null>(null);
  const [captureSavedRecordId, setCaptureSavedRecordId] = useState<string | null>(null);
  const [captureHoverBar, setCaptureHoverBar] = useState<number | null>(null);
  const [captureViewport, setCaptureViewport] = useState<CaptureViewport | null>(null);
  const [visibleRangeTick, setVisibleRangeTick] = useState(0);

  const captureActive = isCaptureActive(captureState);

  const refreshCaptureViewport = useCallback(() => {
    const vp = chartRef.current?.getVisibleRange();
    if (vp) setCaptureViewport(vp);
  }, [chartRef]);

  useEffect(() => {
    if (!captureActive) {
      setCaptureViewport(null);
      return;
    }
    refreshCaptureViewport();
  }, [captureActive, refreshCaptureViewport]);

  const buildCaptureAnchor = useCallback(
    (
      barIndex: number,
      timestamp: number,
    ): {
      barIndex: number;
      timestamp: number;
      markerLeftPct: number;
      markerTopPx: number;
    } | null => {
      const overlay = chartOverlayRef.current;
      const vp = chartRef.current?.getVisibleRange();
      if (!overlay || !vp) return null;
      const layout = resolveCaptureDotLayout(barIndex, overlay, vp, priceScaleSide);
      if (!layout) return null;
      return { barIndex, timestamp, ...layout };
    },
    [chartOverlayRef, chartRef, priceScaleSide],
  );

  const resolveCaptureBarIndex = useCallback(
    (clientX: number): number | null => {
      const rect = chartOverlayRef.current?.getBoundingClientRect();
      const vp = chartRef.current?.getVisibleRange();
      const candles = chartRef.current?.getCandles() ?? [];
      if (!rect || !vp || candles.length === 0) return null;
      const barIndex = barIndexFromClientX(clientX, rect.left, vp, priceScaleSide);
      if (barIndex < 0 || barIndex >= candles.length) return null;
      return barIndex;
    },
    [chartOverlayRef, chartRef, priceScaleSide],
  );

  const candlesToOhlcv = useCallback((): OhlcvBar[] => {
    return (chartRef.current?.getCandles() ?? []).map((c) => ({
      timestamp: c.t,
      open: c.o,
      high: c.h,
      low: c.l,
      close: c.c,
      volume: c.v,
    }));
  }, [chartRef]);

  const togglePatternCapture = useCallback(() => {
    if (captureActive) {
      dispatchCapture({ type: "CANCEL" });
      setCaptureSaveMessage(null);
      return;
    }
    chartRef.current?.stopDrawing();
    setActiveTool("__cursor__");
    setCaptureSaveMessage(null);
    dispatchCapture({ type: "ENTER" });
  }, [captureActive, chartRef, setActiveTool]);

  const cancelPatternCapture = useCallback(() => {
    dispatchCapture({ type: "CANCEL" });
    setCaptureSaveMessage(null);
  }, []);

  const undoPatternCapture = useCallback(() => {
    dispatchCapture({ type: "UNDO" });
  }, []);

  const savePatternCapture = useCallback(async () => {
    if (!canSaveCapture(captureState)) {
      dispatchCapture({ type: "REQUEST_SAVE" });
      return;
    }
    dispatchCapture({ type: "SAVE_START" });
    try {
      const allBars = candlesToOhlcv();
      const built = buildPatternRecordFromCapture({
        state: captureState,
        allBars,
        symbol: config.symbol,
        timeframe: config.interval,
        interval: config.interval,
        range: config.range,
        sourceCellId: chartId,
        indicatorsSnapshot: config.indicators.map((ind) => ({
          id: ind.id,
          name: ind.name,
          params: ind.inputs as Record<string, unknown> | undefined,
        })),
      });
      const response = await fetch("/api/pattern-library/captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record: built.record,
          renderBars: built.renderBars,
          leftPaddingApplied: built.leftPaddingApplied,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Save failed");
      }
      setCaptureSaveMessage(`Saved ${built.record.id}`);
      setCaptureSavedRecordId(built.record.id);
      dispatchCapture({ type: "SAVE_SUCCESS" });
    } catch (error) {
      dispatchCapture({
        type: "SAVE_ERROR",
        message: error instanceof Error ? error.message : "Save failed",
      });
    }
  }, [captureState, candlesToOhlcv, config, chartId]);

  const handleCaptureOverlayClick = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!captureActive || captureState.phase === "labeling" || captureState.phase === "saving") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const barIndex = resolveCaptureBarIndex(event.clientX);
      if (barIndex == null) return;
      const candles = chartRef.current?.getCandles() ?? [];
      const bar = candles[barIndex];
      if (!bar) return;
      const anchor = buildCaptureAnchor(barIndex, bar.t) ?? {
        barIndex,
        timestamp: bar.t,
        markerLeftPct: 50,
        markerTopPx: Math.max(40, (chartOverlayRef.current?.clientHeight ?? 200) * 0.4),
      };
      setCaptureHoverBar(barIndex);
      refreshCaptureViewport();
      setVisibleRangeTick((tick) => tick + 1);
      dispatchCapture({
        type: "CLICK_BAR",
        anchor,
      });
    },
    [
      captureActive,
      captureState.phase,
      resolveCaptureBarIndex,
      buildCaptureAnchor,
      refreshCaptureViewport,
      chartRef,
      chartOverlayRef,
    ],
  );

  const handleCaptureOverlayPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!captureActive || captureState.phase === "labeling" || captureState.phase === "saving") {
        return;
      }
      const barIndex = resolveCaptureBarIndex(event.clientX);
      if (barIndex != null) {
        setCaptureHoverBar(barIndex);
      }
    },
    [captureActive, captureState.phase, resolveCaptureBarIndex],
  );

  useEffect(() => {
    if (!captureActive || !isActive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelPatternCapture();
        return;
      }
      if (captureState.phase !== "labeling") return;
      const digit = Number.parseInt(event.key, 10);
      if (
        digit >= 1 &&
        digit <= SECTION_LABEL_PRESETS.length &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        dispatchCapture({ type: "PICK_PRESET", index: digit });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [captureActive, isActive, cancelPatternCapture, captureState.phase]);

  useEffect(() => {
    if (!captureActive || !isActive) return;
    const el = chartOverlayRef.current;
    if (!el) return;
    const bump = () => setVisibleRangeTick((tick) => tick + 1);
    el.addEventListener("wheel", bump, { passive: true });
    return () => el.removeEventListener("wheel", bump);
  }, [captureActive, isActive, chartOverlayRef]);

  return {
    captureState: captureState as CaptureState,
    dispatchCapture,
    captureActive,
    captureSaveMessage,
    captureSavedRecordId,
    captureHoverBar,
    captureViewport,
    visibleRangeTick,
    refreshCaptureViewport,
    setVisibleRangeTick,
    setCaptureHoverBar,
    togglePatternCapture,
    cancelPatternCapture,
    undoPatternCapture,
    savePatternCapture,
    handleCaptureOverlayClick,
    handleCaptureOverlayPointerMove,
    canSaveCapture: () => canSaveCapture(captureState),
    canUndoCapture: () => canUndoCapture(captureState),
    openPatternsPanel: () =>
      captureSavedRecordId
        ? patternLibrary?.openPatternsPanel(captureSavedRecordId)
        : undefined,
  };
}
