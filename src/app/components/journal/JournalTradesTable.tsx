"use client";

import Link from "next/link";
import { EdgeButton, EdgeEmptyState } from "@/app/components/design-system";
import {
  JOURNAL_FILTERED_EMPTY_MESSAGE,
  JOURNAL_GLOBAL_EMPTY_MESSAGE,
} from "@/lib/journal/journalEmptyCopy";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import { buildChartDeepLink } from "@/lib/journal/chartDeepLink";
import { computeRMultiple } from "@/lib/journal/rMultiple";
import {
  deriveTradeOutcomeStatus,
  formatTradeMoney,
  formatTradePrice,
  pnlToneClass,
} from "@/lib/journal/journalTradeDisplay";
import {
  JOURNAL_TRADES_TABLE_COLUMNS,
  sortIndicator,
  sortAriaValue,
  toggleJournalTradesTableSort,
  type JournalTradesTableColumnId,
  type JournalTradesTableDensity,
  type JournalTradesTableSort,
} from "@/lib/journal/journalTradesTableControls";
import JournalTradeStatusBadge from "@/app/components/journal/JournalTradeStatusBadge";

export type JournalTradesTableEmptyVariant = "none" | "no-trades" | "filtered";

type Props = {
  trades: JournalTradeResponse[];
  selectedTradeId: string | null;
  onSelectTrade: (tradeId: string) => void;
  sort: JournalTradesTableSort;
  onSortChange: (sort: JournalTradesTableSort) => void;
  visibleColumns: Set<JournalTradesTableColumnId>;
  density: JournalTradesTableDensity;
  emptyVariant: JournalTradesTableEmptyVariant;
  onClearFilters?: () => void;
};

const DENSITY_ROW_CLASS: Record<JournalTradesTableDensity, string> = {
  compact: "text-xs",
  comfortable: "text-sm",
};

const DENSITY_CELL_CLASS: Record<JournalTradesTableDensity, string> = {
  compact: "px-3 py-2",
  comfortable: "px-3 py-2.5",
};

function isColumnVisible(visibleColumns: Set<JournalTradesTableColumnId>, id: JournalTradesTableColumnId) {
  return visibleColumns.has(id);
}

export default function JournalTradesTable({
  trades,
  selectedTradeId,
  onSelectTrade,
  sort,
  onSortChange,
  visibleColumns,
  density,
  emptyVariant,
  onClearFilters,
}: Props) {
  if (emptyVariant === "no-trades") {
    return (
      <div data-testid="journal-trades-empty">
        <EdgeEmptyState message={JOURNAL_GLOBAL_EMPTY_MESSAGE} />
      </div>
    );
  }

  if (emptyVariant === "filtered") {
    return (
      <div data-testid="journal-trades-filtered-empty">
        <EdgeEmptyState
          message={JOURNAL_FILTERED_EMPTY_MESSAGE}
          action={
            onClearFilters ? (
              <EdgeButton variant="chrome" onClick={onClearFilters}>
                Clear filters
              </EdgeButton>
            ) : undefined
          }
        />
      </div>
    );
  }

  const headerColumns = JOURNAL_TRADES_TABLE_COLUMNS.filter((col) => visibleColumns.has(col.id));
  const rowTextClass = DENSITY_ROW_CLASS[density];
  const cellClass = DENSITY_CELL_CLASS[density];

  return (
    <div
      className="overflow-x-auto rounded border border-[var(--edge-border)]"
      data-testid="journal-trades-table"
      data-density={density}
    >
      <table className={`min-w-full text-left ${rowTextClass}`}>
        <thead className="sticky top-0 z-10 bg-[var(--edge-surface-panel)] text-[var(--edge-text-secondary)]">
          <tr>
            {headerColumns.map((column) => {
              if (column.sortable && column.sortKey) {
                return (
                  <th key={column.id} className={cellClass}>
                    <button
                      type="button"
                      data-testid={`journal-trades-sort-${column.id}`}
                      aria-sort={sortAriaValue(sort, column.id)}
                      className="inline-flex items-center gap-1 font-inherit hover:text-[var(--edge-text-primary)]"
                      onClick={() => {
                        const next = toggleJournalTradesTableSort(sort, column.id);
                        if (next) onSortChange(next);
                      }}
                    >
                      <span>{column.label}</span>
                      <span aria-hidden className="text-[10px] opacity-70">
                        {sortIndicator(sort, column.id)}
                      </span>
                    </button>
                  </th>
                );
              }
              return (
                <th key={column.id} className={cellClass}>
                  {column.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr
              key={trade.id}
              data-testid={`journal-trades-row-${trade.id}`}
              className={`cursor-pointer border-t border-[var(--edge-border-subtle)] hover:bg-[var(--edge-surface-panel)] ${
                selectedTradeId === trade.id ? "bg-[var(--edge-surface-panel)]" : ""
              }`}
              onClick={() => onSelectTrade(trade.id)}
            >
              {isColumnVisible(visibleColumns, "openDate") ? (
                <td className={cellClass}>{trade.openedAt.slice(0, 10)}</td>
              ) : null}
              {isColumnVisible(visibleColumns, "symbol") ? (
                <td className={`${cellClass} font-medium`}>{trade.symbol}</td>
              ) : null}
              {isColumnVisible(visibleColumns, "status") ? (
                <td className={cellClass}>
                  <JournalTradeStatusBadge status={deriveTradeOutcomeStatus(trade)} />
                </td>
              ) : null}
              {isColumnVisible(visibleColumns, "closeDate") ? (
                <td className={cellClass}>{trade.closedAt?.slice(0, 10) ?? "—"}</td>
              ) : null}
              {isColumnVisible(visibleColumns, "entry") ? (
                <td className={cellClass}>{formatTradePrice(trade.avgEntry)}</td>
              ) : null}
              {isColumnVisible(visibleColumns, "exit") ? (
                <td className={cellClass}>{formatTradePrice(trade.avgExit)}</td>
              ) : null}
              {isColumnVisible(visibleColumns, "r") ? (
                <td className={cellClass}>
                  {(() => {
                    const r = computeRMultiple(trade);
                    return r != null ? `${r.toFixed(2)}R` : "—";
                  })()}
                </td>
              ) : null}
              {isColumnVisible(visibleColumns, "setup") ? (
                <td className={`${cellClass} capitalize`}>{trade.setup ?? "—"}</td>
              ) : null}
              {isColumnVisible(visibleColumns, "tags") ? (
                <td className={cellClass}>{(trade.tags ?? []).join(", ") || "—"}</td>
              ) : null}
              {isColumnVisible(visibleColumns, "netPnL") ? (
                <td className={`${cellClass} ${pnlToneClass(trade.netPnL)}`}>
                  {formatTradeMoney(trade.netPnL)}
                </td>
              ) : null}
              {isColumnVisible(visibleColumns, "direction") ? (
                <td className={`${cellClass} capitalize`}>{trade.direction}</td>
              ) : null}
              {isColumnVisible(visibleColumns, "secType") ? (
                <td className={cellClass}>{trade.secType}</td>
              ) : null}
              {isColumnVisible(visibleColumns, "activity") ? (
                <td className={cellClass}>
                  {(trade.closedAt ?? trade.openedAt).slice(0, 10)}
                </td>
              ) : null}
              {isColumnVisible(visibleColumns, "chart") ? (
                <td className={cellClass}>
                  <Link
                    href={buildChartDeepLink(trade)}
                    data-testid={`journal-trades-chart-${trade.id}`}
                    className="text-[var(--edge-accent-blue)] hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Open
                  </Link>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
