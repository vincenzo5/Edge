"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ChartDataMeta } from "@edge/chart-core";
import {
  mergeHealthSnapshot,
  shouldShowTwsRecovery,
  type DataHealthSnapshot,
  type ServerHealthPayload,
} from "@/lib/marketData/health";
import type { DatasetKind } from "@/lib/marketData/trust/dataTrust";
import {
  getHealthEvents,
  recordHealthEvent,
  subscribeHealthEvents,
  type HealthEvent,
} from "@/lib/marketData/healthEvents";
import { subscribeTwsRecovery } from "@/lib/marketData/twsRecoveryBus";
import { runTwsRecoveryClient } from "@/lib/marketData/twsRecoveryClient";
import { useActiveChart } from "../ActiveChartContext";
import { useMarketDataQuotes } from "../MarketDataProvider";
import { useAccountOptional } from "../AccountProvider";
import { useAccountAliasesOptional } from "../AccountAliasesProvider";
import { useDataConnectionPreference } from "@/lib/marketData/useDataConnectionPreference";

type OptionsHealthMeta = Partial<ChartDataMeta> | null;

const HEALTH_POLL_HEALTHY_MS = 30_000;
const HEALTH_POLL_DEGRADED_MS = 5_000;

type DataHealthContextValue = {
  snapshot: DataHealthSnapshot;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  serverHealthLoading: boolean;
  serverHealthLoaded: boolean;
  refreshServerHealth: (options?: { recovery?: boolean }) => Promise<ServerHealthPayload | null>;
  registerOptionsMeta: (
    meta: OptionsHealthMeta,
    detail?: string,
    trustDataset?: DatasetKind,
  ) => void;
  recoveringTws: boolean;
  recoverMessage: string | null;
  recoverTws: () => Promise<void>;
};

const DataHealthContext = createContext<DataHealthContextValue | null>(null);

