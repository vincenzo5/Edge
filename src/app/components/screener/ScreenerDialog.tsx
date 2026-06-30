"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Theme } from "@/lib/chartConfig";
import {
  fetchMarketMoverResults,
  fetchScreenerResults,
} from "@/lib/chartDataFeed/apiScreenerFeed";
import { getAllIndicators } from "@edge/chart-core";
import {
  applyLeadingRuleTableDefaults,
  compareScreenerRows,
  compileScreenQueryFromGroup,
  DEFAULT_SCREENER_COLUMNS,
  deleteSavedScreen,
  deriveIndicatorColumnsFromValues,
  firstIndicatorSortKey,
  groupFromScreenQuery,
  loadSavedScreen,
  patchScreenerState,
  SCREENER_PRESETS,
  upsertSavedScreen,
  validateScreenQueryTechnical,
  type RuleGroup,
  type SavedScreen,
  type ScreenerMeta,
  type ScreenerPreset,
  type ScreenerResultRow,
  type ScreenerSortSpec,
  isTechnicalScreenQuery,
  screenerLoadingLabel,
  isScreenerColumnId,
} from "@/lib/screener";
import { addWatchlistItem, addWatchlistItems, createWatchlist } from "@/lib/watchlist/storage";
import { EdgeButton, EdgeModalShell } from "../design-system";
import { useChartActions } from "../ChartActionsContext";
import { useWatchlistActions } from "../watchlist/WatchlistContext";
import QueryBuilder from "./QueryBuilder";
import ResultsTable, { SCREENER_PAGE_SIZE } from "./ResultsTable";
import ComparisonDialog from "./ComparisonDialog";
import { useScreenerState } from "./ScreenerProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  theme?: Theme;
};

const DEFAULT_SORT: ScreenerSortSpec = {
  column: "symbol",
  direction: "asc",
};

const LIVE_QUOTE_STREAM_CAP = 32;

