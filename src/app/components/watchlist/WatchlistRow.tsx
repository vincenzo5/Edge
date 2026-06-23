"use client";

import type { QuoteSnapshot } from "@/lib/watchlist/types";
import type { WatchlistItem } from "@/lib/watchlist/types";
import { toneTextClass } from "@/lib/design-system/tradingView";

function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

function formatChangePercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

type Props = {
  item: WatchlistItem;
  quote?: QuoteSnapshot;
  selected: boolean;
  onActivate: () => void;
  onRemove: () => void;
};

export default function WatchlistRow({
  item,
  quote,
  selected,
  onActivate,
  onRemove,
}: Props) {
  const changePct = quote?.regularMarketChangePercent;
  const isPositive = changePct != null && changePct > 0;
  const isNegative = changePct != null && changePct < 0;
  const rowClassName = selected
    ? "bg-[var(--tv-surface-active)]"
    : "hover:bg-[var(--tv-surface-hover)]";
  const drawerClassName = selected
    ? "bg-[var(--tv-surface-active)]"
    : "bg-[var(--tv-surface-panel)]";
  const changeClassName = isPositive
    ? toneTextClass("positive")
    : isNegative
      ? toneTextClass("negative")
      : toneTextClass("neutral");

  return (
    <tr
      data-testid={`watchlist-row-${item.symbol}`}
      data-selected={selected ? "true" : "false"}
      className={`group cursor-pointer border-b border-[var(--tv-border-subtle)] text-xs ${rowClassName}`}
      onClick={onActivate}
    >
      <td className="px-2 py-1.5">
        <div className="flex items-center">
          <span className="font-semibold text-[var(--tv-text-strong)]">
            {item.symbol}
          </span>
        </div>
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-[var(--tv-text-primary)]">
        {formatPrice(quote?.regularMarketPrice)}
      </td>
      <td
        className={`relative overflow-hidden px-2 py-1.5 text-right tabular-nums ${changeClassName}`}
      >
        {formatChangePercent(changePct)}
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 flex translate-x-full items-center pl-3 pr-1 opacity-0 shadow-[-10px_0_12px_rgba(0,0,0,0.08)] transition duration-150 ease-out group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100 ${drawerClassName}`}
        >
          <button
            type="button"
            aria-label={`Remove ${item.symbol} from watchlist`}
            className="tv-focus-ring grid h-6 w-6 place-items-center rounded-[var(--tv-radius-sm)] text-[var(--tv-text-secondary)] hover:bg-[color-mix(in_srgb,var(--tv-negative)_12%,transparent)] hover:text-[var(--tv-negative)]"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
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
    </tr>
  );
}
