"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  fetchMarketMoverResults,
  fetchScreenerResults,
} from "@/lib/chartDataFeed/apiScreenerFeed";
import { getAllIndicators } from "@edge/chart-core";
import {
  applyLeadingRuleTableDefaults,
  compareScreenerRows,
  compileScreenQueryFromGroup,
  deleteSavedScreen,
  deriveIndicatorColumnsFromValues,
  firstIndicatorSortKey,
  getSavedScreen,
  groupFromScreenQuery,
  loadSavedScreen,
  patchScreenerState,
  upsertSavedScreen,
  validateScreenQueryTechnical,
  type SavedScreen,
  isSavedMoversScreen,
  type ScreenerMeta,
  type ScreenerResultRow,
  type ScreenerSortSpec,
  isTechnicalScreenQuery,
  isScreenerColumnId,
} from "@/lib/screener";
import type { ScreenerSessionState } from "@/lib/screener/screenerSession";
import { topHeatMapQuoteSymbols } from "@/lib/screener/screenerHeatMapAdapter";
import { useScreenerState } from "@/app/components/screener/ScreenerProvider";
import { SCREENER_PAGE_SIZE } from "@/app/components/screener/ResultsTable";

const DEFAULT_SORT: ScreenerSortSpec = {
  column: "symbol",
  direction: "asc",
};

const LIVE_QUOTE_STREAM_CAP = 32;
const HEAT_MAP_QUOTE_STREAM_CAP = 200;
const EMPTY_SCREENER_ROWS: ScreenerResultRow[] = [];

function visibleSymbolsKey(symbols: string[]): string {
  return symbols.join(",");
}

