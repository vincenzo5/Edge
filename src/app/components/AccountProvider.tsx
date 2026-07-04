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
import type {
  AccountExecution,
  AccountOrder,
  AccountPnL,
  AccountPosition,
  AccountStatus,
  AccountStreamEvent,
  AccountSummary,
} from "@/lib/marketData/contracts/brokerage";
import {
  buildAccountSnapshot,
  type AccountSnapshotPayload,
} from "@/lib/brokerage/accountSnapshot";

export type { AccountConnectionState } from "@/lib/brokerage/accountSnapshot";
import type { AccountConnectionState } from "@/lib/brokerage/accountSnapshot";

type AccountContextValue = {
  connectionState: AccountConnectionState;
  status: AccountStatus | null;
  summary: AccountSummary | null;
  positions: AccountPosition[];
  pnl: AccountPnL | null;
  orders: AccountOrder[];
  executions: AccountExecution[];
  error: string | null;
  disabled: boolean;
  refresh: () => Promise<void>;
  positionForSymbol: (symbol: string) => AccountPosition | null;
};

const AccountContext = createContext<AccountContextValue | null>(null);

type SnapshotPayload = AccountSnapshotPayload;

function applyStreamEvent(
  prev: SnapshotPayload,
  event: AccountStreamEvent,
): SnapshotPayload {
  if (event.type === "error") return prev;
  return {
    status: event.status ?? prev.status,
    summary: event.summary ?? prev.summary,
    positions: event.positions ?? prev.positions,
    pnl: event.pnl ?? prev.pnl,
    orders: event.orders ?? prev.orders,
    executions: event.executions ?? prev.executions,
  };
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [connectionState, setConnectionState] = useState<AccountConnectionState>("connecting");
  const [disabled, setDisabled] = useState(false);
  const [sidecarReachable, setSidecarReachable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotPayload>({
    status: null,
    summary: null,
    positions: [],
    pnl: null,
    orders: [],
    executions: [],
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/brokerage/snapshot", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          category?: string;
        };
        setDisabled(false);
        setSidecarReachable(false);
        setConnectionState(res.status === 503 ? "disconnected" : "error");
        setError(body.error ?? `Account snapshot failed (${res.status})`);
        return;
      }
      const payload = (await res.json()) as SnapshotPayload;
      setSnapshot(payload);
      setDisabled(false);
      setSidecarReachable(true);
      setConnectionState(payload.status?.connected ? "connected" : "disconnected");
      setError(null);
    } catch (err) {
      setSidecarReachable(false);
      setConnectionState("error");
      setError(err instanceof Error ? err.message : "Account refresh failed");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Slow re-probe when the sidecar was unreachable or errored, so the panel
  // recovers without manual refresh. Capped at 30s to avoid hammering a dead
  // sidecar; the snapshot route already fast-fails via its liveness probe.
  useEffect(() => {
    if (sidecarReachable === true) return;
    const timer = setInterval(() => {
      void refresh();
    }, 30_000);
    return () => clearInterval(timer);
  }, [sidecarReachable, refresh]);

  // Only open the SSE stream when the sidecar is actually reachable. Opening it
  // against an unresponsive sidecar holds a route handler for minutes on every
  // browser-driven reconnect and starves unrelated API traffic (e.g. /api/candles).
  useEffect(() => {
    if (sidecarReachable !== true) return;

    const es = new EventSource("/api/brokerage/stream");
    eventSourceRef.current = es;
    setConnectionState("connecting");

    es.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as AccountStreamEvent;
        if (event.type === "error") {
          setError(event.message);
          return;
        }
        setSnapshot((prev) => applyStreamEvent(prev, event));
        setConnectionState("connected");
        setError(null);
      } catch {
        /* ignore malformed events */
      }
    };

    es.onerror = () => {
      setConnectionState((state) => (state === "connected" ? "disconnected" : state));
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [sidecarReachable]);

  const positionForSymbol = useCallback(
    (symbol: string) => {
      const sym = symbol.trim().toUpperCase();
      return (
        snapshot.positions?.find(
          (row) => row.contract.symbol?.trim().toUpperCase() === sym,
        ) ?? null
      );
    },
    [snapshot.positions],
  );

  const value = useMemo<AccountContextValue>(() => {
    const accountSnapshot = buildAccountSnapshot(
      connectionState,
      disabled,
      error,
      snapshot,
    );
    return {
      connectionState: accountSnapshot.connectionState,
      status: accountSnapshot.status,
      summary: accountSnapshot.summary,
      positions: accountSnapshot.positions,
      pnl: accountSnapshot.pnl,
      orders: accountSnapshot.orders,
      executions: accountSnapshot.executions,
      error: accountSnapshot.error,
      disabled: accountSnapshot.disabled,
      refresh,
      positionForSymbol,
    };
  }, [connectionState, snapshot, error, disabled, refresh, positionForSymbol]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error("useAccount must be used within AccountProvider");
  }
  return ctx;
}

export function useAccountOptional(): AccountContextValue | null {
  return useContext(AccountContext);
}
