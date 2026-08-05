"use client";

import { useCallback, useEffect } from "react";
import {
  type DataConnectionId,
  readDataConnectionPreference,
} from "./dataConnectionPreference";
import { IB_LIVE_CONNECTION_ID } from "@/lib/trading/connectionRegistry";

export function useDataConnectionPreference() {
  useEffect(() => {
    readDataConnectionPreference();
  }, []);

  const setPreference = useCallback((_connectionId: DataConnectionId) => {
    // Display market data is fixed to ib-live — no user override.
  }, []);

  return { preference: IB_LIVE_CONNECTION_ID, setPreference };
}
