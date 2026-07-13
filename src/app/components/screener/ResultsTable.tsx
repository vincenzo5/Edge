"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ScreenerColumnId,
  ScreenerIndicatorColumnDef,
  ScreenerPhaseInfo,
  ScreenerResultRow,
  ScreenerSortSpec,
} from "@/lib/screener/types";
import type { HeatMapConfig } from "@/lib/heatmap/types";
import type { ScreenerResultsViewMode } from "@/lib/screener/screenerSession";
import {
  DEFAULT_SCREENER_COLUMNS,
  formatScreenerPhaseSummary,
  SCREENER_COLUMN_LABELS,
} from "@/lib/screener/types";
import { compareScreenerRows } from "@/lib/screener/deriveDefaultSort";
import {
  copySymbolsToClipboard,
  downloadResultsCsv,
} from "@/lib/screener/exportResults";
import {
  heatMapSizeMetricCoverageWarning,
  screenerRowsToHeatMapItems,
  topHeatMapQuoteSymbols,
} from "@/lib/screener/screenerHeatMapAdapter";
import { useMarketDataQuotesForSymbols } from "../MarketDataProvider";
import { EdgeButton, EdgeEmptyState, EdgeSegmentedTabs } from "../design-system";
import { HeatMapToolbar, HeatMapView } from "../heatmap";
import { mergeScreenerQuoteOverlay } from "./useScreenerQuoteOverlay";
import ColumnPicker from "./ColumnPicker";

const PAGE_SIZE = 50;
const LIVE_QUOTE_STREAM_CAP = 32;
const HEAT_MAP_QUOTE_STREAM_CAP = 200;

type Props = {
  rows: ScreenerResultRow[];
  columns?: ScreenerColumnId[];
  indicatorColumns?: ScreenerIndicatorColumnDef[];
  indicatorValues?: Record<string, Record<string, number>>;
  sort: ScreenerSortSpec;
  page: number;
  loading?: boolean;
  loadingLabel?: string;
  phases?: ScreenerPhaseInfo;
  error?: string | null;
  warnings?: string[];
  skippedSymbols?: string[];
  onSortChange: (sort: ScreenerSortSpec) => void;
  onPageChange: (page: number) => void;
  onColumnsChange?: (columns: ScreenerColumnId[]) => void;
  onResetColumns?: () => void;
  onLoadChart: (row: ScreenerResultRow) => void;
  onAddToWatchlist: (row: ScreenerResultRow) => void;
  onAddAllToWatchlist?: () => void;
  onCreateWatchlistFromResults?: () => void;
  selectedCompareSymbols?: string[];
  onToggleCompareSymbol?: (symbol: string) => void;
  onCompareSelected?: () => void;
  hasRun?: boolean;
  onEditFilters?: () => void;
  resultsViewMode?: ScreenerResultsViewMode;
  onResultsViewModeChange?: (mode: ScreenerResultsViewMode) => void;
  heatMapConfig?: HeatMapConfig;
  onHeatMapConfigChange?: (config: HeatMapConfig) => void;
};

