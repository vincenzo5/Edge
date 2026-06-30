"use client";

import { useMemo, useState } from "react";
import type { ScreenerColumnId, ScreenerResultRow } from "@/lib/screener/types";
import { SCREENER_COLUMN_LABELS } from "@/lib/screener/types";
import { useMarketDataQuotesForSymbols } from "../MarketDataProvider";
import { mergeScreenerQuoteOverlay } from "./useScreenerQuoteOverlay";

export type ComparisonMetricColumn = {
  id: string;
  label: string;
  align: "left" | "right";
  getDisplay: (row: ScreenerResultRow) => string;
  getSortValue: (row: ScreenerResultRow) => number | string | null;
};

const BASE_METRIC_COLUMNS: ScreenerColumnId[] = [
  "price",
  "changePercent",
  "volume",
  "marketCap",
  "sector",
  "industry",
  "beta",
  "dividendYield",
];

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

function baseColumnDef(column: ScreenerColumnId): ComparisonMetricColumn {
  return {
    id: column,
    label: SCREENER_COLUMN_LABELS[column],
    align: column === "sector" || column === "industry" ? "left" : "right",
    getDisplay: (row) => {
      switch (column) {
        case "price":
          return formatNumber(row.price, 2);
        case "changePercent":
          return row.changePercent == null ? "—" : `${formatNumber(row.changePercent, 2)}%`;
        case "volume":
          return formatNumber(row.volume, 0);
        case "marketCap":
          return formatMarketCap(row.marketCap);
        case "sector":
          return row.sector ?? "—";
        case "industry":
          return row.industry ?? "—";
        case "beta":
          return formatNumber(row.beta, 2);
        case "dividendYield":
          return row.dividendYield == null
            ? "—"
            : `${formatNumber(row.dividendYield * 100, 2)}%`;
        default:
          return "—";
      }
    },
    getSortValue: (row) => {
      const value = row[column as keyof ScreenerResultRow];
      if (typeof value === "number" || typeof value === "string") return value;
      return null;
    },
  };
}

function indicatorColumns(
  rows: ScreenerResultRow[],
  indicatorValues?: Record<string, Record<string, number>>,
): ComparisonMetricColumn[] {
  if (!indicatorValues) return [];
  const keys = new Set<string>();
  for (const row of rows) {
    const metrics = indicatorValues[row.symbol.trim().toUpperCase()];
    if (!metrics) continue;
    for (const key of Object.keys(metrics)) keys.add(key);
  }
  return [...keys].sort().map((key) => ({
    id: `indicator:${key}`,
    label: key,
    align: "right" as const,
    getDisplay: (row) => {
      const value = indicatorValues[row.symbol.trim().toUpperCase()]?.[key];
      return value == null ? "—" : formatNumber(value, 4);
    },
    getSortValue: (row) =>
      indicatorValues[row.symbol.trim().toUpperCase()]?.[key] ?? null,
  }));
}

type Props = {
  rows: ScreenerResultRow[];
  indicatorValues?: Record<string, Record<string, number>>;
};

export default function ComparisonView({ rows, indicatorValues }: Props) {
  const [sortColumn, setSortColumn] = useState<string>("symbol");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const symbols = useMemo(
    () => rows.map((row) => row.symbol.trim().toUpperCase()).filter(Boolean),
    [rows],
  );
  const { quotes } = useMarketDataQuotesForSymbols(symbols);
  const liveRows = useMemo(
    () => mergeScreenerQuoteOverlay(rows, quotes),
    [rows, quotes],
  );

  const columns = useMemo(
    (): ComparisonMetricColumn[] => [
      ...BASE_METRIC_COLUMNS.map(baseColumnDef),
      ...indicatorColumns(liveRows, indicatorValues),
    ],
    [liveRows, indicatorValues],
  );

  const sortedRows = useMemo(() => {
    const next = [...liveRows];
    next.sort((a, b) => {
      if (sortColumn === "symbol") {
        const cmp = a.symbol.localeCompare(b.symbol);
        return sortDirection === "asc" ? cmp : -cmp;
      }
      const column = columns.find((entry) => entry.id === sortColumn);
      if (!column) return 0;
      const av = column.getSortValue(a);
      const bv = column.getSortValue(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDirection === "asc" ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return next;
  }, [liveRows, columns, sortColumn, sortDirection]);

  if (rows.length === 0) {
    return (
      <p className="px-3 py-6 text-sm text-[var(--edge-text-secondary)]">
        Select symbols from screener results to compare.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="screener-comparison-view">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[var(--edge-surface-popover)]">
            <tr className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
              <th className="px-2 py-1 text-left font-normal">
                <button
                  type="button"
                  data-testid="comparison-sort-symbol"
                  className="edge-focus-ring uppercase tracking-wide"
                  onClick={() => {
                    setSortColumn("symbol");
                    setSortDirection((prev) =>
                      sortColumn === "symbol" && prev === "asc" ? "desc" : "asc",
                    );
                  }}
                >
                  Symbol
                </button>
              </th>
              <th className="px-2 py-1 text-left font-normal">Name</th>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`px-2 py-1 font-normal ${
                    column.align === "left" ? "text-left" : "text-right"
                  }`}
                >
                  <button
                    type="button"
                    data-testid={`comparison-sort-${column.id}`}
                    className={`edge-focus-ring uppercase tracking-wide ${
                      column.align === "left" ? "" : "ml-auto block"
                    }`}
                    onClick={() => {
                      setSortColumn(column.id);
                      setSortDirection((prev) =>
                        sortColumn === column.id && prev === "asc" ? "desc" : "asc",
                      );
                    }}
                  >
                    {column.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={row.symbol}
                className="border-t border-[var(--edge-border-subtle)] text-xs text-[var(--edge-text-primary)]"
                data-testid={`comparison-row-${row.symbol}`}
              >
                <td className="px-2 py-1.5 text-left font-medium">{row.symbol}</td>
                <td className="px-2 py-1.5 text-left">{row.name ?? "—"}</td>
                {columns.map((column) => (
                  <td
                    key={`${row.symbol}-${column.id}`}
                    className={`px-2 py-1.5 ${
                      column.align === "left" ? "text-left" : "text-right"
                    }`}
                  >
                    {column.getDisplay(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-[var(--edge-border)] px-3 py-2 text-[10px] text-[var(--edge-text-muted)]">
        Live prices refresh for selected symbols during market hours.
      </div>
    </div>
  );
}