export function DataHealthProvider({ children }: { children: ReactNode }) {
  const activeChart = useActiveChart();
  const marketData = useMarketDataQuotes();
  const account = useAccountOptional();
  const accountAliases = useAccountAliasesOptional();
  const { preference: dataConnectionPreference } = useDataConnectionPreference();
  const [menuOpen, setMenuOpen] = useState(false);
  const [serverHealth, setServerHealth] = useState<ServerHealthPayload | null>(null);
  const [optionsMeta, setOptionsMeta] = useState<OptionsHealthMeta>(null);
  const [optionsDetail, setOptionsDetail] = useState<string | undefined>();
  const [optionsTrustDataset, setOptionsTrustDataset] = useState<DatasetKind | undefined>();
  const [recoveringTws, setRecoveringTws] = useState(false);
  const [recoverMessage, setRecoverMessage] = useState<string | null>(null);
  const [serverHealthLoading, setServerHealthLoading] = useState(false);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>(() => getHealthEvents());
  const recoveryRunRef = useRef(0);

  const refreshServerHealth = useCallback(
    async (options?: { recovery?: boolean }): Promise<ServerHealthPayload | null> => {
      setServerHealthLoading(true);
      try {
        const url = options?.recovery
          ? "/api/market-data/health?recovery=1"
          : "/api/market-data/health";
        const res = await fetch(url, { priority: "high" });
        if (!res.ok) return null;
        const payload = (await res.json()) as { health?: ServerHealthPayload };
        if (payload.health) {
          setServerHealth(payload.health);
          return payload.health;
        }
      } catch {
        // Keep last known server health.
      } finally {
        setServerHealthLoading(false);
      }
      return null;
    },
    [],
  );

  const reloadFeedsAfterRecovery = useCallback(async () => {
    marketData?.reloadMarketData();
    if (account && !account.disabled) {
      await account.refresh();
    }
  }, [account, marketData]);

  useEffect(() => subscribeHealthEvents(setHealthEvents), []);

  useEffect(() => {
    return subscribeTwsRecovery((event) => {
      if (event.phase === "started") {
        setRecoveringTws(true);
        setRecoverMessage(null);
        return;
      }
      if (event.phase === "progress") {
        if (event.message) setRecoverMessage(event.message);
        return;
      }
      if (event.phase === "completed") {
        setRecoveringTws(false);
        setRecoverMessage(event.message ?? null);
        void refreshServerHealth({ recovery: true });
        void reloadFeedsAfterRecovery();
        recordHealthEvent({
          kind: "recovery",
          message: event.message ?? "TWS recovery completed",
          recovered: true,
          dataset: "tws",
        });
        return;
      }
      if (event.phase === "failed") {
        setRecoveringTws(false);
        if (event.message) setRecoverMessage(event.message);
        void refreshServerHealth({ recovery: true });
      }
    });
  }, [refreshServerHealth, reloadFeedsAfterRecovery]);

  useEffect(() => {
    void refreshServerHealth();
    const twsProvider = serverHealth?.providers.find((provider) => provider.id === "tws");
    const pollMs = shouldShowTwsRecovery(twsProvider)
      ? HEALTH_POLL_DEGRADED_MS
      : HEALTH_POLL_HEALTHY_MS;
    const timer = window.setInterval(() => {
      void refreshServerHealth();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [refreshServerHealth, serverHealth]);

  useEffect(() => {
    if (!menuOpen) return;
    void refreshServerHealth();
    const timer = window.setInterval(() => {
      void refreshServerHealth();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [menuOpen, refreshServerHealth]);

  const registerOptionsMeta = useCallback(
    (meta: OptionsHealthMeta, detail?: string, trustDataset?: DatasetKind) => {
      setOptionsMeta(meta);
      setOptionsDetail(detail);
      setOptionsTrustDataset(trustDataset);
    },
    [],
  );

  const recoverTws = useCallback(async () => {
    const runId = ++recoveryRunRef.current;
    const symbols = [
      ...new Set(
        [
          activeChart?.config.symbol?.trim().toUpperCase(),
          ...(marketData?.recoverySymbols ?? []),
        ].filter((sym): sym is string => Boolean(sym)),
      ),
    ];
    const result = await runTwsRecoveryClient({
      source: "data-health",
      symbols,
      candleRequests: marketData?.recoveryCandleRequests ?? [],
      optionsSymbol: marketData?.recoveryOptionsSymbol ?? undefined,
    });
    if (runId !== recoveryRunRef.current) return;
    if (!result.ok && result.message) {
      setRecoverMessage(result.message);
    }
  }, [
    activeChart?.config.symbol,
    marketData?.recoveryCandleRequests,
    marketData?.recoveryOptionsSymbol,
    marketData?.recoverySymbols,
  ]);

  const snapshot = useMemo(() => {
    const chartSymbol = activeChart?.config.symbol?.trim().toUpperCase();
    const chartInterval = activeChart?.config.interval;
    const quoteCount = marketData?.quotesBySymbol.size ?? 0;
    const watchlistTotal = marketData?.watchlistSymbolCount ?? 0;
    let watchlistAsOf: number | undefined = marketData?.quotesMeta?.asOf;
    if (marketData?.quotesBySymbol.size) {
      for (const quote of marketData.quotesBySymbol.values()) {
        if (typeof quote.updatedAt !== "number") continue;
        watchlistAsOf =
          watchlistAsOf == null ? quote.updatedAt : Math.min(watchlistAsOf, quote.updatedAt);
      }
    }

    return mergeHealthSnapshot(
      {
        chartMeta: activeChart?.dataMeta,
        chartDetail:
          chartSymbol && chartInterval ? `${chartSymbol} · ${chartInterval.toUpperCase()}` : chartSymbol,
        watchlistMeta: marketData?.quotesMeta,
        watchlistAsOf,
        watchlistDetail:
          watchlistTotal > 0 ? `${quoteCount}/${watchlistTotal} symbols` : undefined,
        watchlistLoading: marketData?.quotesLoading,
        watchlistError: marketData?.quoteError,
        watchlistTransport: marketData?.quotesTransport,
        optionsMeta,
        optionsDetail,
        optionsTrustDataset,
        chartStreamTransport: process.env.NEXT_PUBLIC_STREAM_TRANSPORT ?? "polling",
        accountDisabled: account?.disabled,
        accountConnectionState: account?.connectionState,
        accountDetail: account?.activeTradingAccount
          ? `${accountAliases?.displayNameFor(account.activeTradingAccount) ?? account.status?.accountId ?? account.activeTradingAccount.accountId} · ${account.positions.length} positions`
          : account?.status?.accountId
            ? `${account.status.accountId} · ${account.positions.length} positions`
            : account?.connectionState,
        accountError: account?.error,
        dataConnectionPreference,
      },
      serverHealth,
      healthEvents,
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
    optionsTrustDataset,
    account?.activeTradingAccount,
    account?.connectionState,
    account?.disabled,
    account?.error,
    account?.positions.length,
    account?.status?.accountId,
    accountAliases,
    dataConnectionPreference,
    serverHealth,
    healthEvents,
  ]);

  const value = useMemo(
    (): DataHealthContextValue => ({
      snapshot,
      menuOpen,
      setMenuOpen,
      serverHealthLoading,
      serverHealthLoaded: serverHealth != null,
      refreshServerHealth,
      registerOptionsMeta,
      recoveringTws,
      recoverMessage,
      recoverTws,
    }),
    [
      snapshot,
      menuOpen,
      serverHealth,
      serverHealthLoading,
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
  trustDataset?: DatasetKind,
): void {
  const context = useContext(DataHealthContext);
  useEffect(() => {
    if (!context) return;
    context.registerOptionsMeta(meta, detail, trustDataset);
    return () => context.registerOptionsMeta(null, undefined, undefined);
  }, [context, meta, detail, trustDataset]);
}
