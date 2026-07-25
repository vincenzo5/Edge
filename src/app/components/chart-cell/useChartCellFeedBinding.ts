"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Candle } from "@edge/chart-core/contracts";
import type { ChartDataMeta } from "@edge/chart-core";
import type { MarketSessionKind } from "@edge/chart-core";
import { resolveMarketSession, sessionStatusLabel } from "@edge/chart-core";
import { resolveChartLiveQuotePriceFromSnapshot } from "@/lib/chart/resolveChartLiveQuotePrice";
import { buildCandleSessionKey } from "@edge/chart-react/engine/rangePresetTransition";
import type { CellConfig } from "@/lib/chartConfig";
import type { ChartHandle } from "./EdgeChart";
import { useQuote } from "@/lib/marketData/useQuotes";

type Params = {
  isActive: boolean;
  liveProp?: boolean;
  /** When set, overrides default mount policy (active cell or explicit live). */
  mountChartEngineProp?: boolean;
  config: CellConfig;
  onCandleCount?: (n: number) => void;
  reloadToken?: number;
  chartRef: RefObject<ChartHandle | null>;
  replayActive: boolean;
};

export function useChartCellFeedBinding({
  isActive,
  liveProp,
  mountChartEngineProp,
  config,
  onCandleCount,
  reloadToken = 0,
  chartRef,
  replayActive,
}: Params) {
  const live = liveProp ?? isActive;
  /** Default: mount when active or explicit live (journal fork). Grid passes mountChartEngine=true. */
  const mountChartEngine =
    mountChartEngineProp ?? (isActive || liveProp === true);

  const [chartEngineGeneration, setChartEngineGeneration] = useState(0);
  const mountChartEngineRef = useRef(mountChartEngine);
  const lastChartHandleRef = useRef<ChartHandle | null>(null);
  const [chartRetryKey, setChartRetryKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [candleCount, setCandleCount] = useState(0);
  const displayCandlesRef = useRef<Candle[]>([]);
  const [candlesRevision, setCandlesRevision] = useState(0);
  const prevSymbolRef = useRef<string | null>(null);
  const [lastCandleTimestamp, setLastCandleTimestamp] = useState<number | null>(null);
  const [dataMeta, setDataMeta] = useState<ChartDataMeta | null>(null);

  const liveQuote = useQuote(live ? config.symbol : null);
  const candleSessionKey = useMemo(
    () => buildCandleSessionKey(config.symbol, config.range, config.interval),
    [config.symbol, config.range, config.interval],
  );

  useEffect(() => {
    if (!replayActive) {
      setVisibleCount(null);
    }
  }, [replayActive]);

  const handleDataMetaChange = useCallback((meta: ChartDataMeta | null) => {
    setDataMeta(meta);
  }, []);

  const handleDataLoaded = useCallback(
    (info: { count: number }) => {
      setCandleCount(info.count);
      onCandleCount?.(info.count);
    },
    [onCandleCount],
  );

  const handleCandlesChange = useCallback((candles: Candle[]) => {
    displayCandlesRef.current = candles;
    setLastCandleTimestamp(candles.at(-1)?.t ?? null);
    setCandlesRevision((revision) => revision + 1);
  }, []);

  useEffect(() => {
    if (!isActive || candleCount === 0) return;

    const prevSymbol = prevSymbolRef.current;
    prevSymbolRef.current = config.symbol;

    if (prevSymbol === null || prevSymbol === config.symbol) return;

    chartRef.current?.resetChartView();
    chartRef.current?.resetPriceScaleWindow();
  }, [config.symbol, candleCount, isActive, chartRef]);

  const handleChartRetry = useCallback(() => {
    setChartRetryKey((key) => key + 1);
  }, []);

  const chartReloadKey = reloadToken + chartRetryKey;

  const liveQuotePrice = liveQuote
    ? resolveChartLiveQuotePriceFromSnapshot(config.symbol, liveQuote)
    : null;
  const liveMarketSession: MarketSessionKind | null = liveQuote
    ? resolveMarketSession({
        atMs: liveQuote.updatedAt,
        marketState: liveQuote.marketState,
      })
    : null;
  const sessionMode = config.chartSettings?.symbol?.sessionMode ?? "regular";
  const marketSessionLabel =
    liveMarketSession != null
      ? sessionStatusLabel(liveMarketSession, sessionMode)
      : null;

  return {
    live,
    mountChartEngine,
    chartEngineGeneration,
    setChartEngineGeneration,
    mountChartEngineRef,
    lastChartHandleRef,
    chartRetryKey,
    handleChartRetry,
    chartReloadKey,
    visibleCount,
    setVisibleCount,
    candleCount,
    displayCandlesRef,
    candlesRevision,
    lastCandleTimestamp,
    dataMeta,
    candleSessionKey,
    handleDataMetaChange,
    handleDataLoaded,
    handleCandlesChange,
    liveQuotePrice,
    liveMarketSession,
    marketSessionLabel,
  };
}
