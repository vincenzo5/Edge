"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ChartDataMeta } from "@edge/chart-core";
import {
  mergeHealthSnapshot,
  type DataHealthSnapshot,
  type ServerHealthPayload,
} from "@/lib/marketData/health";
import { useActiveChart } from "../ActiveChartContext";
import { useMarketDataQuotes } from "../MarketDataProvider";

type OptionsHealthMeta = Partial<ChartDataMeta> | null;

type DataHealthContextValue = {
  snapshot: DataHealthSnapshot;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  refreshServerHealth: () => Promise<void>;
  registerOptionsMeta: (meta: OptionsHealthMeta, detail?: string) => void;
  recoveringTws: boolean;
  recoverMessage: string | null;
  recoverTws: () => Promise<void>;
};

const DataHealthContext = createContext<DataHealthContextValue | null>(null);

export function DataHealthProvider({ children }: { children: ReactNode }) {
  const activeChart = useActiveChart();
  const marketData = useMarketDataQuotes();
  const [menuOpen, setMenuOpen] = useState(false);
  const [serverHealth, setServerHealth] = useState<ServerHealthPayload | null>(null);
  const [optionsMeta, setOptionsMeta] = useState<OptionsHealthMeta>(null);
  const [optionsDetail, setOptionsDetail] = useState<string | undefined>();
  const [recoveringTws, setRecoveringTws] = useState(false);
  const [recoverMessage, setRecoverMessage] = useState<string | null>(null);

  const refreshServerHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/market-data/health");
      if (!res.ok) return;
      const payload = (await res.json()) as { health?: ServerHealthPayload };
      if (payload.health) {
        setServerHealth(payload.health);
      }
    } catch {
      // Keep last known server health.
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    void refreshServerHealth();
    const timer = window.setInterval(() => {
      void refreshServerHealth();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [menuOpen, refreshServerHealth]);

  const registerOptionsMeta = useCallback((meta: OptionsHealthMeta, detail?: string) => {
    setOptionsMeta(meta);
    setOptionsDetail(detail);
  }, []);

  const recoverTws = useCallback(async () => {
    setRecoveringTws(true);
    setRecoverMessage(null);
    try {
      const symbols = [
        ...new Set(
          [
            activeChart?.config.symbol?.trim().toUpperCase(),
            ...(marketData?.recoverySymbols ?? []),
          ].filter((sym): sym is string => Boolean(sym)),
        ),
      ];
      const res = await fetch("/api/market-data/tws/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols,
          candleRequests: marketData?.recoveryCandleRequests ?? [],
          optionsSymbol: marketData?.recoveryOptionsSymbol ?? undefined,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setRecoverMessage(payload.error ?? "TWS recovery failed");
        return;
      }
      setRecoverMessage(payload.message ?? (payload.ok ? "TWS recovered" : "Recovery incomplete"));
      if (payload.ok) {
        marketData?.reloadMarketData();
      }
      await refreshServerHealth();
    } catch {
      setRecoverMessage("TWS recovery request failed");
    } finally {
      setRecoveringTws(false);
    }
  }, [
    activeChart?.config.symbol,
    marketData,
    refreshServerHealth,
  ]);

  const snapshot = useMemo(() => {
    const chartSymbol = activeChart?.config.symbol?.trim().toUpperCase();
    const chartInterval = activeChart?.config.interval;
    const quoteCount = marketData?.quotesBySymbol.size ?? 0;
    const watchlistTotal = marketData?.watchlistSymbolCount ?? 0;

    return mergeHealthSnapshot(
      {
        chartMeta: activeChart?.dataMeta,
        chartDetail:
          chartSymbol && chartInterval ? `${chartSymbol} · ${chartInterval.toUpperCase()}` : chartSymbol,
        watchlistMeta: marketData?.quotesMeta,
        watchlistDetail:
          watchlistTotal > 0 ? `${quoteCount}/${watchlistTotal} symbols` : undefined,
        watchlistLoading: marketData?.quotesLoading,
        watchlistError: marketData?.quoteError,
        watchlistTransport: marketData?.quotesTransport,
        optionsMeta,
        optionsDetail,
        chartStreamTransport: process.env.NEXT_PUBLIC_STREAM_TRANSPORT ?? "polling",
      },
      serverHealth,
    );
  }, [
    activeChart?.config.interval,
    activeChart?.config.symbol,
    activeChart?.dataMeta,
    marketData?.quoteError,
    marketData?.quotesBySymbol.size,
    marketData?.quotesLoading,
    marketData?.quotesMeta,
    marketData?.quotesTransport,
    marketData?.watchlistSymbolCount,
    optionsDetail,
    optionsMeta,
    serverHealth,
  ]);

  const value = useMemo(
    (): DataHealthContextValue => ({
      snapshot,
      menuOpen,
      setMenuOpen,
      refreshServerHealth,
      registerOptionsMeta,
      recoveringTws,
      recoverMessage,
      recoverTws,
    }),
    [
      snapshot,
      menuOpen,
      refreshServerHealth,
      registerOptionsMeta,
      recoveringTws,
      recoverMessage,
      recoverTws,
    ],
  );

  return <DataHealthContext.Provider value={value}>{children}</DataHealthContext.Provider>;
}

export function useDataHealth(): DataHealthContextValue {
  const value = useContext(DataHealthContext);
  if (!value) {
    throw new Error("useDataHealth must be used within DataHealthProvider");
  }
  return value;
}

export function useRegisterOptionsHealthMeta(
  meta: OptionsHealthMeta,
  detail?: string,
): void {
  const context = useContext(DataHealthContext);
  useEffect(() => {
    if (!context) return;
    context.registerOptionsMeta(meta, detail);
    return () => context.registerOptionsMeta(null, undefined);
  }, [context, meta, detail]);
}
