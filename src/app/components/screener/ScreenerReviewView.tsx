"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo } from "react";
import { useScreenerState } from "@/app/components/screener/ScreenerProvider";
import { useWatchlistActions } from "@/app/components/watchlist/WatchlistContext";
import EdgeButton from "@/app/components/design-system/EdgeButton";
import { useMarketDataQuotesForSymbols } from "@/app/components/MarketDataProvider";
import { isEditableTarget } from "@/lib/shortcuts/isEditableTarget";
import { resolveScreenName } from "@/lib/screener/summarizeScreen";
import { useScreenerSessionModel } from "@/lib/screener/useScreenerSessionModel";
import {
  advanceReview,
  getReviewSymbol,
  keepCurrent,
  reviewProgress,
  skipCurrent,
  startReview,
} from "@/lib/screener/reviewSession";
import { addSymbolToKeepersWatchlist } from "@/lib/screener/reviewKeepers";
import type { ScreenerResultRow } from "@/lib/screener/types";
import { mergeScreenerQuoteOverlay } from "./useScreenerQuoteOverlay";
import { useScreenerReviewDrive } from "./useScreenerReviewDrive";

function formatNumber(value: number | null, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatChangePercent(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value, 2)}%`;
}

function changeTone(value: number | null): string {
  if (value == null || value === 0) return "text-[var(--edge-text-secondary)]";
  return value > 0
    ? "text-[var(--edge-accent-green)]"
    : "text-[var(--edge-accent-red)]";
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

type Props = {
  onNavigateToScreens?: () => void;
};

export default function ScreenerReviewView({ onNavigateToScreens }: Props = {}) {
  const { setSession } = useScreenerState();
  const watchlistCtx = useWatchlistActions();
  const { state, session, sortedRows, hasRun } = useScreenerSessionModel(true);

  const reviewIndex = session.reviewIndex;
  const keepers = session.keepers;
  const progress = reviewProgress(reviewIndex, sortedRows.length);
  const screenName = resolveScreenName(state);
  const showScreenName = state.activeScreenId != null;

  const currentRow = useMemo(
    () => getReviewSymbol(sortedRows, reviewIndex),
    [sortedRows, reviewIndex],
  );

  const quoteSymbols = useMemo(
    () => (currentRow ? [normalizeSymbol(currentRow.symbol)] : []),
    [currentRow],
  );
  const { quotes } = useMarketDataQuotesForSymbols(quoteSymbols);
  const displayRow = useMemo(() => {
    if (!currentRow) return null;
    const [merged] = mergeScreenerQuoteOverlay([currentRow], quotes);
    return merged ?? currentRow;
  }, [currentRow, quotes]);

  useScreenerReviewDrive(displayRow);

  useEffect(() => {
    if (!hasRun || sortedRows.length === 0) return;
    if (!session.reviewActive) {
      setSession((prev) => startReview(prev));
    }
  }, [hasRun, sortedRows.length, session.reviewActive, setSession]);

  const handleOpenChart = useCallback(() => {
    window.open("/chart", "_blank", "noopener,noreferrer");
  }, []);

  const moveReview = useCallback(
    (delta: 1 | -1) => {
      setSession((prev) => advanceReview(prev, sortedRows, delta));
    },
    [setSession, sortedRows],
  );

  const handleKeep = useCallback(() => {
    const row = getReviewSymbol(sortedRows, reviewIndex);
    if (!row) return;

    setSession((prev) => keepCurrent(prev, sortedRows));
    watchlistCtx?.setState((prev) =>
      addSymbolToKeepersWatchlist(prev, row.symbol, row.name ?? undefined),
    );
  }, [reviewIndex, setSession, sortedRows, watchlistCtx]);

  const handleSkip = useCallback(() => {
    setSession((prev) => skipCurrent(prev, sortedRows));
  }, [setSession, sortedRows]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (!hasRun || sortedRows.length === 0) return;

      const key = event.key.toLowerCase();

      if (event.key === "ArrowDown" || key === "j") {
        event.preventDefault();
        moveReview(1);
        return;
      }

      if (event.key === "ArrowUp" || key === "k") {
        event.preventDefault();
        moveReview(-1);
        return;
      }

      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        handleKeep();
        return;
      }

      if (key === "x") {
        event.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKeep, handleSkip, hasRun, moveReview, sortedRows.length]);

  if (!hasRun) {
    return (
      <div
        data-testid="screener-review-view"
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6"
      >
        <div data-testid="screener-review-empty" className="text-center">
          <h1 className="text-sm font-semibold text-[var(--edge-text-strong)]">Review</h1>
          <p className="mt-2 text-sm text-[var(--edge-text-secondary)]">
            Run a screen first, then review results one symbol at a time.
          </p>
          {onNavigateToScreens ? (
            <EdgeButton
              type="button"
              data-testid="screener-review-empty-cta"
              onClick={onNavigateToScreens}
            >
              Go to Screens
            </EdgeButton>
          ) : (
            <Link
              href="/screener/screens"
              data-testid="screener-review-empty-cta"
              className="mt-4 inline-flex rounded border border-[var(--edge-border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--edge-accent-blue)] hover:border-[var(--edge-accent-blue)]"
            >
              Go to Screens
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="screener-review-view"
      className="flex min-h-0 flex-1 flex-col gap-3 p-4"
    >
      <header
        data-testid="screener-review-header"
        className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--edge-border-subtle)] pb-3"
      >
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-[var(--edge-text-strong)]">Review</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--edge-text-secondary)]">
            <span data-testid="screener-review-progress">{progress.label}</span>
            {showScreenName ? (
              <span data-testid="screener-review-screen-name">{screenName}</span>
            ) : null}
          </div>
        </div>
        <EdgeButton
          data-testid="screener-review-open-chart"
          variant="primary"
          onClick={handleOpenChart}
        >
          Open Chart
        </EdgeButton>
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        <aside
          data-testid="screener-review-queue"
          className="flex w-52 shrink-0 flex-col border-r border-[var(--edge-border-subtle)] pr-3"
        >
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--edge-text-secondary)]">
            Queue
          </div>
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            {sortedRows.map((row, index) => {
              const isCurrent = index === reviewIndex;
              const isKeeper = keepers.includes(normalizeSymbol(row.symbol));
              const isSkipped = session.skipped.includes(normalizeSymbol(row.symbol));
              return (
                <li key={row.symbol}>
                  <button
                    type="button"
                    data-testid={`screener-review-queue-item-${row.symbol}`}
                    aria-current={isCurrent ? "true" : undefined}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs ${
                      isCurrent
                        ? "bg-[var(--edge-surface-hover)] font-semibold text-[var(--edge-text-strong)]"
                        : "text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-panel)]"
                    }`}
                    onClick={() =>
                      setSession((prev) => ({ ...prev, reviewIndex: index }))
                    }
                  >
                    <span>{row.symbol}</span>
                    <span className="text-[10px] text-[var(--edge-text-secondary)]">
                      {isKeeper ? "keep" : isSkipped ? "skip" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div
            data-testid="screener-review-keepers"
            className="mt-3 border-t border-[var(--edge-border-subtle)] pt-3"
          >
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--edge-text-secondary)]">
              Keepers ({keepers.length})
            </div>
            {keepers.length === 0 ? (
              <p className="text-xs text-[var(--edge-text-secondary)]">None yet</p>
            ) : (
              <ul className="space-y-0.5">
                {keepers.map((symbol) => (
                  <li
                    key={symbol}
                    data-testid={`screener-review-keeper-${symbol}`}
                    className="text-xs text-[var(--edge-text-primary)]"
                  >
                    {symbol}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {displayRow ? (
            <SymbolInfoCard row={displayRow} />
          ) : (
            <p className="text-sm text-[var(--edge-text-secondary)]">
              No symbols left in the review queue.
            </p>
          )}

          <p className="mt-auto pt-4 text-xs text-[var(--edge-text-secondary)]">
            ↑/↓ or j/k next · Space keep · x skip
          </p>
        </main>
      </div>
    </div>
  );
}

function SymbolInfoCard({ row }: { row: ScreenerResultRow }) {
  const changeClass = changeTone(row.changePercent);

  return (
    <article
      data-testid="screener-review-symbol-card"
      className="rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)] p-4"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          data-testid="screener-review-current-symbol"
          className="text-lg font-semibold text-[var(--edge-text-strong)]"
        >
          {row.symbol}
        </h2>
        {row.name ? (
          <span className="text-sm text-[var(--edge-text-secondary)]">{row.name}</span>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--edge-text-secondary)]">
            Price
          </div>
          <div
            data-testid="screener-review-price"
            className="text-2xl font-semibold text-[var(--edge-text-strong)]"
          >
            {formatNumber(row.price, 2)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--edge-text-secondary)]">
            Change
          </div>
          <div
            data-testid="screener-review-change"
            className={`text-2xl font-semibold ${changeClass}`}
          >
            {formatChangePercent(row.changePercent)}
          </div>
        </div>
      </div>
    </article>
  );
}
