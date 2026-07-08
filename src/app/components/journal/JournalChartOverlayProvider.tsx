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
import { useSearchParams } from "next/navigation";
import type { ChartAnnotationChannelMarker } from "@edge/chart-core";

import { parseChartDeepLinkParams } from "@/lib/journal/chartDeepLink";
import { buildJournalExecutionMarkers } from "@/lib/journal/journalExecutionMarkers";
import type { JournalFill, JournalTrade } from "@/lib/journal/types";
import { fetchJournalFills, fetchJournalTrades } from "@/lib/persistence/client/journalClient";

type JournalChartOverlayState = {
  tradeId: string | null;
  tradeSymbol: string | null;
  gotoMs: number | null;
  markers: ChartAnnotationChannelMarker[];
  loading: boolean;
  consumeGoto: () => number | null;
};

const JournalChartOverlayContext = createContext<JournalChartOverlayState>({
  tradeId: null,
  tradeSymbol: null,
  gotoMs: null,
  markers: [],
  loading: false,
  consumeGoto: () => null,
});

export function useJournalChartOverlay(symbol: string): {
  markers: ChartAnnotationChannelMarker[];
  gotoMs: number | null;
  consumeGoto: () => number | null;
} {
  const ctx = useContext(JournalChartOverlayContext);
  const normalized = symbol.toUpperCase();
  const active =
    ctx.tradeSymbol != null && ctx.tradeSymbol.toUpperCase() === normalized;
  return {
    markers: active ? ctx.markers : [],
    gotoMs: active ? ctx.gotoMs : null,
    consumeGoto: ctx.consumeGoto,
  };
}

export function JournalChartOverlayProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const [tradeId, setTradeId] = useState<string | null>(null);
  const [tradeSymbol, setTradeSymbol] = useState<string | null>(null);
  const [gotoMs, setGotoMs] = useState<number | null>(null);
  const [markers, setMarkers] = useState<ChartAnnotationChannelMarker[]>([]);
  const [loading, setLoading] = useState(false);

  const deepLink = useMemo(
    () => parseChartDeepLinkParams(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (!deepLink?.journalTrade) {
      setTradeId(null);
      setTradeSymbol(deepLink?.symbol ?? null);
      setGotoMs(deepLink?.goto ?? null);
      setMarkers([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setTradeId(deepLink.journalTrade);
    setGotoMs(deepLink.goto ?? null);

    void (async () => {
      try {
        const [trades, fills] = await Promise.all([
          fetchJournalTrades(),
          fetchJournalFills(),
        ]);
        if (cancelled) return;
        const trade = trades.find((row) => row.id === deepLink.journalTrade) ?? null;
        if (!trade) {
          setTradeSymbol(deepLink.symbol ?? null);
          setMarkers([]);
          return;
        }
        setTradeSymbol(trade.symbol.toUpperCase());
        setMarkers(
          buildJournalExecutionMarkers(trade as JournalTrade, fills as JournalFill[]),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deepLink]);

  const consumeGoto = useCallback(() => {
    const value = gotoMs;
    setGotoMs(null);
    return value;
  }, [gotoMs]);

  const value = useMemo(
    () => ({
      tradeId,
      tradeSymbol,
      gotoMs,
      markers,
      loading,
      consumeGoto,
    }),
    [tradeId, tradeSymbol, gotoMs, markers, loading, consumeGoto],
  );

  return (
    <JournalChartOverlayContext.Provider value={value}>
      {children}
    </JournalChartOverlayContext.Provider>
  );
}

export function useChartDeepLinkBootstrap(
  hydrated: boolean,
  onApply: (params: NonNullable<ReturnType<typeof parseChartDeepLinkParams>>) => void,
): void {
  const searchParams = useSearchParams();
  const deepLink = useMemo(
    () => parseChartDeepLinkParams(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (!hydrated || !deepLink) return;
    onApply(deepLink);
  }, [hydrated, deepLink, onApply]);
}
