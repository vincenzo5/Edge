"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type DataConnectionId,
  readDataConnectionPreference,
  writeExplicitDataConnectionPreference,
} from "./dataConnectionPreference";
import { IB_PAPER_CONNECTION_ID } from "@/lib/trading/connectionRegistry";

export function useDataConnectionPreference() {
  const [preference, setPreferenceState] = useState<DataConnectionId>(
    () => readDataConnectionPreference() ?? IB_PAPER_CONNECTION_ID,
  );

  useEffect(() => {
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
