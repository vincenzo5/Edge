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
  groupFromScreenQuery,
  loadSavedScreen,
  patchScreenerState,
  upsertSavedScreen,
  validateScreenQueryTechnical,
  type SavedScreen,
  type ScreenerMeta,
  type ScreenerPreset,
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

  const runPreset = useCallback(
    async (preset: ScreenerPreset) => {
      patchSession({ loading: true, error: null, page: 0 });
      try {
        if (preset.kind === "movers") {
          patchSession({ loadingTechnical: false });
          const result = await fetchMarketMoverResults({
            kind: preset.moverKind,
            limit: preset.limit ?? 50,
          });
          applyRunResult(result);
          setState((prev) =>
            patchScreenerState(prev, {
              activeScreenId: null,
              query: { limit: preset.limit ?? 50 },
            }),
          );
          patchSession({ queryDraft: groupFromScreenQuery({ limit: preset.limit ?? 50 }) });
          return;
        }

        const nextQuery = preset.query;
        patchSession({ loadingTechnical: isTechnicalScreenQuery(nextQuery) });
        setState((prev) =>
          patchScreenerState(prev, { activeScreenId: null, query: nextQuery }),
        );
        const nextRoot = groupFromScreenQuery(nextQuery);
        patchSession({ queryDraft: nextRoot });
        const result = await fetchScreenerResults(nextQuery);
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
    [applyRunResult, patchSession, setState],
  );

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
      let nextState = state;
      setState((prev) => {
        nextState = loadSavedScreen(prev, screenId);
        return nextState;
      });
      patchSession({
        queryDraft: groupFromScreenQuery(nextState.query),
        displaySort: nextState.sort ?? null,
        loading: true,
        loadingTechnical: isTechnicalScreenQuery(nextState.query),
        error: null,
        page: 0,
      });
      try {
        const result = await fetchScreenerResults(nextState.query);
        applyRunResult(result);
      } catch (err) {
        patchSession({
          lastRun: null,
          error: err instanceof Error ? err.message : "Failed to run saved screen",
        });
      } finally {
        patchSession({ loading: false, loadingTechnical: false });
      }
    },
    [state, setState, applyRunResult, patchSession],
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
