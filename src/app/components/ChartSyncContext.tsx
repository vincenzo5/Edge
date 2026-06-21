"use client";

import { createContext, useCallback, useContext, useMemo, useRef } from "react";

type CrosshairListener = (timestamp: number | null) => void;

type SyncContextValue = {
  /** Register a listener for crosshair events from other charts. */
  subscribe: (chartId: string, listener: CrosshairListener) => () => void;
  /** Broadcast a crosshair timestamp from a chart to all others. */
  broadcast: (chartId: string, timestamp: number | null) => void;
};

const ChartSyncContext = createContext<SyncContextValue | null>(null);

export function ChartSyncProvider({ children }: { children: React.ReactNode }) {
  // Map of chartId -> listener. Using a ref so broadcast is stable.
  const listenersRef = useRef<Map<string, CrosshairListener>>(new Map());

  const subscribe = useCallback((chartId: string, listener: CrosshairListener) => {
    listenersRef.current.set(chartId, listener);
    return () => {
      listenersRef.current.delete(chartId);
    };
  }, []);

  const broadcast = useCallback((chartId: string, timestamp: number | null) => {
    listenersRef.current.forEach((listener, id) => {
      if (id !== chartId) listener(timestamp);
    });
  }, []);

  const value = useMemo(
    () => ({ subscribe, broadcast }),
    [subscribe, broadcast],
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
