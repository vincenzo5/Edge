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
  isTwsGatewayHealthy,
  mergeHealthSnapshot,
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
import { useActiveChart } from "../ActiveChartContext";
import { useMarketDataQuotes } from "../MarketDataProvider";
import { useAccountOptional } from "../AccountProvider";
import { useDataConnectionPreference } from "@/lib/marketData/useDataConnectionPreference";

type OptionsHealthMeta = Partial<ChartDataMeta> | null;

const RECOVERY_POLL_INTERVAL_MS = 3_000;
const RECOVERY_POLL_DEADLINE_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type DataHealthContextValue = {
  snapshot: DataHealthSnapshot;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  serverHealthLoading: boolean;
  serverHealthLoaded: boolean;
  refreshServerHealth: () => Promise<ServerHealthPayload | null>;
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

  useEffect(() => subscribeHealthEvents(setHealthEvents), []);

  const refreshServerHealth = useCallback(async (): Promise<ServerHealthPayload | null> => {
    setServerHealthLoading(true);
    try {
      const res = await fetch("/api/market-data/health", { priority: "high" });
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
  }, []);

  useEffect(() => {
    void refreshServerHealth();
    const timer = window.setInterval(() => {
      void refreshServerHealth();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [refreshServerHealth]);

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

  const reloadFeedsAfterRecovery = useCallback(async () => {
    marketData?.reloadMarketData();
    if (account && !account.disabled) {
      await account.refresh();
    }
  }, [account, marketData]);

  const waitForRecoveryConfirmation = useCallback(async (): Promise<boolean> => {
    const deadline = Date.now() + RECOVERY_POLL_DEADLINE_MS;
    while (Date.now() < deadline) {
      try {
        const res = await fetch("/api/market-data/tws/recover/status", { priority: "high" });
        if (res.ok) {
          const payload = (await res.json()) as {
            ok?: boolean;
            message?: string;
            finalized?: boolean;
            recoveryPhase?: string;
          };
          if (payload.message) {
            setRecoverMessage(payload.message);
          }
          if (payload.ok && payload.finalized) {
            return true;
          }
          if (payload.ok && payload.recoveryPhase === "confirmed") {
            return true;
          }
        }
      } catch {
        // Keep polling until deadline.
      }
      await sleep(RECOVERY_POLL_INTERVAL_MS);
    }
    return false;
  }, []);

  const waitForGatewayHealth = useCallback(async (): Promise<boolean> => {
    const confirmed = await waitForRecoveryConfirmation();
    if (confirmed) return true;

    const deadline = Date.now() + RECOVERY_POLL_DEADLINE_MS;
    while (Date.now() < deadline) {
      const health = await refreshServerHealth();
      const twsProvider = health?.providers.find((provider) => provider.id === "tws");
      if (isTwsGatewayHealthy(twsProvider)) {
        return true;
      }
      await sleep(RECOVERY_POLL_INTERVAL_MS);
    }
    return false;
  }, [refreshServerHealth, waitForRecoveryConfirmation]);

  const recoverTws = useCallback(async () => {
    const runId = ++recoveryRunRef.current;
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
        commandState?: "accepted" | "timed_out" | "failed" | "confirmed";
        message?: string;
        recoveryPhase?: string;
        error?: string;
      };
      if (!res.ok) {
        setRecoverMessage(payload.error ?? "TWS recovery failed");
        return;
      }

      if (payload.message) {
        setRecoverMessage(payload.message);
      }
      recordHealthEvent({
        kind: "recovery",
        message: payload.message ?? "TWS recovery started",
        recovered: payload.ok === true && payload.commandState === "confirmed",
        dataset: "tws",
      });

      const commandState = payload.commandState;
      if (payload.ok && commandState === "confirmed") {
        await reloadFeedsAfterRecovery();
        await refreshServerHealth();
        return;
      }

      if (commandState === "timed_out" || commandState === "accepted") {
        const connected = await waitForGatewayHealth();
        if (runId !== recoveryRunRef.current) return;
        if (connected) {
          setRecoverMessage("Gateway connected. Reloading market data…");
          await reloadFeedsAfterRecovery();
          setRecoverMessage("Gateway connected. Market data reloaded.");
        } else {
          setRecoverMessage(
            "Reconnect still in progress. Confirm IB Gateway is logged in, then check Data Health.",
          );
        }
        await refreshServerHealth();
        return;
      }

      setRecoverMessage(payload.message ?? "Recovery incomplete");
      await refreshServerHealth();
    } catch {
      setRecoverMessage("TWS recovery request failed");
    } finally {
      if (runId === recoveryRunRef.current) {
        setRecoveringTws(false);
      }
    }
  }, [
    activeChart?.config.symbol,
    marketData,
    refreshServerHealth,
    reloadFeedsAfterRecovery,
    waitForGatewayHealth,
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
        accountDetail: account?.status?.accountId
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
    account?.connectionState,
    account?.disabled,
    account?.error,
    account?.positions.length,
    account?.status?.accountId,
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
