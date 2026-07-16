"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type DataConnectionId,
  readDataConnectionPreference,
  writeExplicitDataConnectionPreference,
} from "./dataConnectionPreference";
import { IB_PAPER_CONNECTION_ID } from "@/lib/trading/connectionRegistry";

export function useDataConnectionPreference() {
  // SSR-stable default — never read localStorage in useState (hydration mismatch).
  const [preference, setPreferenceState] = useState<DataConnectionId>(IB_PAPER_CONNECTION_ID);

  useEffect(() => {
    const stored = readDataConnectionPreference();
    if (stored) setPreferenceState(stored);

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<DataConnectionId>).detail;
      if (detail) {
        setPreferenceState(detail);
      }
    };
    window.addEventListener("edge:dataConnectionPreference", handler);
    return () => window.removeEventListener("edge:dataConnectionPreference", handler);
  }, []);

  const setPreference = useCallback((connectionId: DataConnectionId) => {
    writeExplicitDataConnectionPreference(connectionId);
    setPreferenceState(connectionId);
  }, []);

  return { preference, setPreference };
}
