"use client";

import { useScreenerState } from "./ScreenerProvider";
import { useScreenerSessionModel as useScreenerSessionModelCore } from "@/lib/screener/useScreenerSessionModel";

export function useScreenerSessionModel(active: boolean) {
  const store = useScreenerState();
  return useScreenerSessionModelCore(store, active);
}