export default function ScreenerDialog({ open, onClose }: Props) {
  const chartActions = useChartActions();
  const watchlistCtx = useWatchlistActions();
  const {
    state,
    setState,
    sort,
    setSort,
    setScreenerVisibleSymbols,
    setLastRun,
    selectedCompareSymbols,
    toggleCompareSymbol,
    clearCompareSelection,
    compareOpen,
    setCompareOpen,
  } = useScreenerState();
  const [queryRoot, setQueryRoot] = useState<RuleGroup>(() => groupFromScreenQuery(state.query));
  const [rows, setRows] = useState<ScreenerResultRow[]>([]);
  const [meta, setMeta] = useState<ScreenerMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTechnical, setLoadingTechnical] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [saveName, setSaveName] = useState("");
  const [displaySort, setDisplaySort] = useState<ScreenerSortSpec | null>(null);

  const effectiveSort = displaySort ?? sort ?? DEFAULT_SORT;

  const handleSortChange = useCallback(
    (next: ScreenerSortSpec) => {
      setDisplaySort(next);
      if (isScreenerColumnId(next.column)) {
        setSort({ column: next.column, direction: next.direction });
      }
    },
    [setSort],
  );

  useEffect(() => {
    if (!open) {
      setScreenerVisibleSymbols([]);
      return;
    }
    setQueryRoot(groupFromScreenQuery(state.query));
    setPage(0);
    setError(null);
  }, [open, state.query, setScreenerVisibleSymbols]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => compareScreenerRows(a, b, effectiveSort, meta?.indicatorValues)),
    [rows, effectiveSort, meta?.indicatorValues],
  );

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / SCREENER_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 0), pageCount - 1);

  useEffect(() => {
    if (!open) return;
    const pageStart = safePage * SCREENER_PAGE_SIZE;
    const visible = sortedRows
      .slice(pageStart, pageStart + LIVE_QUOTE_STREAM_CAP)
      .map((row) => row.symbol.trim().toUpperCase())
      .filter(Boolean);
    setScreenerVisibleSymbols(visible);
  }, [open, sortedRows, safePage, setScreenerVisibleSymbols]);

  const limit = state.query.limit ?? 200;

  const applyRunResult = useCallback(
    (
      result: { rows: ScreenerResultRow[]; meta: ScreenerMeta },
      options?: { resetSortFromRoot?: RuleGroup },
    ) => {
      setRows(result.rows);
      setMeta(result.meta);
      setLastRun(result);
      clearCompareSelection();

      if (options?.resetSortFromRoot) {
        let nextDisplaySort: ScreenerSortSpec | null = null;
        setState((prev) => {
          const applied = applyLeadingRuleTableDefaults(prev, options.resetSortFromRoot!);
          nextDisplaySort = applied.displaySort;
          return applied.state;
        });
        setDisplaySort(nextDisplaySort);
        return;
      }

      const indicatorKey = firstIndicatorSortKey(result.rows, result.meta.indicatorValues);
      if (indicatorKey) {
        setDisplaySort({ column: indicatorKey, direction: "desc" });
      }
    },
    [setLastRun, clearCompareSelection, setState],
  );

  const runPreset = useCallback(
    async (preset: ScreenerPreset) => {
      setLoading(true);
      setError(null);
      setPage(0);
      try {
        if (preset.kind === "movers") {
          setLoadingTechnical(false);
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
          setQueryRoot(groupFromScreenQuery({ limit: preset.limit ?? 50 }));
          return;
        }

        const nextQuery = preset.query;
        setLoadingTechnical(isTechnicalScreenQuery(nextQuery));
        setState((prev) =>
          patchScreenerState(prev, { activeScreenId: null, query: nextQuery }),
        );
        const nextRoot = groupFromScreenQuery(nextQuery);
        setQueryRoot(nextRoot);
        const result = await fetchScreenerResults(nextQuery);
        applyRunResult(result, { resetSortFromRoot: nextRoot });
      } catch (err) {
        setRows([]);
        setMeta(null);
        setLastRun(null);
        setError(err instanceof Error ? err.message : "Failed to run screen");
      } finally {
        setLoading(false);
        setLoadingTechnical(false);
      }
    },
    [setState, applyRunResult, setLastRun],
  );

  const runCustomQuery = useCallback(async () => {
    const query = compileScreenQueryFromGroup(queryRoot, limit);
    const validation = validateScreenQueryTechnical(query.technical, getAllIndicators());
    if (!validation.ok) {
      setError(validation.errors[0] ?? "Invalid technical rule");
      return;
    }
    setLoading(true);
    setLoadingTechnical(isTechnicalScreenQuery(query));
    setError(null);
    setPage(0);
    setState((prev) => patchScreenerState(prev, { activeScreenId: null, query }));
    try {
      const result = await fetchScreenerResults(query);
      applyRunResult(result, { resetSortFromRoot: queryRoot });
    } catch (err) {
      setRows([]);
      setMeta(null);
      setLastRun(null);
      setError(err instanceof Error ? err.message : "Failed to run screen");
    } finally {
      setLoading(false);
      setLoadingTechnical(false);
    }
  }, [queryRoot, limit, setState, applyRunResult, setLastRun]);

  useEffect(() => {
    if (!open) return;
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
  }, [open, runCustomQuery]);

  const handleSaveScreen = useCallback(() => {
    const name = saveName.trim();
    if (!name) return;
    const query = compileScreenQueryFromGroup(queryRoot, limit);
    const validation = validateScreenQueryTechnical(query.technical, getAllIndicators());
    if (!validation.ok) {
      setError(validation.errors[0] ?? "Invalid technical rule");
      return;
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
    setSaveName("");
  }, [saveName, queryRoot, limit, state.columns, state.sort, setState]);

  const handleLoadSavedScreen = useCallback(
    async (screenId: string) => {
      let nextState = state;
      setState((prev) => {
        nextState = loadSavedScreen(prev, screenId);
        return nextState;
      });
      setQueryRoot(groupFromScreenQuery(nextState.query));
      setDisplaySort(nextState.sort ?? null);
      setLoading(true);
      setLoadingTechnical(isTechnicalScreenQuery(nextState.query));
      setError(null);
      setPage(0);
      try {
        const result = await fetchScreenerResults(nextState.query);
        applyRunResult(result);
      } catch (err) {
        setRows([]);
        setMeta(null);
        setLastRun(null);
        setError(err instanceof Error ? err.message : "Failed to run saved screen");
      } finally {
        setLoading(false);
        setLoadingTechnical(false);
      }
    },
    [state, setState, applyRunResult, setLastRun],
  );

  const handleDeleteSavedScreen = useCallback(
    (screenId: string) => {
      setState((prev) => deleteSavedScreen(prev, screenId));
    },
    [setState],
  );

  const handleLoadChart = useCallback(
    (row: ScreenerResultRow) => {
      chartActions?.loadSymbolIntoActiveChart({
        symbol: row.symbol,
        name: row.name ?? row.symbol,
        exchange: row.exchange ?? "",
      });
      onClose();
    },
    [chartActions, onClose],
  );

  const handleAddToWatchlist = useCallback(
    (row: ScreenerResultRow) => {
      watchlistCtx?.setState((prev) =>
        addWatchlistItem(prev, {
          symbol: row.symbol,
          name: row.name ?? undefined,
          exchange: row.exchange ?? undefined,
        }),
      );
    },
    [watchlistCtx],
  );

  const handleAddAllToWatchlist = useCallback(() => {
    watchlistCtx?.setState((prev) =>
      addWatchlistItems(
        prev,
        rows.map((row) => ({
          symbol: row.symbol,
          name: row.name ?? undefined,
          exchange: row.exchange ?? undefined,
        })),
      ),
    );
  }, [watchlistCtx, rows]);

  const handleCreateWatchlistFromResults = useCallback(() => {
    watchlistCtx?.setState((prev) => {
      const withList = createWatchlist(prev, "Screener results");
      return addWatchlistItems(
        withList,
        rows.map((row) => ({
          symbol: row.symbol,
          name: row.name ?? undefined,
          exchange: row.exchange ?? undefined,
        })),
      );
    });
  }, [watchlistCtx, rows]);

  const warnings = useMemo(() => meta?.warnings ?? [], [meta]);
  const skippedSymbols = useMemo(() => meta?.skippedSymbols ?? [], [meta]);
  const indicatorColumns = useMemo(
    () => deriveIndicatorColumnsFromValues(rows, meta?.indicatorValues),
    [rows, meta?.indicatorValues],
  );

  const compareRows = useMemo(
    () =>
      rows.filter((row) =>
        selectedCompareSymbols.includes(row.symbol.trim().toUpperCase()),
      ),
    [rows, selectedCompareSymbols],
  );

  return (
    <>
    <EdgeModalShell
      open={open}
      title="Stock Screener"
      subtitle="Filter US equities and ETFs, then load symbols into the chart or watchlist."
      onClose={onClose}
      maxWidth="full"
      align="top"
      testId="screener-dialog"
      headerActions={
        <>
          <input
            type="text"
            value={saveName}
            onChange={(event) => setSaveName(event.target.value)}
            placeholder="Save screen as…"
            className="edge-focus-ring w-48 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-xs"
            data-testid="screener-save-name"
          />
          <EdgeButton
            type="button"
            data-testid="screener-save-button"
            onClick={handleSaveScreen}
            disabled={!saveName.trim()}
          >
            Save
          </EdgeButton>
        </>
      }
      footer={
        <label className="flex items-center gap-2 text-xs text-[var(--edge-text-secondary)]">
          <span className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">Limit</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={limit}
            onChange={(event) =>
              setState((prev) =>
                patchScreenerState(prev, {
                  query: { ...prev.query, limit: Number(event.target.value) || 200 },
                }),
              )
            }
            className="edge-focus-ring w-20 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-xs"
            data-testid="screener-limit-input"
          />
        </label>
      }
    >
      <div className="flex max-h-[min(78vh,760px)] min-h-[420px] overflow-hidden">
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-[var(--edge-border)] px-3 py-3">
          <div className="mb-4">
            <h3 className="mb-2 text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
              Presets
            </h3>
            <div className="space-y-1">
              {SCREENER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`screener-preset-${preset.id}`}
                  className="edge-focus-ring w-full rounded px-2 py-1.5 text-left text-xs text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-panel)]"
                  onClick={() => void runPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
              Saved screens
            </h3>
            {state.savedScreens.length === 0 ? (
              <p className="text-xs text-[var(--edge-text-secondary)]">No saved screens yet.</p>
            ) : (
              <div className="space-y-1">
                {state.savedScreens.map((screen) => (
                  <div
                    key={screen.id}
                    className={`flex items-center gap-1 rounded px-1 ${
                      state.activeScreenId === screen.id
                        ? "bg-[var(--edge-surface-panel)]"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      data-testid={`screener-saved-${screen.id}`}
                      className="edge-focus-ring min-w-0 flex-1 truncate px-1 py-1 text-left text-xs text-[var(--edge-text-primary)] hover:text-[var(--edge-accent-blue)]"
                      onClick={() => void handleLoadSavedScreen(screen.id)}
                    >
                      {screen.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${screen.name}`}
                      className="edge-focus-ring rounded px-1 text-[10px] text-[var(--edge-negative)]"
                      onClick={() => handleDeleteSavedScreen(screen.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col px-4 py-3">
          <div className="mb-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
                Custom query
              </h3>
              <div className="flex items-center gap-2">
                <EdgeButton
                  type="button"
                  variant="primary"
                  data-testid="screener-run-button"
                  onClick={() => void runCustomQuery()}
                  disabled={loading}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {loading ? (
                      <span
                        className="h-3 w-3 animate-spin rounded-full border border-[var(--edge-border)] border-t-[var(--edge-text-strong)]"
                        aria-hidden
                      />
                    ) : (
                      <span aria-hidden>▶</span>
                    )}
                    <span>{loading ? "Running…" : "Run screen"}</span>
                  </span>
                </EdgeButton>
                <span
                  className="text-[10px] text-[var(--edge-text-muted)]"
                  data-testid="screener-run-shortcut-hint"
                >
                  ⌘↵
                </span>
              </div>
            </div>
            <QueryBuilder root={queryRoot} onRootChange={setQueryRoot} />
          </div>

          <ResultsTable
            rows={rows}
            columns={state.columns}
            indicatorColumns={indicatorColumns}
            indicatorValues={meta?.indicatorValues}
            sort={effectiveSort}
            page={page}
            loading={loading}
            loadingLabel={screenerLoadingLabel(loadingTechnical)}
            phases={meta?.phases}
            error={error}
            warnings={warnings}
            skippedSymbols={skippedSymbols}
            onSortChange={handleSortChange}
            onPageChange={setPage}
            onColumnsChange={(columns) =>
              setState((prev) => patchScreenerState(prev, { columns }))
            }
            onResetColumns={() =>
              setState((prev) =>
                patchScreenerState(prev, { columns: DEFAULT_SCREENER_COLUMNS }),
              )
            }
            onLoadChart={handleLoadChart}
            onAddToWatchlist={handleAddToWatchlist}
            onAddAllToWatchlist={handleAddAllToWatchlist}
            onCreateWatchlistFromResults={handleCreateWatchlistFromResults}
            selectedCompareSymbols={selectedCompareSymbols}
            onToggleCompareSymbol={toggleCompareSymbol}
            onCompareSelected={() => setCompareOpen(true)}
          />
        </div>
      </div>
    </EdgeModalShell>
    <ComparisonDialog
      open={compareOpen}
      onClose={() => setCompareOpen(false)}
      rows={compareRows}
      indicatorValues={meta?.indicatorValues}
    />
    </>
  );
}
