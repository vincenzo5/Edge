"use client";

import type { WatchlistDisplayRow } from "@/lib/watchlist/viewModel";
import type { QuoteSnapshot, WatchlistColumnId, WatchlistViewPrefs } from "@/lib/watchlist/types";
import { toneTextClass } from "@/lib/design-system/edge";
import { formatQuoteAge, shouldShowQuoteAgeHint } from "@/lib/watchlist/formatQuoteAge";

function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

function formatChangePercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatLargeNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toLocaleString();
}

type Props = {
  row: WatchlistDisplayRow;
  quote?: QuoteSnapshot;
  selected: boolean;
  visibleColumns: WatchlistColumnId[];
  onActivate: () => void;
  onRemove: () => void;
  onTogglePin: () => void;
  onEditTags: () => void;
};

export default function WatchlistRow({
  row,
  quote,
  selected,
  visibleColumns,
  onActivate,
  onRemove,
  onTogglePin,
  onEditTags,
}: Props) {
  const { item, metrics } = row;
  const changePct = metrics.changePct;
  const isPositive = changePct != null && changePct > 0;
  const isNegative = changePct != null && changePct < 0;
  const rowClassName = selected
    ? "bg-[var(--edge-surface-active)] ring-1 ring-inset ring-[var(--edge-border-strong)]"
    : "hover:bg-[var(--edge-surface-hover)]";
  const drawerClassName = selected
    ? "bg-[var(--edge-surface-active)]"
    : "bg-[var(--edge-surface-panel)]";
  const changeClassName = isPositive
    ? toneTextClass("positive")
    : isNegative
      ? toneTextClass("negative")
      : toneTextClass("neutral");

  const renderCell = (column: WatchlistColumnId) => {
    switch (column) {
      case "symbol":
        return (
          <td key={column} className="px-1.5 py-1">
            <div className="flex min-w-0 items-center gap-1">
              {item.pinned ? (
                <span aria-label="Pinned" className="text-[10px] text-[var(--edge-accent-blue)]">
                  •
                </span>
              ) : null}
              <span className="truncate font-semibold text-[var(--edge-text-strong)]">
                {item.symbol}
              </span>
              {(item.tags ?? []).slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="truncate rounded-[var(--edge-radius-xs)] bg-[var(--edge-surface-hover)] px-1 text-[9px] text-[var(--edge-text-muted)]"
                >
                  {tag}
                </span>
              ))}
              {item.note ? (
                <span
                  aria-label="Has note"
                  title={item.note}
                  className="text-[10px] text-[var(--edge-text-muted)]"
                >
                  ✎
                </span>
              ) : null}
            </div>
          </td>
        );
      case "last":
        return (
          <td
            key={column}
            className="px-1.5 py-1 text-right tabular-nums text-[var(--edge-text-primary)]"
          >
            <span>{formatPrice(metrics.last ?? quote?.regularMarketPrice)}</span>
            {shouldShowQuoteAgeHint(quote?.updatedAt) ? (
              <span className="ml-1 text-[9px] text-[var(--edge-text-muted)]">
                · {formatQuoteAge(quote?.updatedAt)}
              </span>
            ) : null}
          </td>
        );
      case "changePct":
        return (
          <td
            key={column}
            className={`relative overflow-hidden px-1.5 py-1 text-right tabular-nums ${changeClassName}`}
          >
            {formatChangePercent(changePct)}
            <div
              className={`pointer-events-none absolute inset-y-0 right-0 flex translate-x-full items-center gap-0.5 pl-2 pr-0.5 opacity-0 shadow-[-10px_0_12px_rgba(0,0,0,0.08)] transition duration-150 ease-out group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100 ${drawerClassName}`}
            >
              <button
                type="button"
                aria-label={item.pinned ? `Unpin ${item.symbol}` : `Pin ${item.symbol}`}
                className="edge-focus-ring grid h-5 w-5 place-items-center rounded-[var(--edge-radius-sm)] text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)]"
                onClick={(event) => {
                  event.stopPropagation();
                  onTogglePin();
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M8 2.5 9.8 6.2 13.8 6.7 10.9 9.5 11.7 13.5 8 11.5 4.3 13.5 5.1 9.5 2.2 6.7 6.2 6.2 8 2.5Z"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label={`Edit tags for ${item.symbol}`}
                className="edge-focus-ring grid h-5 w-5 place-items-center rounded-[var(--edge-radius-sm)] text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)]"
                onClick={(event) => {
                  event.stopPropagation();
                  onEditTags();
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M3 8h10M8 3v10"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label={`Remove ${item.symbol} from watchlist`}
                className="edge-focus-ring grid h-5 w-5 place-items-center rounded-[var(--edge-radius-sm)] text-[var(--edge-text-secondary)] hover:bg-[color-mix(in_srgb,var(--edge-negative)_12%,transparent)] hover:text-[var(--edge-negative)]"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove();
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M6 2.75h4M3.75 4.75h8.5M5 4.75l.45 8.05c.04.72.64 1.3 1.36 1.3h2.38c.72 0 1.32-.58 1.36-1.3L11 4.75M6.75 7v4.5M9.25 7v4.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </td>
        );
      case "volume":
        return (
          <td
            key={column}
            className="px-1.5 py-1 text-right tabular-nums text-[var(--edge-text-primary)]"
          >
            {formatLargeNumber(metrics.volume)}
          </td>
        );
      case "marketCap":
        return (
          <td
            key={column}
            className="px-1.5 py-1 text-right tabular-nums text-[var(--edge-text-primary)]"
          >
            {formatLargeNumber(metrics.marketCap)}
          </td>
        );
    }
  };

  return (
    <tr
      data-testid={`watchlist-row-${item.symbol}`}
      data-selected={selected ? "true" : "false"}
      data-pinned={row.pinned ? "true" : "false"}
      className={`group cursor-pointer border-b border-[var(--edge-border-subtle)] text-xs ${rowClassName}`}
      onClick={onActivate}
    >
      {visibleColumns.map((column) => renderCell(column))}
    </tr>
  );
}
