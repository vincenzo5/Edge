"use client";

import { createContext, useCallback, useContext, useMemo, useRef } from "react";

type CrosshairListener = (timestamp: number | null) => void;

type SyncContextValue = {
  /** Whether crosshair sync is enabled (linked layouts). */
  linked: boolean;
  /** Register a listener for crosshair events from other charts. */
  subscribe: (chartId: string, listener: CrosshairListener) => () => void;
  /** Broadcast a crosshair timestamp from a chart to all others. */
  broadcast: (chartId: string, timestamp: number | null) => void;
};

const ChartSyncContext = createContext<SyncContextValue | null>(null);

export function ChartSyncProvider({
  children,
  linked,
}: {
  children: React.ReactNode;
  linked: boolean;
}) {
  const listenersRef = useRef<Map<string, CrosshairListener>>(new Map());
  const linkedRef = useRef(linked);
  linkedRef.current = linked;

  const subscribe = useCallback((chartId: string, listener: CrosshairListener) => {
    listenersRef.current.set(chartId, listener);
    return () => {
      listenersRef.current.delete(chartId);
    };
  }, []);

  const broadcast = useCallback((chartId: string, timestamp: number | null) => {
    if (!linkedRef.current) return;
    listenersRef.current.forEach((listener, id) => {
      if (id !== chartId) listener(timestamp);
    });
  }, []);

  const value = useMemo(
    () => ({ linked, subscribe, broadcast }),
    [linked, subscribe, broadcast],
  );

  return (
    <ChartSyncContext.Provider value={value}>
      {children}
    </ChartSyncContext.Provider>
  );
}

export function useChartSync(): SyncContextValue | null {
  return useContext(ChartSyncContext);
}
