"use client";

import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import type { SerializedDrawing } from "@/lib/chartConfig";

type CrosshairListener = (timestamp: number | null) => void;
type DrawingSyncListener = (drawings: SerializedDrawing[]) => void;

type SyncContextValue = {
  /** Whether crosshair sync is enabled across layout cells. */
  linkCrosshair: boolean;
  /** Whether drawing sync is enabled across layout cells. */
  linkDrawings: boolean;
  /** Register a listener for crosshair events from other charts. */
  subscribe: (chartId: string, listener: CrosshairListener) => () => void;
  /** Broadcast a crosshair timestamp from a chart to all others. */
  broadcast: (chartId: string, timestamp: number | null) => void;
  /** Register a listener for drawing updates from other charts. */
  subscribeDrawings: (chartId: string, listener: DrawingSyncListener) => () => void;
  /** Broadcast serialized drawings from a chart to all others. */
  broadcastDrawings: (chartId: string, drawings: SerializedDrawing[]) => void;
};

const ChartSyncContext = createContext<SyncContextValue | null>(null);

export function ChartSyncProvider({
  children,
  linkCrosshair,
  linkDrawings,
}: {
  children: React.ReactNode;
  linkCrosshair: boolean;
  linkDrawings: boolean;
}) {
  const crosshairListenersRef = useRef<Map<string, CrosshairListener>>(new Map());
  const drawingListenersRef = useRef<Map<string, DrawingSyncListener>>(new Map());
  const linkCrosshairRef = useRef(linkCrosshair);
  const linkDrawingsRef = useRef(linkDrawings);
  linkCrosshairRef.current = linkCrosshair;
  linkDrawingsRef.current = linkDrawings;

  const subscribe = useCallback((chartId: string, listener: CrosshairListener) => {
    crosshairListenersRef.current.set(chartId, listener);
    return () => {
      crosshairListenersRef.current.delete(chartId);
    };
  }, []);

  const broadcast = useCallback((chartId: string, timestamp: number | null) => {
    if (!linkCrosshairRef.current) return;
    crosshairListenersRef.current.forEach((listener, id) => {
      if (id !== chartId) listener(timestamp);
    });
  }, []);

  const subscribeDrawings = useCallback((chartId: string, listener: DrawingSyncListener) => {
    drawingListenersRef.current.set(chartId, listener);
    return () => {
      drawingListenersRef.current.delete(chartId);
    };
  }, []);

  const broadcastDrawings = useCallback((chartId: string, drawings: SerializedDrawing[]) => {
    if (!linkDrawingsRef.current) return;
    drawingListenersRef.current.forEach((listener, id) => {
      if (id !== chartId) listener(drawings);
    });
  }, []);

  const value = useMemo(
    () => ({
      linkCrosshair,
      linkDrawings,
      subscribe,
      broadcast,
      subscribeDrawings,
      broadcastDrawings,
    }),
    [linkCrosshair, linkDrawings, subscribe, broadcast, subscribeDrawings, broadcastDrawings],
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
