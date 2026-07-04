"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_SCREENER_COLUMNS,
  patchScreenerState,
  SCREENER_PRESETS,
  screenerLoadingLabel,
} from "@/lib/screener";
import { addWatchlistItem, addWatchlistItems, createWatchlist } from "@/lib/watchlist/storage";
import { useScreenerSessionModel } from "@/lib/screener/useScreenerSessionModel";
import { EdgeButton, EdgeModalShell } from "../design-system";
import { PanelPopOutButton } from "../sidebar/PanelChromeActions";
import { useChartActions } from "../ChartActionsContext";
import { useWatchlistActions } from "../watchlist/WatchlistContext";
import QueryBuilder from "./QueryBuilder";
import ResultsTable from "./ResultsTable";
import ComparisonDialog from "./ComparisonDialog";
import type { ScreenerResultRow } from "@/lib/screener/types";

type Props = {
  active: boolean;
  variant: "modal" | "sidebar" | "floating";
  onClose?: () => void;
};

export function ScreenerPanelContent({ active, variant, onClose }: Props) {
  const chartActions = useChartActions();
  const watchlistCtx = useWatchlistActions();
  const [saveName, setSaveName] = useState("");

  const {
    state,
    setState,
    rows,
    meta,
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
    warnings,
    skippedSymbols,
    safePage,
  } = useScreenerSessionModel(active);

  const handleLoadChart = useCallback(
    (row: ScreenerResultRow) => {
      chartActions?.loadSymbolIntoActiveChart({
        symbol: row.symbol,
        name: row.name ?? row.symbol,
        exchange: row.exchange ?? "",
      });
      onClose?.();
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

  const saveControls = (
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
        onClick={() => {
          if (handleSaveScreen(saveName)) setSaveName("");
        }}
        disabled={!saveName.trim()}
      >
        Save
      </EdgeButton>
    </>
  );

  const limitControl = (
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
  );

  const bodyLayoutClass =
    variant === "modal"
      ? "flex max-h-[min(78vh,760px)] min-h-[420px] overflow-hidden"
      : variant === "floating"
        ? "flex min-h-0 flex-1 overflow-hidden"
        : "flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row";

  const body = (
    <div className={bodyLayoutClass}>
      <aside
        className={
          variant === "modal"
            ? "w-56 shrink-0 overflow-y-auto border-r border-[var(--edge-border)] px-3 py-3"
            : variant === "floating"
              ? "w-56 shrink-0 overflow-y-auto border-r border-[var(--edge-border)] px-3 py-3"
              : "shrink-0 overflow-y-auto border-b border-[var(--edge-border)] px-3 py-3 lg:w-48 lg:border-b-0 lg:border-r"
        }
      >
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-3">
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
          page={safePage}
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
  );

  if (variant === "sidebar") {
    if (!active) return null;
    return (
      <>
        <div className="shrink-0 border-b border-[var(--edge-border)] px-3 py-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--edge-text-secondary)]">
              Stock screener
            </div>
            <PanelPopOutButton label="Pop out" />
          </div>
          <div className="flex flex-wrap items-center gap-2">{saveControls}</div>
          <div className="mt-2">{limitControl}</div>
        </div>
        {body}
        <ComparisonDialog
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          rows={compareRows}
          indicatorValues={meta?.indicatorValues}
        />
      </>
    );
  }

  if (variant === "floating") {
    if (!active) return null;
    return (
      <>
        <div className="shrink-0 border-b border-[var(--edge-border)] px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">{saveControls}</div>
          <div className="mt-2">{limitControl}</div>
        </div>
        {body}
        <ComparisonDialog
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          rows={compareRows}
          indicatorValues={meta?.indicatorValues}
        />
      </>
    );
  }

  return (
    <>
      <EdgeModalShell
        open={active}
        title="Stock Screener"
        subtitle="Filter US equities and ETFs, then load symbols into the chart or watchlist."
        onClose={onClose ?? (() => {})}
        maxWidth="full"
        align="top"
        testId="screener-dialog"
        headerActions={saveControls}
        footer={limitControl}
      >
        {body}
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
