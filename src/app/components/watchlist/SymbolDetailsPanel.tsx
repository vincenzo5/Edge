"use client";

import type { FundamentalsSnapshot } from "@/lib/watchlist/types";

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
  const cur = currency ?? "USD";
  return `${value.toFixed(2)} ${cur}`;
}

type Props = {
  symbol: string | null;
  data: FundamentalsSnapshot | null;
  loading: boolean;
  error: string | null;
};

export default function SymbolDetailsPanel({ symbol, data, loading, error }: Props) {
  if (!symbol) {
    return (
      <div className="px-3 py-4 text-xs text-gray-500 dark:text-gray-400">
        Select a symbol to view details.
      </div>
    );
  }

  if (loading) {
    return (
      <div
        data-testid="symbol-details-loading"
        className="px-3 py-4 text-xs text-gray-500 dark:text-gray-400"
      >
        Loading {symbol}…
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="symbol-details-error"
        className="px-3 py-4 text-xs text-red-500"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-3 py-4 text-xs text-gray-500 dark:text-gray-400">
        No details available for {symbol}.
      </div>
    );
  }

  const changePct = data.regularMarketChangePercent;
  const isPositive = changePct != null && changePct > 0;
  const isNegative = changePct != null && changePct < 0;

  return (
    <div data-testid="symbol-details-panel" className="px-3 py-3 text-xs">
      <div className="mb-2">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {data.longName ?? data.shortName ?? data.symbol}
        </div>
        {data.exchange && (
          <div className="text-[10px] text-gray-500 dark:text-gray-400">
            {data.exchange}
            {data.sector && data.industry
              ? ` · ${data.sector} · ${data.industry}`
              : ""}
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {formatPrice(data.regularMarketPrice, data.currency)}
        </div>
        {changePct != null && (
          <div
            className={`tabular-nums ${
              isPositive
                ? "text-green-600 dark:text-green-400"
                : isNegative
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-500"
            }`}
          >
            {data.regularMarketChange != null
              ? `${data.regularMarketChange > 0 ? "+" : ""}${data.regularMarketChange.toFixed(2)} `
              : ""}
            {changePct > 0 ? "+" : ""}
            {changePct.toFixed(2)}%
          </div>
        )}
      </div>

      <dl className="space-y-1.5 text-gray-600 dark:text-gray-300">
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500 dark:text-gray-400">Market cap</dt>
          <dd className="tabular-nums">{formatLargeNumber(data.marketCap)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500 dark:text-gray-400">Volume</dt>
          <dd className="tabular-nums">{formatLargeNumber(data.volume)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500 dark:text-gray-400">Avg volume (30D)</dt>
          <dd className="tabular-nums">{formatLargeNumber(data.averageVolume)}</dd>
        </div>
        {data.website && (
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500 dark:text-gray-400">Website</dt>
            <dd>
              <a
                href={data.website.startsWith("http") ? data.website : `https://${data.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {data.website.replace(/^https?:\/\//, "")}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {data.description && (
        <p className="mt-3 line-clamp-4 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
          {data.description}
        </p>
      )}
    </div>
  );
}
