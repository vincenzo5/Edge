"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";
import {
  getAccountPosition,
  subscribeAccountPosition,
} from "@/lib/marketData/accountPositionStore";

export function useAccountPositionForSymbol(
  symbol: string | null | undefined,
): AccountPosition | null {
  const normalized = symbol?.trim().toUpperCase() ?? "";
  const subscribe = useCallback(
    (listener: () => void) =>
      normalized ? subscribeAccountPosition(normalized, listener) : () => {},
    [normalized],
  );
  const getSnapshot = useCallback(
    () => (normalized ? getAccountPosition(normalized) : null),
    [normalized],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
