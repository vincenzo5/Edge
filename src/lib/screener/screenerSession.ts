import { groupFromScreenQuery } from "@/lib/screener/compileQuery";
import type { RuleGroup } from "@/lib/screener/compileQuery";
import type { ScreenerLastRun, ScreenerSortSpec, ScreenerState } from "@/lib/screener/types";
import type { HeatMapConfig } from "@/lib/heatmap/types";
import { DEFAULT_HEAT_MAP_CONFIG } from "@/lib/heatmap/defaults";

export type ScreenerResultsViewMode = "list" | "heatmap";

export type ScreenerFilterViewMode = "edit" | "scan";

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
  filterViewMode: ScreenerFilterViewMode;
  resultsViewMode: ScreenerResultsViewMode;
  heatMapConfig: HeatMapConfig;
  reviewIndex: number;
  keepers: string[];
  skipped: string[];
  reviewActive: boolean;
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
    filterViewMode: "edit",
    resultsViewMode: "list",
    heatMapConfig: DEFAULT_HEAT_MAP_CONFIG,
    reviewIndex: 0,
    keepers: [],
    skipped: [],
    reviewActive: false,
  };
}