export function useScreenerSessionModel(active: boolean) {
  const {
    state,
    setState,
    sort,
    setSort,
    session,
    patchSession,
    setSession,
    toggleCompareSymbol,
    clearCompareSelection,
    setCompareOpen,
  } = useScreenerState();

  const {
    lastRun,
    loading,
    loadingTechnical,
    error,
    page,
    queryDraft: queryRoot,
    displaySort,
    compareSelection: selectedCompareSymbols,
    compareOpen,
    filterViewMode,
    resultsViewMode,
    heatMapConfig,
  } = session;

  const rows = lastRun?.rows ?? EMPTY_SCREENER_ROWS;
  const meta = lastRun?.meta ?? null;
  const hasRun = lastRun != null;

  const effectiveSort = displaySort ?? sort ?? DEFAULT_SORT;

  useEffect(() => {
    if (!active) {
      if (session.visibleSymbols.length > 0) {
        patchSession({ visibleSymbols: [] });
      }
      return;
    }
    patchSession({
      queryDraft: groupFromScreenQuery(state.query),
      page: 0,
      error: null,
    });
  }, [active, state.query, patchSession, session.visibleSymbols]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => compareScreenerRows(a, b, effectiveSort, meta?.indicatorValues)),
    [rows, effectiveSort, meta?.indicatorValues],
  );

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / SCREENER_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 0), pageCount - 1);

  useEffect(() => {
    if (!active) return;
    const visible =
      resultsViewMode === "heatmap"
        ? topHeatMapQuoteSymbols(sortedRows, heatMapConfig, HEAT_MAP_QUOTE_STREAM_CAP)
        : sortedRows
            .slice(safePage * SCREENER_PAGE_SIZE, safePage * SCREENER_PAGE_SIZE + LIVE_QUOTE_STREAM_CAP)
            .map((row) => row.symbol.trim().toUpperCase())
            .filter(Boolean);
    if (visibleSymbolsKey(session.visibleSymbols) === visibleSymbolsKey(visible)) return;
    patchSession({ visibleSymbols: visible });
  }, [
    active,
    sortedRows,
    safePage,
    patchSession,
    session.visibleSymbols,
    resultsViewMode,
    heatMapConfig,
  ]);

  const limit = state.query.limit ?? 200;

  const handleSortChange = useCallback(
    (next: ScreenerSortSpec) => {
      patchSession({ displaySort: next });
      if (isScreenerColumnId(next.column)) {
        setSort({ column: next.column, direction: next.direction });
      }
    },
    [patchSession, setSort],
  );

  const applyRunResult = useCallback(
    (
      result: { rows: ScreenerResultRow[]; meta: ScreenerMeta },
      options?: { resetSortFromRoot?: typeof queryRoot },
    ) => {
      clearCompareSelection();
      patchSession({
        lastRun: result,
        compareSelection: [],
        filterViewMode: result.rows.length > 0 ? "scan" : "edit",
        reviewIndex: 0,
        reviewActive: result.rows.length > 0,
      });

      if (options?.resetSortFromRoot) {
        let nextDisplaySort: ScreenerSortSpec | null = null;
        setState((prev) => {
          const applied = applyLeadingRuleTableDefaults(prev, options.resetSortFromRoot!);
          nextDisplaySort = applied.displaySort;
          return applied.state;
        });
        patchSession({ displaySort: nextDisplaySort });
        return;
      }

      const indicatorKey = firstIndicatorSortKey(result.rows, result.meta.indicatorValues);
      if (indicatorKey) {
        patchSession({ displaySort: { column: indicatorKey, direction: "desc" } });
      }
    },
    [clearCompareSelection, patchSession, setState],
  );

  const runSavedScreen = useCallback(
    async (screen: SavedScreen) => {
      patchSession({ loading: true, error: null, page: 0 });
      try {
        let nextState = state;
        setState((prev) => {
          nextState = loadSavedScreen(prev, screen.id);
          return nextState;
        });
        patchSession({
          displaySort: nextState.sort ?? null,
          queryDraft: groupFromScreenQuery(nextState.query),
        });

        if (isSavedMoversScreen(screen)) {
          patchSession({ loadingTechnical: false });
          const result = await fetchMarketMoverResults({
            kind: screen.moverKind,
            limit: screen.limit ?? 50,
          });
          applyRunResult(result);
          return;
        }

        patchSession({ loadingTechnical: isTechnicalScreenQuery(screen.query) });
        const nextRoot = groupFromScreenQuery(screen.query);
        const result = await fetchScreenerResults(screen.query);
        applyRunResult(result, { resetSortFromRoot: nextRoot });
      } catch (err) {
        patchSession({
          lastRun: null,
          error: err instanceof Error ? err.message : "Failed to run screen",
        });
      } finally {
        patchSession({ loading: false, loadingTechnical: false });
      }
    },
    [applyRunResult, patchSession, setState, state],
  );

  /** @deprecated Use runSavedScreen */
  const runPreset = runSavedScreen;

  const runCustomQuery = useCallback(async () => {
    const query = compileScreenQueryFromGroup(queryRoot, limit);
    const validation = validateScreenQueryTechnical(query.technical, getAllIndicators());
    if (!validation.ok) {
      patchSession({ error: validation.errors[0] ?? "Invalid technical rule" });
      return;
    }
    patchSession({
      loading: true,
      loadingTechnical: isTechnicalScreenQuery(query),
      error: null,
      page: 0,
    });
    setState((prev) => patchScreenerState(prev, { activeScreenId: null, query }));
    try {
      const result = await fetchScreenerResults(query);
      applyRunResult(result, { resetSortFromRoot: queryRoot });
    } catch (err) {
      patchSession({
        lastRun: null,
        error: err instanceof Error ? err.message : "Failed to run screen",
      });
    } finally {
      patchSession({ loading: false, loadingTechnical: false });
    }
  }, [queryRoot, limit, setState, applyRunResult, patchSession]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        if (target.tagName === "TEXTAREA" || target.isContentEditable) return;
      }
      event.preventDefault();
      void runCustomQuery();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, runCustomQuery]);

  const handleSaveScreen = useCallback(
    (saveName: string) => {
      const name = saveName.trim();
      if (!name) return false;
      const query = compileScreenQueryFromGroup(queryRoot, limit);
      const validation = validateScreenQueryTechnical(query.technical, getAllIndicators());
      if (!validation.ok) {
        patchSession({ error: validation.errors[0] ?? "Invalid technical rule" });
        return false;
      }
      const screen: SavedScreen = {
        id: `screen-${Date.now()}`,
        name,
        kind: "screener",
        query,
        columns: state.columns,
        sort: state.sort ?? null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setState((prev) => upsertSavedScreen(prev, screen));
      return true;
    },
    [queryRoot, limit, state.columns, state.sort, setState, patchSession],
  );

  const handleLoadSavedScreen = useCallback(
    async (screenId: string) => {
      const screen = getSavedScreen(state, screenId);
      if (!screen) return;
      await runSavedScreen(screen);
    },
    [runSavedScreen, state],
  );

  const handleDeleteSavedScreen = useCallback(
    (screenId: string) => {
      setState((prev) => deleteSavedScreen(prev, screenId));
    },
    [setState],
  );

  const setQueryRoot = useCallback(
    (next: ScreenerSessionState["queryDraft"]) => {
      patchSession({ queryDraft: next });
    },
    [patchSession],
  );

  const setPage = useCallback(
    (next: number) => {
      patchSession({ page: next });
    },
    [patchSession],
  );

  const setFilterViewMode = useCallback(
    (mode: ScreenerSessionState["filterViewMode"]) => {
      patchSession({ filterViewMode: mode });
    },
    [patchSession],
  );

  const setResultsViewMode = useCallback(
    (mode: ScreenerSessionState["resultsViewMode"]) => {
      patchSession({ resultsViewMode: mode });
    },
    [patchSession],
  );

  const setHeatMapConfig = useCallback(
    (config: ScreenerSessionState["heatMapConfig"]) => {
      patchSession({ heatMapConfig: config });
    },
    [patchSession],
  );

  const compareRows = useMemo(
    () =>
      rows.filter((row) =>
        selectedCompareSymbols.includes(row.symbol.trim().toUpperCase()),
      ),
    [rows, selectedCompareSymbols],
  );

  const indicatorColumns = useMemo(
    () => deriveIndicatorColumnsFromValues(rows, meta?.indicatorValues),
    [rows, meta?.indicatorValues],
  );

  return {
    state,
    setState,
    sort,
    session,
    rows,
    meta,
    sortedRows,
    safePage,
    effectiveSort,
    loading,
    loadingTechnical,
    error,
    queryRoot,
    setQueryRoot,
    setPage,
    limit,
    handleSortChange,
    runPreset,
    runSavedScreen,
    runCustomQuery,
    handleSaveScreen,
    handleLoadSavedScreen,
    handleDeleteSavedScreen,
    selectedCompareSymbols,
    toggleCompareSymbol,
    compareOpen,
    setCompareOpen,
    compareRows,
    indicatorColumns,
    warnings: meta?.warnings ?? [],
    skippedSymbols: meta?.skippedSymbols ?? [],
    hasRun,
    filterViewMode,
    setFilterViewMode,
    resultsViewMode,
    setResultsViewMode,
    heatMapConfig,
    setHeatMapConfig,
  };
}
