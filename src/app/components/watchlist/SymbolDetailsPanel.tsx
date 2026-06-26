"use client";

import type { FundamentalsSnapshot } from "@/lib/watchlist/types";
import { toneTextClass } from "@/lib/design-system/edge";

function formatLargeNumber(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} K`;
  return value.toLocaleString();
}

function formatPrice(value: number | null, currency?: string | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

type Props = {
  symbol: string | null;
  data: FundamentalsSnapshot | null;
  note?: string;
  loading: boolean;
  error: string | null;
  onNoteChange?: (note: string) => void;
};

export default function SymbolDetailsPanel({
  symbol,
  data,
  note,
  loading,
  error,
  onNoteChange,
}: Props) {
  if (!symbol) {
    return (
      <div className="px-2 py-3 text-xs text-[var(--edge-text-secondary)]">
        Select a symbol to view details.
      </div>
    );
  }

  if (loading) {
    return (
      <div
        data-testid="symbol-details-loading"
        className="px-2 py-3 text-xs text-[var(--edge-text-secondary)]"
      >
        Loading {symbol}…
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="symbol-details-error"
        className="px-2 py-3 text-xs text-[var(--edge-negative)]"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-2 py-3 text-xs text-[var(--edge-text-secondary)]">
        No details available for {symbol}.
      </div>
    );
  }

  const changePct = data.regularMarketChangePercent;
  const isPositive = changePct != null && changePct > 0;
  const isNegative = changePct != null && changePct < 0;
  const changeClassName = isPositive
    ? toneTextClass("positive")
    : isNegative
      ? toneTextClass("negative")
      : toneTextClass("neutral");

  const currency = data.currency ?? "USD";

  return (
    <div data-testid="symbol-details-panel" className="px-2 py-2 text-xs">
      <div className="mb-1.5">
        <div className="text-sm font-semibold leading-tight text-[var(--edge-text-strong)]">
          {data.longName ?? data.shortName ?? data.symbol}
        </div>
        {data.exchange && (
          <div className="text-[10px] leading-tight text-[var(--edge-text-muted)]">
            {data.exchange}
            {data.sector && data.industry
              ? ` · ${data.sector} · ${data.industry}`
              : ""}
          </div>
        )}
      </div>

      <div className="mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tabular-nums text-[var(--edge-text-strong)]">
            {formatPrice(data.regularMarketPrice)}
          </span>
          {changePct != null && (
            <span className={`text-xs tabular-nums ${changeClassName}`}>
              {data.regularMarketChange != null
                ? `${data.regularMarketChange > 0 ? "+" : ""}${data.regularMarketChange.toFixed(2)} `
                : ""}
              {changePct > 0 ? "+" : ""}
              {changePct.toFixed(2)}%
            </span>
          )}
          <span className="text-[10px] text-[var(--edge-text-muted)]">{currency}</span>
        </div>
      </div>

      <dl className="space-y-1 text-[var(--edge-text-primary)]">
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--edge-text-muted)]">Market cap</dt>
          <dd className="tabular-nums text-[var(--edge-text-primary)]">
            {formatLargeNumber(data.marketCap)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--edge-text-muted)]">Volume</dt>
          <dd className="tabular-nums text-[var(--edge-text-primary)]">
            {formatLargeNumber(data.volume)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--edge-text-muted)]">Avg volume (30D)</dt>
          <dd className="tabular-nums text-[var(--edge-text-primary)]">
            {formatLargeNumber(data.averageVolume)}
          </dd>
        </div>
        {data.website && (
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--edge-text-muted)]">Website</dt>
            <dd>
              <a
                href={data.website.startsWith("http") ? data.website : `https://${data.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--edge-accent-blue)] hover:underline"
              >
                {data.website.replace(/^https?:\/\//, "")}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {data.description && (
        <p className="mt-2 line-clamp-4 text-[10px] leading-relaxed text-[var(--edge-text-muted)]">
          {data.description}
        </p>
      )}

      {onNoteChange ? (
        <div className="mt-3 border-t border-[var(--edge-border-subtle)] pt-2">
          <label
            htmlFor="watchlist-symbol-note"
            className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]"
          >
            Note
          </label>
          <textarea
            id="watchlist-symbol-note"
            data-testid="watchlist-symbol-note"
            value={note ?? ""}
            rows={3}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Thesis, levels, catalysts…"
            className="w-full resize-none rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-[11px] text-[var(--edge-text-primary)]"
          />
        </div>
      ) : null}
    </div>
  );
}
