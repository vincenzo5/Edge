"use client";

import { useCallback, useEffect, useState } from "react";
import type { DataProviderPreference } from "@/lib/connections/types";
import {
  DATA_PROVIDER_PREFERENCE_EVENT,
  readDataProviderPreference,
  writeDataProviderPreference,
} from "./dataProviderPreference";

export function useDataProviderPreference(): {
  preference: DataProviderPreference;
  setPreference: (next: DataProviderPreference) => void;
} {
  const [preference, setPreferenceState] = useState<DataProviderPreference>(() =>
    readDataProviderPreference(),
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<DataProviderPreference>).detail;
      if (detail) {
        setPreferenceState(detail);
        return;
      }
      setPreferenceState(readDataProviderPreference());
    };
    window.addEventListener(DATA_PROVIDER_PREFERENCE_EVENT, handler);
    return () => window.removeEventListener(DATA_PROVIDER_PREFERENCE_EVENT, handler);
  }, []);

  const setPreference = useCallback((next: DataProviderPreference) => {
    writeDataProviderPreference(next);
    setPreferenceState(readDataProviderPreference());
  }, []);

  return { preference, setPreference };
}
