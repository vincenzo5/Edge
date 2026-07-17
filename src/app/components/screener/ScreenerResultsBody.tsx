"use client";

import { useCallback } from "react";
import {
  DEFAULT_SCREENER_COLUMNS,
  patchScreenerState,
  screenerLoadingLabel,
} from "@/lib/screener";
import { useScreenerSessionModel } from "@/lib/screener/useScreenerSessionModel";
import { addWatchlistItem, addWatchlistItems, createWatchlist } from "@/lib/watchlist/storage";
import { useChartActions } from "../ChartActionsContext";
import { useWatchlistActions } from "../watchlist/WatchlistContext";
import ResultsTable from "./ResultsTable";
import ComparisonDialog from "./ComparisonDialog";
import type { ScreenerResultRow } from "@/lib/screener/types";
import type { ScreenerScreensVariant } from "./ScreenerScreensBody";
import { useScreenerResultSelection } from "./useScreenerResultSelection";

type Props = {
  active: boolean;
  variant?: ScreenerScreensVariant;
  embedded?: boolean;
  onClose?: () => void;
};

export function ScreenerResultsBody({
  active,
  onClose,
}: Props) {
  const chartActions = useChartActions();
  const watchlistCtx = useWatchlistActions();

  const {
    state,
    setState,
    rows,
    meta,
    sortedRows,
    effectiveSort,
    loading,
    loadingTechnical,
    error,
    setPage,
    handleSortChange,
    selectedCompareSymbols,
    toggleCompareSymbol,
    compareOpen,
    setCompareOpen,
    compareRows,
    indicatorColumns,
    warnings,
    skippedSymbols,
    safePage,
    hasRun,
    setFilterViewMode,
    resultsViewMode,
    setResultsViewMode,
    heatMapConfig,
    setHeatMapConfig,
  } = useScreenerSessionModel(active);

  const { selectedRow, selectRow, selectIndex } = useScreenerResultSelection({
    active,
    sortedRows,
    hasRun,
    safePage,
    onPageChange: setPage,
  });

  const handleEditFilters = useCallback(() => {
    setFilterViewMode("edit");
  }, [setFilterViewMode]);

  const handleSelectRow = useCallback(
    (row: ScreenerResultRow, globalIndex: number) => {
      selectIndex(globalIndex);
      selectRow(row);
      if (chartActions) {
        chartActions.loadSymbolIntoActiveChart({
          symbol: row.symbol,
          name: row.name ?? row.symbol,
          exchange: row.exchange ?? "",
        });
        onClose?.();
      }
    },
    [chartActions, onClose, selectIndex, selectRow],
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

  const selectedSymbol = selectedRow?.symbol ?? null;

  const table = (
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
      hasRun={hasRun}
      onEditFilters={handleEditFilters}
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
      selectedSymbol={selectedSymbol}
      onSelectRow={handleSelectRow}
      onAddToWatchlist={handleAddToWatchlist}
      onAddAllToWatchlist={handleAddAllToWatchlist}
      onCreateWatchlistFromResults={handleCreateWatchlistFromResults}
      selectedCompareSymbols={selectedCompareSymbols}
      onToggleCompareSymbol={toggleCompareSymbol}
      onCompareSelected={() => setCompareOpen(true)}
      resultsViewMode={resultsViewMode}
      onResultsViewModeChange={setResultsViewMode}
      heatMapConfig={heatMapConfig}
      onHeatMapConfigChange={setHeatMapConfig}
    />
  );

  return (
    <>
      <div
        data-testid="screener-results-view"
        className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        {table}
      </div>
      <ComparisonDialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        rows={compareRows}
        indicatorValues={meta?.indicatorValues}
      />
    </>
  );
}
