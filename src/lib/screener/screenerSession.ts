import { groupFromScreenQuery } from "@/lib/screener/compileQuery";
import type { RuleGroup } from "@/lib/screener/compileQuery";
import type { ScreenerLastRun, ScreenerSortSpec, ScreenerState } from "@/lib/screener/types";

export type ScreenerSessionState = {
  lastRun: ScreenerLastRun | null;
  loading: boolean;
  loadingTechnical: boolean;
  error: string | null;
  page: number;
  queryDraft: RuleGroup;
  displaySort: ScreenerSortSpec | null;
  compareSelection: string[];
  compareOpen: boolean;
  visibleSymbols: string[];
};

export function createDefaultScreenerSession(
  persisted: Pick<ScreenerState, "query" | "sort">,
): ScreenerSessionState {
  return {
    lastRun: null,
    loading: false,
    loadingTechnical: false,
    error: null,
    page: 0,
    queryDraft: groupFromScreenQuery(persisted.query),
    displaySort: persisted.sort ?? null,
    compareSelection: [],
    compareOpen: false,
    visibleSymbols: [],
  };
}
