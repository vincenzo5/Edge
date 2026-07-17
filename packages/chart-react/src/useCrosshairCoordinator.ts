'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import type { CrosshairMoveEvent, CrosshairState, PaneSegment } from '@edge/chart-core';
import type { Candle, SerializedChartState } from '@edge/chart-core';
import type { Interval } from '@edge/chart-core';
import type { VisibleRange } from '@edge/chart-core';
import {
  buildSyncedCrosshairState,
  clampIndexToViewport,
  crosshairStatesEqual,
  findDataIndexForTimestamp,
} from '@edge/chart-core/crosshair';
import type { ChartPaneHandle } from './engine/paneHandle';

export type CrosshairCoordinatorDeps = {
  candlesRef: RefObject<Candle[]>;
  paneHandlesRef: RefObject<Map<string, ChartPaneHandle>>;
  paneSegmentsRef: RefObject<PaneSegment[]>;
  latestVpRef: RefObject<VisibleRange | null>;
  stateRef: RefObject<SerializedChartState>;
  intervalRef: RefObject<Interval>;
  wheelingRef: RefObject<boolean>;
  onCrosshairTimestampRef: RefObject<((timestamp: number | null) => void) | undefined>;
  onCrosshairMoveRef: RefObject<
    | ((ev: {
        timestamp: number | null;
        dataIndex: number | null;
        valueLabel: string | null;
        plotX: number | null;
      }) => void)
    | undefined
  >;
};

export type CrosshairCoordinator = {
  crosshair: CrosshairState | null;
  crosshairCbsRef: MutableRefObject<Set<(ts: number | null) => void>>;
  applyCrosshairFromSync: (timestamp: number | null) => void;
  handleCrosshairMove: (event: CrosshairMoveEvent | null) => void;
};

export function useCrosshairCoordinator(deps: CrosshairCoordinatorDeps): CrosshairCoordinator {
  const {
    candlesRef,
    paneHandlesRef,
    paneSegmentsRef,
    latestVpRef,
    stateRef,
    intervalRef,
    wheelingRef,
    onCrosshairTimestampRef,
    onCrosshairMoveRef,
  } = deps;

  const [crosshair, setCrosshair] = useState<CrosshairState | null>(null);
  const crosshairStateRef = useRef<CrosshairState | null>(null);
  const crosshairRafRef = useRef<number | null>(null);
  const pendingCrosshairRef = useRef<
    { kind: 'move'; event: CrosshairMoveEvent } | { kind: 'clear' } | null
  >(null);
  const crosshairCbsRef = useRef<Set<(ts: number | null) => void>>(new Set());
  const syncingCrosshairRef = useRef(false);

  const applyCrosshairFromSync = useCallback((timestamp: number | null) => {
    syncingCrosshairRef.current = true;
    try {
      if (timestamp == null) {
        crosshairStateRef.current = null;
        setCrosshair(null);
        onCrosshairMoveRef.current?.({
          timestamp: null,
          dataIndex: null,
          valueLabel: null,
          plotX: null,
        });
        return;
      }

      const series = candlesRef.current;
      const rawIndex = findDataIndexForTimestamp(series, timestamp);
      if (rawIndex < 0) {
        crosshairStateRef.current = null;
        setCrosshair(null);
        return;
      }

      const priceHandle = paneHandlesRef.current?.get('price');
      const vp = priceHandle?.getViewport() ?? latestVpRef.current;
      if (!vp) return;

      const segment = paneSegmentsRef.current?.find((s) => s.paneId === 'price');
      if (!segment) return;

      const dataIndex = clampIndexToViewport(rawIndex, vp);
      const nextCrosshair = buildSyncedCrosshairState({
        dataIndex,
        vp,
        candles: series,
        indicators: stateRef.current.indicators,
        interval: intervalRef.current,
        segment,
      });
      crosshairStateRef.current = nextCrosshair;
      setCrosshair(nextCrosshair);
      onCrosshairMoveRef.current?.({
        timestamp,
        dataIndex,
        valueLabel: nextCrosshair.valueLabel,
        plotX: nextCrosshair.plotX,
      });
    } finally {
      syncingCrosshairRef.current = false;
    }
  }, [
    candlesRef,
    paneHandlesRef,
    paneSegmentsRef,
    latestVpRef,
    stateRef,
    intervalRef,
    onCrosshairMoveRef,
  ]);

  const emitCrosshairCallbacks = useCallback(
    (event: CrosshairMoveEvent | null) => {
      if (syncingCrosshairRef.current) return;
      if (!event) {
        crosshairCbsRef.current.forEach((cb) => cb(null));
        onCrosshairTimestampRef.current?.(null);
        onCrosshairMoveRef.current?.({
          timestamp: null,
          dataIndex: null,
          valueLabel: null,
          plotX: null,
        });
        return;
      }
      crosshairCbsRef.current.forEach((cb) => cb(event.timestamp));
      onCrosshairTimestampRef.current?.(event.timestamp);
      onCrosshairMoveRef.current?.({
        timestamp: event.timestamp,
        dataIndex: event.dataIndex,
        valueLabel: event.valueLabel,
        plotX: event.plotX,
      });
    },
    [onCrosshairTimestampRef, onCrosshairMoveRef],
  );

  const flushCrosshair = useCallback(() => {
    crosshairRafRef.current = null;
    const pending = pendingCrosshairRef.current;
    pendingCrosshairRef.current = null;
    if (!pending) return;

    if (pending.kind === 'clear') {
      if (wheelingRef.current) return;
      if (crosshairStateRef.current === null) return;
      crosshairStateRef.current = null;
      setCrosshair(null);
      emitCrosshairCallbacks(null);
      return;
    }

    const event = pending.event;
    const segment = paneSegmentsRef.current?.find((s) => s.paneId === event.paneId);
    if (!segment) return;

    const nextCrosshair: CrosshairState = {
      plotX: event.plotX,
      globalY: segment.top + event.localY,
      activePaneId: event.paneId,
      paneTop: segment.top,
      paneHeight: segment.height,
      paneReserveTimeAxis: segment.showTimeAxis,
      timestamp: event.timestamp,
      dataIndex: event.dataIndex,
      valueLabel: event.valueLabel,
      timeLabel: event.timeLabel,
    };

    if (crosshairStatesEqual(crosshairStateRef.current, nextCrosshair)) return;

    crosshairStateRef.current = nextCrosshair;
    setCrosshair(nextCrosshair);
    emitCrosshairCallbacks(event);
  }, [emitCrosshairCallbacks, paneSegmentsRef, wheelingRef]);

  const scheduleCrosshairFlush = useCallback(() => {
    if (crosshairRafRef.current != null) return;
    crosshairRafRef.current = requestAnimationFrame(flushCrosshair);
  }, [flushCrosshair]);

  const handleCrosshairMove = useCallback(
    (event: CrosshairMoveEvent | null) => {
      pendingCrosshairRef.current = event ? { kind: 'move', event } : { kind: 'clear' };
      scheduleCrosshairFlush();
    },
    [scheduleCrosshairFlush],
  );

  useEffect(() => {
    return () => {
      if (crosshairRafRef.current != null) {
        cancelAnimationFrame(crosshairRafRef.current);
      }
    };
  }, []);

  return {
    crosshair,
    crosshairCbsRef,
    applyCrosshairFromSync,
    handleCrosshairMove,
  };
}
