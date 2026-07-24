import type { PersistedScreenerSortSpec, ScreenerState } from "@/lib/screener/types";
import type { ScreenerSessionState } from "@/lib/screener/screenerSession";

/** Fields from ScreenerProvider consumed by the session model hook. */
export type ScreenerSessionModelStore = {
  state: ScreenerState;
  setState: (updater: (prev: ScreenerState) => ScreenerState) => void;
  sort: PersistedScreenerSortSpec | null;
  setSort: (sort: PersistedScreenerSortSpec | null) => void;
  session: ScreenerSessionState;
  patchSession: (patch: Partial<ScreenerSessionState>) => void;
  setSession: (updater: (prev: ScreenerSessionState) => ScreenerSessionState) => void;
  toggleCompareSymbol: (symbol: string) => void;
  clearCompareSelection: () => void;
  setCompareOpen: (open: boolean) => void;
};
