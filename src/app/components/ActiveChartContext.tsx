"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CellConfig, Theme, TrackedOverlay } from "@/lib/chartConfig";
import type { DataWindowProps } from "./ObjectTree";

export type ActiveChartOverlayActions = {
  remove: (id: string) => void;
  setVisible: (id: string, visible: boolean) => void;
  setLocked: (id: string, locked: boolean) => void;
  rename: (id: string, label: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  duplicate: (id: string) => void;
  subscribe: (cb: () => void) => () => void;
};

export type ActiveChartSnapshot = {
  chartId: string;
  config: CellConfig;
  theme: Theme;
  overlays: TrackedOverlay[];
  dataWindow: DataWindowProps;
  overlayActions: ActiveChartOverlayActions;
  onConfigChange: (next: CellConfig) => void;
  openIndicatorPicker: () => void;
};

type ActiveChartContextValue = {
  register: (chartId: string, snapshot: ActiveChartSnapshot) => void;
  unregister: (chartId: string) => void;
  getSnapshot: () => ActiveChartSnapshot | null;
  subscribe: (listener: () => void) => () => void;
};

const ActiveChartContext = createContext<ActiveChartContextValue | null>(null);

export function ActiveChartProvider({ children }: { children: React.ReactNode }) {
  const snapshotRef = useRef<ActiveChartSnapshot | null>(null);
  const listenersRef = useRef(new Set<() => void>());
  const [, bump] = useState(0);

  const notify = useCallback(() => {
    listenersRef.current.forEach((listener) => listener());
  }, []);

  const register = useCallback(
    (chartId: string, snapshot: ActiveChartSnapshot) => {
      snapshotRef.current = { ...snapshot, chartId };
      notify();
      bump((n) => n + 1);
    },
    [notify],
  );

  const unregister = useCallback(
    (chartId: string) => {
      if (snapshotRef.current?.chartId !== chartId) return;
      snapshotRef.current = null;
      notify();
      bump((n) => n + 1);
    },
    [notify],
  );

  const getSnapshot = useCallback(() => snapshotRef.current, []);

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({ register, unregister, getSnapshot, subscribe }),
    [register, unregister, getSnapshot, subscribe],
  );

  return (
    <ActiveChartContext.Provider value={value}>
      {children}
    </ActiveChartContext.Provider>
  );
}

export function useActiveChart(): ActiveChartSnapshot | null {
  const ctx = useContext(ActiveChartContext);
  if (!ctx) return null;

  return useSyncExternalStore(ctx.subscribe, ctx.getSnapshot, () => null);
}

export function useActiveChartBridge(): ActiveChartContextValue | null {
  return useContext(ActiveChartContext);
}
