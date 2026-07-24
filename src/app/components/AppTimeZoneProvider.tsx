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
import type { ChartTimeZone } from "@edge/chart-core/timeZone";
import {
  detectBrowserTimeZone,
  migrateAppTimeZoneIfNeeded,
  readAppTimeZonePreference,
  subscribeAppTimeZonePreference,
  writeAppTimeZonePreference,
} from "@/lib/app/appTimeZonePreference";

type AppTimeZoneContextValue = {
  timeZone: ChartTimeZone;
  setTimeZone: (timeZone: ChartTimeZone) => void;
};

const AppTimeZoneContext = createContext<AppTimeZoneContextValue | null>(null);

export function AppTimeZoneProvider({ children }: { children: ReactNode }) {
  const [timeZone, setTimeZoneState] = useState<ChartTimeZone>(() => detectBrowserTimeZone());

  useEffect(() => {
    setTimeZoneState(migrateAppTimeZoneIfNeeded());
  }, []);

  useEffect(() => {
    return subscribeAppTimeZonePreference((next) => {
      setTimeZoneState(next);
    });
  }, []);

  const setTimeZone = useCallback((next: ChartTimeZone) => {
    writeAppTimeZonePreference(next);
    setTimeZoneState(next);
  }, []);

  const value = useMemo(
    () => ({ timeZone, setTimeZone }),
    [timeZone, setTimeZone],
  );

  return (
    <AppTimeZoneContext.Provider value={value}>{children}</AppTimeZoneContext.Provider>
  );
}

export function useAppTimeZone(): AppTimeZoneContextValue {
  const ctx = useContext(AppTimeZoneContext);
  if (!ctx) {
    throw new Error("useAppTimeZone must be used within AppTimeZoneProvider");
  }
  return ctx;
}

export function useAppTimeZoneOptional(): AppTimeZoneContextValue | null {
  return useContext(AppTimeZoneContext);
}

export function readAppTimeZoneForMerge(): ChartTimeZone {
  return readAppTimeZonePreference() ?? detectBrowserTimeZone();
}
