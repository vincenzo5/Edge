'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { Candle, IndicatorConfig, ScriptSeriesContext, ScriptSeriesResolver, ScriptSourceResolver } from '@edge/chart-core';
import { ScriptResultCoordinator } from './engine/scriptResultCoordinator';
import {
  IndicatorResultProvider,
  clearScriptIndicatorPlugins,
} from './engine/indicatorResultProvider';

export type UseScriptResultCoordinatorOptions = {
  sessionKey: string;
  indicators: IndicatorConfig[];
  candles: Candle[];
  onInvalidate?: () => void;
  onScriptResultReady?: (event: import('./types').ScriptResultReadyEvent) => void;
  scriptSourceResolver?: ScriptSourceResolver | null;
  seriesContext?: ScriptSeriesContext | null;
  seriesResolver?: ScriptSeriesResolver | null;
};

export type ScriptResultCoordinatorHandle = {
  provider: IndicatorResultProvider;
};

export function useScriptResultCoordinator(
  options: UseScriptResultCoordinatorOptions,
): ScriptResultCoordinatorHandle {
  const onInvalidateRef = useRef(options.onInvalidate);
  onInvalidateRef.current = options.onInvalidate;
  const scriptSourceResolverRef = useRef(options.scriptSourceResolver);
  scriptSourceResolverRef.current = options.scriptSourceResolver;
  const seriesContextRef = useRef(options.seriesContext);
  seriesContextRef.current = options.seriesContext;
  const seriesResolverRef = useRef(options.seriesResolver);
  seriesResolverRef.current = options.seriesResolver;
  const onScriptResultReadyRef = useRef(options.onScriptResultReady);
  onScriptResultReadyRef.current = options.onScriptResultReady;

  const handleRef = useRef<{
    provider: IndicatorResultProvider;
    coordinator: ScriptResultCoordinator;
    sessionKey: string;
  } | null>(null);

  if (!handleRef.current || handleRef.current.sessionKey !== options.sessionKey) {
    handleRef.current?.coordinator.dispose();
    const provider = new IndicatorResultProvider({ sessionKey: options.sessionKey });
    const coordinator = new ScriptResultCoordinator({
      provider,
      sessionKey: options.sessionKey,
      onSnapshot: () => onInvalidateRef.current?.(),
      onScriptResultReady: (event) => onScriptResultReadyRef.current?.(event),
      scriptSourceResolver: (scriptId, revision) =>
        scriptSourceResolverRef.current?.(scriptId, revision) ?? null,
      seriesContext: seriesContextRef.current ?? null,
      seriesResolver: seriesResolverRef.current ?? null,
    });
    handleRef.current = { provider, coordinator, sessionKey: options.sessionKey };
  }

  const { provider, coordinator } = handleRef.current;

  useEffect(() => {
    return () => {
      coordinator.dispose();
      clearScriptIndicatorPlugins();
    };
  }, [coordinator]);

  useEffect(() => {
    coordinator.setSeriesOptions({
      seriesContext: options.seriesContext ?? null,
      seriesResolver: options.seriesResolver ?? null,
    });
    coordinator.sync(options.indicators, options.candles);
  }, [coordinator, options.indicators, options.candles, options.seriesContext, options.seriesResolver]);

  return useMemo(() => ({ provider }), [provider]);
}
