'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import type { Candle, Interval, Range, SerializedChartState, VisibleRange } from '@edge/chart-core';
import { applyVisibleSlice, mergeCandlesPrepend, transformCandlesForChartType, ensureCandlesCover } from '@edge/chart-core/series';
import { createHistoryPrefetchController, type HistoryPrefetchController } from './engine/historyPrefetchController';
import { buildCandleSessionKey, resolveViewportRevision } from './engine/rangePresetTransition';
import { goToDate, goToRange, type GoToRequest, type GoToResult } from './engine/goTo';
import { adjustViewportForPrepend } from './engine/viewport';
import { resetAllPaneViewports } from './createEdgeChartHandle';
import type { ChartPaneHandle } from './engine/paneHandle';

export type CandleSessionDeps = {
  candlesProp: Candle[];
  state: SerializedChartState;
  symbol: string;
  range: Range;
  interval: Interval;
  sessionKeyProp?: string;
  visibleCount?: number | null;
  loading: boolean;
  rangePreset?: string | null;
  onCandlesChange?: (candles: Candle[]) => void;
  onLoadOlderCandles?: (beforeMs: number) => Promise<Candle[]>;
  onRangePresetClear?: () => void;
  paneHandlesRef: RefObject<Map<string, ChartPaneHandle>>;
  latestVpRef: MutableRefObject<VisibleRange | null>;
  syncSiblingsRef: RefObject<(startIndex: number, endIndex: number, sourcePaneId: string) => void>;
  syncSiblings: (startIndex: number, endIndex: number, sourcePaneId: string) => void;
  prefetchControllerRef: MutableRefObject<HistoryPrefetchController | null>;
};

export type CandleSession = {
  baseCandles: Candle[];
  displayCandles: Candle[];
  candleSessionKey: string;
  viewportRevision: string | undefined;
  displayInterval: Interval;
  candlesRef: MutableRefObject<Candle[]>;
  baseCandlesRef: MutableRefObject<Candle[]>;
  stateRef: MutableRefObject<SerializedChartState>;
  intervalRef: MutableRefObject<Interval>;
  userPannedTimeAxisRef: MutableRefObject<boolean>;
  prefetchControllerRef: MutableRefObject<HistoryPrefetchController | null>;
  goToImplRef: MutableRefObject<(req: GoToRequest) => Promise<GoToResult>>;
  markUserTimePan: () => void;
};