function formatNumber(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatMarketCap(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}T`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return formatNumber(value, 0);
}

function formatCell(column: ScreenerColumnId, row: ScreenerResultRow): string {
  switch (column) {
    case "symbol":
      return row.symbol;
    case "name":
      return row.name ?? "—";
    case "price":
      return formatNumber(row.price, 2);
    case "change":
      return formatNumber(row.change, 2);
    case "changePercent":
      return row.changePercent == null ? "—" : `${formatNumber(row.changePercent, 2)}%`;
    case "volume":
      return formatNumber(row.volume, 0);
    case "sector":
      return row.sector ?? "—";
    case "industry":
      return row.industry ?? "—";
    case "country":
      return row.country ?? "—";
    case "marketCap":
      return formatMarketCap(row.marketCap);
    case "dividendYield":
      return row.dividendYield == null ? "—" : `${formatNumber(row.dividendYield * 100, 2)}%`;
    case "beta":
      return formatNumber(row.beta, 2);
    default:
      return "—";
  }
}

function formatIndicatorCell(
  key: string,
  row: ScreenerResultRow,
  indicatorValues?: Record<string, Record<string, number>>,
): string {
  const value = indicatorValues?.[row.symbol.trim().toUpperCase()]?.[key];
  return value == null ? "—" : formatNumber(value, 4);
}

function sortArrow(active: boolean, direction: "asc" | "desc"): string {
  if (!active) return "";
  return direction === "asc" ? " ▲" : " ▼";
}

export default function ResultsTable({
  rows,
  columns = DEFAULT_SCREENER_COLUMNS,
  indicatorColumns = [],
  indicatorValues,
  sort,
  page,
  loading = false,
  loadingLabel = "Running screen…",
  phases,
  error = null,
  warnings = [],
  skippedSymbols = [],
  onSortChange,
  onPageChange,
  onColumnsChange,
  onResetColumns,
  onLoadChart,
  onAddToWatchlist,
  onAddAllToWatchlist,
  onCreateWatchlistFromResults,
  selectedCompareSymbols = [],
  onToggleCompareSymbol,
  onCompareSelected,
  hasRun = false,
  onEditFilters,
  resultsViewMode = "list",
  onResultsViewModeChange,
  heatMapConfig,
  onHeatMapConfigChange,
}: Props) {
  const [visibleIndicatorKeys, setVisibleIndicatorKeys] = useState<string[]>([]);

  const indicatorKeySignature = useMemo(
    () => indicatorColumns.map((column) => column.key).join("\0"),
    [indicatorColumns],
  );

  const indicatorKeys = useMemo(
    () => indicatorColumns.map((column) => column.key),
    [indicatorKeySignature],
  );

  useEffect(() => {
    setVisibleIndicatorKeys(indicatorKeys);
  }, [indicatorKeys]);

  const activeIndicatorColumns = useMemo(
    () => indicatorColumns.filter((column) => visibleIndicatorKeys.includes(column.key)),
    [indicatorColumns, visibleIndicatorKeys],
  );

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => compareScreenerRows(a, b, sort, indicatorValues)),
    [rows, sort, indicatorValues],
  );
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 0), pageCount - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageRowsRaw = sortedRows.slice(pageStart, pageStart + PAGE_SIZE);
  const listStreamSymbols = useMemo(
    () =>
      pageRowsRaw
        .slice(0, LIVE_QUOTE_STREAM_CAP)
        .map((row) => row.symbol.trim().toUpperCase())
        .filter(Boolean),
    [pageRowsRaw],
  );
  const heatMapStreamSymbols = useMemo(
    () =>
      heatMapConfig
        ? topHeatMapQuoteSymbols(sortedRows, heatMapConfig, HEAT_MAP_QUOTE_STREAM_CAP)
        : [],
    [sortedRows, heatMapConfig],
  );
  const streamSymbols =
    resultsViewMode === "heatmap" ? heatMapStreamSymbols : listStreamSymbols;
  const { quotes } = useMarketDataQuotesForSymbols(streamSymbols);
  const overlayRows = useMemo(
    () => mergeScreenerQuoteOverlay(sortedRows, quotes),
    [sortedRows, quotes],
  );
  const pageRows = useMemo(
    () => mergeScreenerQuoteOverlay(pageRowsRaw, quotes),
    [pageRowsRaw, quotes],
  );
  const heatMapItems = useMemo(() => {
    if (!heatMapConfig) return [];
    return screenerRowsToHeatMapItems(overlayRows, heatMapConfig);
  }, [overlayRows, heatMapConfig]);
  const heatMapSizeCoverageWarning = useMemo(
    () => (heatMapConfig ? heatMapSizeMetricCoverageWarning(heatMapItems, heatMapConfig) : null),
    [heatMapItems, heatMapConfig],
  );
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!exportMessage) return;
    const timer = window.setTimeout(() => setExportMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [exportMessage]);

  const toggleIndicatorColumn = (key: string) => {
    setVisibleIndicatorKeys((prev) =>
      prev.includes(key) ? prev.filter((entry) => entry !== key) : [...prev, key],
    );
  };

  if (error) {
    return (
      <div data-testid="screener-results-error">
        <EdgeEmptyState message={error} />
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    const warningText = warnings.length > 0 ? warnings.join(" ") : undefined;
    if (!hasRun) {
      return (
        <div
          className="flex min-h-0 flex-1 flex-col justify-center py-6"
          data-testid="screener-results-never-run"
        >
          <p className="text-center text-xs text-[var(--edge-text-secondary)]">
            Results appear here after you run a screen.
          </p>
        </div>
      );
    }
    return (
      <div data-testid="screener-results-empty">
        <EdgeEmptyState
          message={warningText ?? "No symbols matched this screen. Adjust filters and run again."}
        />
        {onEditFilters ? (
          <div className="mt-2 flex justify-center">
            <EdgeButton type="button" data-testid="screener-edit-filters-empty" onClick={onEditFilters}>
              Edit filters
            </EdgeButton>
          </div>
        ) : null}
      </div>
    );
  }

  const phaseSummary = formatScreenerPhaseSummary(phases);
  const showLiveCaption =
    !loading &&
    resultsViewMode === "list" &&
    pageRowsRaw.length > 0 &&
    streamSymbols.length > 0;
  const showHeatMapLiveCaption =
    !loading &&
    resultsViewMode === "heatmap" &&
    sortedRows.length > 0 &&
    streamSymbols.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="screener-results-table">
      {loading ? <ScreenerLoadingPanel label={loadingLabel} /> : null}
      {!loading && phaseSummary ? (
        <div
          className="px-2 py-1 text-[10px] text-[var(--edge-text-secondary)]"
          data-testid="screener-phase-summary"
          role="status"
        >
          {phaseSummary}
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div
          className="px-2 py-1 text-[10px] text-[var(--edge-text-secondary)]"
          data-testid="screener-provider-warnings"
          role="status"
        >
          {warnings.join(" ")}
        </div>
      ) : null}
      {skippedSymbols.length > 0 ? (
        <div
          className="px-2 py-1 text-[10px] text-[var(--edge-text-secondary)]"
          data-testid="screener-skipped-symbols"
          role="status"
          title={skippedSymbols.join(", ")}
        >
          {skippedSymbols.length} symbol{skippedSymbols.length === 1 ? "" : "s"} skipped
          {skippedSymbols.length <= 8
            ? `: ${skippedSymbols.join(", ")}`
            : `: ${skippedSymbols.slice(0, 8).join(", ")}…`}
        </div>
      ) : null}
      {showLiveCaption ? (
        <div
          className="px-2 py-1 text-[10px] text-[var(--edge-text-muted)]"
          data-testid="screener-live-caption"
        >
          Live prices on first {Math.min(LIVE_QUOTE_STREAM_CAP, pageRowsRaw.length)} visible rows.
        </div>
      ) : null}
      {showHeatMapLiveCaption ? (
        <div
          className="px-2 py-1 text-[10px] text-[var(--edge-text-muted)]"
          data-testid="screener-heatmap-live-caption"
        >
          Live prices on top {Math.min(HEAT_MAP_QUOTE_STREAM_CAP, sortedRows.length)} symbols by size.
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--edge-border-subtle)] px-2 py-2">
          {onResultsViewModeChange ? (
            <div data-testid="screener-results-view-toggle">
              <EdgeSegmentedTabs
                segments={[
                  { id: "list", label: "List" },
                  { id: "heatmap", label: "Heat map" },
                ]}
                value={resultsViewMode}
                onChange={(id) => onResultsViewModeChange(id as ScreenerResultsViewMode)}
                className="w-auto shrink-0"
              />
            </div>
          ) : null}
          {onCompareSelected && selectedCompareSymbols.length > 0 ? (
            <EdgeButton
              type="button"
              data-testid="screener-compare-selected"
              onClick={onCompareSelected}
            >
              Compare selected ({selectedCompareSymbols.length})
            </EdgeButton>
          ) : null}
          {onAddAllToWatchlist ? (
            <EdgeButton
              type="button"
              data-testid="screener-add-all-watchlist"
              onClick={onAddAllToWatchlist}
            >
              Add all to watchlist
            </EdgeButton>
          ) : null}
          {onCreateWatchlistFromResults ? (
            <EdgeButton
              type="button"
              data-testid="screener-create-watchlist"
              onClick={onCreateWatchlistFromResults}
            >
              Create watchlist from results
            </EdgeButton>
          ) : null}
          <EdgeButton
            type="button"
            data-testid="screener-export-csv"
            onClick={() => {
              downloadResultsCsv(sortedRows, columns);
              setExportMessage("CSV downloaded");
            }}
          >
            Export CSV
          </EdgeButton>
          <EdgeButton
            type="button"
            data-testid="screener-copy-symbols"
            onClick={() => {
              void copySymbolsToClipboard(sortedRows).then((ok) => {
                setExportMessage(ok ? "Symbols copied" : "Copy failed");
              });
            }}
          >
            Copy symbols
          </EdgeButton>
          {onColumnsChange && onResetColumns ? (
            <ColumnPicker
              columns={columns}
              indicatorColumns={indicatorColumns}
              visibleIndicatorKeys={visibleIndicatorKeys}
              onColumnsChange={onColumnsChange}
              onResetColumns={onResetColumns}
              onToggleIndicatorColumn={toggleIndicatorColumn}
            />
          ) : null}
          {exportMessage ? (
            <span className="text-[10px] text-[var(--edge-text-secondary)]" role="status">
              {exportMessage}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto" data-testid="screener-results-scroll">
        {resultsViewMode === "heatmap" && heatMapConfig && onHeatMapConfigChange ? (
          <div className="flex h-full min-h-[280px] flex-col px-2 py-2" data-testid="screener-results-heatmap">
            <HeatMapToolbar
              config={heatMapConfig}
              onChange={onHeatMapConfigChange}
              className="mb-2"
            />
            {heatMapSizeCoverageWarning ? (
              <p
                className="mb-2 text-[10px] text-[var(--edge-text-muted)]"
                data-testid="heatmap-size-coverage-warning"
              >
                {heatMapSizeCoverageWarning}
              </p>
            ) : null}
            <HeatMapView
              items={heatMapItems}
              config={heatMapConfig}
              className="min-h-0 flex-1"
              onLeafClick={(item) => {
                const row = item.meta as ScreenerResultRow | undefined;
                if (row) onLoadChart(row);
              }}
            />
          </div>
        ) : (
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[var(--edge-surface-popover)]">
            <tr className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
              {onToggleCompareSymbol ? (
                <th className="w-8 px-1 py-1 font-normal" aria-label="Select for comparison">
                  <span className="sr-only">Compare</span>
                </th>
              ) : null}
              {columns.map((column) => {
                const active = sort.column === column;
                const alignClass = column === "symbol" || column === "name" || column === "country" || column === "sector" || column === "industry"
                  ? "text-left"
                  : "text-right";
                return (
                  <th key={column} className={`px-1.5 py-1 font-normal ${alignClass}`}>
                    <button
                      type="button"
                      data-testid={`screener-sort-${column}`}
                      className={`edge-focus-ring inline-flex w-full cursor-pointer items-center gap-0.5 uppercase tracking-wide ${
                        alignClass === "text-left" ? "justify-start" : "justify-end"
                      } ${
                        active
                          ? "text-[var(--edge-text-strong)]"
                          : "text-[var(--edge-text-muted)] hover:text-[var(--edge-text-primary)]"
                      }`}
                      onClick={() =>
                        onSortChange({
                          column,
                          direction:
                            active && sort.direction === "asc" ? "desc" : "asc",
                        })
                      }
                    >
                      {SCREENER_COLUMN_LABELS[column]}
                      {sortArrow(active, sort.direction)}
                    </button>
                  </th>
                );
              })}
              {activeIndicatorColumns.map((column) => {
                const active = sort.column === column.key;
                return (
                  <th key={column.key} className="px-1.5 py-1 text-right font-normal">
                    <button
                      type="button"
                      data-testid={`screener-sort-indicator-${column.key}`}
                      className={`edge-focus-ring inline-flex w-full cursor-pointer items-center justify-end gap-0.5 uppercase tracking-wide ${
                        active
                          ? "text-[var(--edge-text-strong)]"
                          : "text-[var(--edge-text-muted)] hover:text-[var(--edge-text-primary)]"
                      }`}
                      onClick={() =>
                        onSortChange({
                          column: column.key,
                          direction:
                            active && sort.direction === "asc" ? "desc" : "asc",
                        })
                      }
                    >
                      {column.label}
                      {sortArrow(active, sort.direction)}
                    </button>
                  </th>
                );
              })}
              <th className="px-1.5 py-1 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && pageRows.length === 0
              ? Array.from({ length: 8 }).map((_, rowIndex) => (
                  <tr
                    key={`skeleton-${rowIndex}`}
                    className="border-t border-[var(--edge-border-subtle)]"
                    aria-hidden
                  >
                    {onToggleCompareSymbol ? (
                      <td className="px-1 py-1" aria-hidden />
                    ) : null}
                    {columns.map((column, colIndex) => (
                      <td key={`skeleton-${rowIndex}-${column}`} className="px-1.5 py-1.5">
                        <div
                          className="h-3 animate-pulse rounded bg-[var(--edge-bg-tertiary)]"
                          style={{ width: `${55 + ((rowIndex + colIndex) % 4) * 12}%` }}
                        />
                      </td>
                    ))}
                    {activeIndicatorColumns.map((column) => (
                      <td key={`skeleton-${rowIndex}-${column.key}`} className="px-1.5 py-1.5">
                        <div className="ml-auto h-3 w-10 animate-pulse rounded bg-[var(--edge-bg-tertiary)]" />
                      </td>
                    ))}
                    <td className="px-1.5 py-1.5">
                      <div className="ml-auto h-3 w-10 animate-pulse rounded bg-[var(--edge-bg-tertiary)]" />
                    </td>
                  </tr>
                ))
              : pageRows.map((row) => (
              <tr
                key={row.symbol}
                className="border-t border-[var(--edge-border-subtle)] text-xs text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-panel)]"
              >
                {onToggleCompareSymbol ? (
                  <td className="px-1 py-1 text-center">
                    <input
                      type="checkbox"
                      data-testid={`screener-select-${row.symbol}`}
                      checked={selectedCompareSymbols.includes(
                        row.symbol.trim().toUpperCase(),
                      )}
                      onChange={() => onToggleCompareSymbol(row.symbol)}
                      aria-label={`Select ${row.symbol} for comparison`}
                    />
                  </td>
                ) : null}
                {columns.map((column) => (
                  <td
                    key={`${row.symbol}-${column}`}
                    className={`px-1.5 py-1 ${
                      column === "symbol" || column === "name" || column === "country" || column === "sector" || column === "industry"
                        ? "text-left"
                        : "text-right"
                    }`}
                  >
                    {formatCell(column, row)}
                  </td>
                ))}
                {activeIndicatorColumns.map((column) => (
                  <td
                    key={`${row.symbol}-${column.key}`}
                    className="px-1.5 py-1 text-right"
                    data-testid={`screener-indicator-cell-${row.symbol}-${column.key}`}
                  >
                    {formatIndicatorCell(column.key, row, indicatorValues)}
                  </td>
                ))}
                <td className="px-1.5 py-1">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      data-testid={`screener-load-${row.symbol}`}
                      className="edge-focus-ring rounded px-1.5 py-0.5 text-[10px] text-[var(--edge-accent-blue)] hover:bg-[var(--edge-surface-panel)]"
                      onClick={() => onLoadChart(row)}
                    >
                      Chart
                    </button>
                    <button
                      type="button"
                      data-testid={`screener-watchlist-${row.symbol}`}
                      className="edge-focus-ring rounded px-1.5 py-0.5 text-[10px] text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-panel)]"
                      onClick={() => onAddToWatchlist(row)}
                      aria-label={`Add ${row.symbol} to watchlist`}
                    >
                      +
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {resultsViewMode === "list" ? (
      <div className="flex items-center justify-between border-t border-[var(--edge-border)] px-2 py-2 text-[10px] text-[var(--edge-text-secondary)]">
        <span>
          {sortedRows.length} result{sortedRows.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="edge-focus-ring rounded px-2 py-0.5 disabled:opacity-40"
            disabled={safePage <= 0}
            onClick={() => onPageChange(safePage - 1)}
          >
            Prev
          </button>
          <span>
            Page {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="edge-focus-ring rounded px-2 py-0.5 disabled:opacity-40"
            disabled={safePage >= pageCount - 1}
            onClick={() => onPageChange(safePage + 1)}
          >
            Next
          </button>
        </div>
      </div>
      ) : (
        <div className="border-t border-[var(--edge-border)] px-2 py-2 text-[10px] text-[var(--edge-text-secondary)]">
          {sortedRows.length} result{sortedRows.length === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}

export { PAGE_SIZE as SCREENER_PAGE_SIZE };

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
}

function ScreenerLoadingPanel({ label }: { label: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => {
      setElapsed(Date.now() - start);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="flex items-center gap-3 border-b border-[var(--edge-border-subtle)] px-3 py-2.5"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="screener-loading-panel"
    >
      <div
        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[var(--edge-border)] border-t-[var(--edge-accent-blue)]"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-xs font-medium text-[var(--edge-text-strong)]"
          data-testid="screener-loading-label"
        >
          {label}
        </div>
        <div className="mt-0.5 text-[10px] text-[var(--edge-text-muted)]">
          {label.includes("technical")
            ? "Fetching prefilter candidates, then computing per-symbol technicals. This can take a while."
            : "Fetching results from market data…"}
        </div>
      </div>
      <div
        className="shrink-0 rounded bg-[var(--edge-surface-panel)] px-1.5 py-0.5 text-[10px] tabular-nums text-[var(--edge-text-secondary)]"
        data-testid="screener-loading-elapsed"
      >
        {formatElapsed(elapsed)}
      </div>
    </div>
  );
}