export function useCandleSession(deps: CandleSessionDeps): CandleSession {
  const {
    candlesProp,
    state,
    symbol,
    range,
    interval,
    sessionKeyProp,
    visibleCount = null,
    loading,
    rangePreset = null,
    onCandlesChange,
    onLoadOlderCandles,
    onRangePresetClear,
    paneHandlesRef,
    latestVpRef,
    syncSiblingsRef,
    syncSiblings,
    prefetchControllerRef,
  } = deps;

  const onCandlesChangeRef = useRef(onCandlesChange);
  onCandlesChangeRef.current = onCandlesChange;

  const onLoadOlderCandlesRef = useRef(onLoadOlderCandles);
  onLoadOlderCandlesRef.current = onLoadOlderCandles;

  const [baseCandles, setBaseCandles] = useState<Candle[]>(candlesProp);
  const displayCandles = useMemo(() => {
    const transformed = transformCandlesForChartType(baseCandles, state.chartType);
    return applyVisibleSlice(transformed, visibleCount);
  }, [baseCandles, state.chartType, visibleCount]);

  const candleSessionKey = useMemo(
    () => sessionKeyProp ?? buildCandleSessionKey(symbol, range, interval),
    [sessionKeyProp, symbol, range, interval],
  );

  const [loadedSessionKey, setLoadedSessionKey] = useState<string | null>(null);

  const viewportRevision = useMemo(
    (): string | undefined =>
      resolveViewportRevision(
        baseCandles.length,
        loadedSessionKey,
        candleSessionKey,
        candleSessionKey,
      ),
    [candleSessionKey, baseCandles.length, loadedSessionKey],
  );

  const [displayInterval, setDisplayInterval] = useState<Interval>(interval);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  const candlesRef = useRef<Candle[]>([]);
  const baseCandlesRef = useRef<Candle[]>([]);
  const appliedCandlesSessionKeyRef = useRef<string | null>(null);
  const prevViewportRevisionRef = useRef<string | undefined>(undefined);
  const hasMoreHistoryRef = useRef(true);
  const userPannedTimeAxisRef = useRef(false);
  const goToImplRef = useRef<(req: GoToRequest) => Promise<GoToResult>>(async () => ({
    ok: false,
    reason: 'no_data',
  }));
  const pendingGoToNavigationRef = useRef<{ startIndex: number; endIndex: number } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const intervalRef = useRef(interval);
  intervalRef.current = interval;

  useLayoutEffect(() => {
    setLoadedSessionKey((current) => (current === candleSessionKey ? current : null));
  }, [candleSessionKey]);

  useLayoutEffect(() => {
    if (viewportRevision == null || displayCandles.length === 0) return;
    if (prevViewportRevisionRef.current === viewportRevision) return;
    prevViewportRevisionRef.current = viewportRevision;
    resetAllPaneViewports(paneHandlesRef.current ?? undefined);
  }, [viewportRevision, displayCandles.length, paneHandlesRef]);

  useEffect(() => {
    userPannedTimeAxisRef.current = false;
    hasMoreHistoryRef.current = true;
    prefetchControllerRef.current?.reset();
  }, [candleSessionKey]);

  useEffect(() => {
    if (!prefetchControllerRef.current) {
      prefetchControllerRef.current = createHistoryPrefetchController({
        getSnapshot: () => {
          const vp =
            latestVpRef.current ?? paneHandlesRef.current?.get('price')?.getViewport() ?? null;
          if (!vp) return null;
          return {
            startIndex: vp.startIndex,
            endIndex: vp.endIndex,
            loadedBars: baseCandlesRef.current.length,
            hasMore: hasMoreHistoryRef.current,
            userHasPanned: userPannedTimeAxisRef.current,
          };
        },
        onFetch: async () => {
          const base = baseCandlesRef.current;
          const loader = onLoadOlderCandlesRef.current;
          if (!loader || base.length === 0) {
            return { addedBars: 0, hasMore: false };
          }
          try {
            const older = await loader(base[0]!.t);
            if (older.length === 0) {
              hasMoreHistoryRef.current = false;
              return { addedBars: 0, hasMore: false };
            }
            const merged = mergeCandlesPrepend(base, older);
            const added = merged.length - base.length;
            if (added <= 0) {
              hasMoreHistoryRef.current = false;
              return { addedBars: 0, hasMore: false };
            }
            const priceHandle = paneHandlesRef.current?.get('price');
            const vp = priceHandle?.getViewport();
            if (vp && priceHandle) {
              const shifted = adjustViewportForPrepend(vp, added);
              priceHandle.syncTimeWindow(shifted.startIndex, shifted.endIndex, true);
              syncSiblingsRef.current(shifted.startIndex, shifted.endIndex, 'price');
              latestVpRef.current = priceHandle.getViewport();
            }
            baseCandlesRef.current = merged;
            setBaseCandles(merged);
            onCandlesChangeRef.current?.(merged);
            return { addedBars: added, hasMore: hasMoreHistoryRef.current };
          } catch (e: unknown) {
            if (!(e instanceof DOMException && e.name === 'AbortError')) {
              hasMoreHistoryRef.current = false;
            }
            return { addedBars: 0, hasMore: hasMoreHistoryRef.current };
          }
        },
      });
    }
    return () => {
      prefetchControllerRef.current?.dispose();
    };
  }, [latestVpRef, paneHandlesRef, syncSiblingsRef]);

  useEffect(() => {
    const prev = baseCandlesRef.current;
    if (prev === candlesProp) {
      baseCandlesRef.current = candlesProp;
      return;
    }
    const sameTimeEnvelope =
      prev.length === candlesProp.length &&
      prev[0]?.t === candlesProp[0]?.t &&
      prev.at(-1)?.t === candlesProp.at(-1)?.t;
    if (sameTimeEnvelope && appliedCandlesSessionKeyRef.current === candleSessionKey) {
      baseCandlesRef.current = candlesProp;
      return;
    }
    baseCandlesRef.current = candlesProp;
    setBaseCandles(candlesProp);
    if (candlesProp.length > 0) {
      appliedCandlesSessionKeyRef.current = candleSessionKey;
      setLoadedSessionKey(candleSessionKey);
      setDisplayInterval(interval);
      hasMoreHistoryRef.current = true;
      prefetchControllerRef.current?.prefetchBackground();
    }
  }, [candlesProp, candleSessionKey, interval]);

  useLayoutEffect(() => {
    candlesRef.current = displayCandles;
    onCandlesChangeRef.current?.(displayCandles);
  }, [displayCandles]);

  useLayoutEffect(() => {
    const pending = pendingGoToNavigationRef.current;
    if (!pending || displayCandles.length === 0) return;
    const priceHandle = paneHandlesRef.current?.get('price');
    if (!priceHandle) return;
    pendingGoToNavigationRef.current = null;
    userPannedTimeAxisRef.current = true;
    const navigated = priceHandle.navigateToViewport(pending.startIndex, pending.endIndex);
    if (navigated) {
      syncSiblings(navigated.startIndex, navigated.endIndex, 'price');
    }
  }, [displayCandles, paneHandlesRef, syncSiblings]);

  goToImplRef.current = async (req: GoToRequest): Promise<GoToResult> => {
    if (visibleCount != null && visibleCount > 0) {
      return { ok: false, reason: 'replay_active' };
    }

    let candles = baseCandlesRef.current;
    if (candles.length === 0) {
      return { ok: false, reason: 'no_data' };
    }

    const priceHandle = paneHandlesRef.current?.get('price');
    const currentVp = priceHandle?.getViewport();
    if (!priceHandle || !currentVp) {
      return { ok: false, reason: 'no_data' };
    }

    const visibleSpan = Math.max(1, currentVp.endIndex - currentVp.startIndex);
    const minLeadingBars = Math.ceil(visibleSpan);

    const fetchOlder = (beforeMs: number) => {
      const loader = onLoadOlderCandlesRef.current;
      if (!loader) return Promise.resolve([] as Candle[]);
      return loader(beforeMs);
    };
    const ensureCover = async (targetMs: number) => {
      try {
        return await ensureCandlesCover(candles, targetMs, fetchOlder, 20, minLeadingBars);
      } catch {
        return null;
      }
    };

    if (req.mode === 'range') {
      if (!Number.isFinite(req.from) || !Number.isFinite(req.to)) {
        return { ok: false, reason: 'invalid_date' };
      }
      if (req.from > req.to) {
        return { ok: false, reason: 'invalid_range' };
      }
      const cover = await ensureCover(req.from);
      if (!cover) {
        return { ok: false, reason: 'out_of_range' };
      }
      candles = cover.candles;
      if (!cover.covered) {
        return { ok: false, reason: 'out_of_range' };
      }
      if (cover.prepended > 0) {
        baseCandlesRef.current = candles;
        setBaseCandles(candles);
        onCandlesChangeRef.current?.(candles);
      }
      const lastTs = candles[candles.length - 1]!.t;
      if (req.from > lastTs) {
        return { ok: false, reason: 'out_of_range' };
      }
    } else {
      if (!Number.isFinite(req.at)) {
        return { ok: false, reason: 'invalid_date' };
      }
      const lastTs = candles[candles.length - 1]!.t;
      const targetMs = Math.min(req.at, lastTs);
      const cover = await ensureCover(targetMs);
      if (!cover) {
        return { ok: false, reason: 'out_of_range' };
      }
      candles = cover.candles;
      if (!cover.covered) {
        return { ok: false, reason: 'out_of_range' };
      }
      if (cover.prepended > 0) {
        baseCandlesRef.current = candles;
        setBaseCandles(candles);
        onCandlesChangeRef.current?.(candles);
      }
    }

    let nextVp;
    if (req.mode === 'range') {
      const lastTs = candles[candles.length - 1]!.t;
      nextVp = goToRange(currentVp, candles, req.from, Math.min(req.to, lastTs));
    } else {
      const lastTs = candles[candles.length - 1]!.t;
      nextVp = goToDate(currentVp, candles, Math.min(req.at, lastTs));
    }

    if (candles !== baseCandlesRef.current) {
      baseCandlesRef.current = candles;
      setBaseCandles(candles);
      onCandlesChangeRef.current?.(candles);
    }

    if (candles.length !== displayCandles.length) {
      pendingGoToNavigationRef.current = {
        startIndex: nextVp.startIndex,
        endIndex: nextVp.endIndex,
      };
    } else {
      const navigated = priceHandle.navigateToViewport(nextVp.startIndex, nextVp.endIndex);
      if (navigated) {
        syncSiblings(navigated.startIndex, navigated.endIndex, 'price');
      }
    }

    userPannedTimeAxisRef.current = true;

    if (rangePreset != null) {
      onRangePresetClear?.();
    }

    return { ok: true };
  };

  const markUserTimePan = useCallback(() => {
    userPannedTimeAxisRef.current = true;
  }, []);

  return {
    baseCandles,
    displayCandles,
    candleSessionKey,
    viewportRevision,
    displayInterval,
    candlesRef,
    baseCandlesRef,
    stateRef,
    intervalRef,
    userPannedTimeAxisRef,
    prefetchControllerRef,
    goToImplRef,
    markUserTimePan,
  };
}
