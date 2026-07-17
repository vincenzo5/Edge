"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useScreenerState } from "@/app/components/screener/ScreenerProvider";
import { ensureKeepersWatchlist } from "@/lib/screener/reviewKeepers";
import { REVIEW_KEEPERS_WATCHLIST_NAME } from "@/lib/screener/reviewSession";
import {
  addWatchlistItems,
  switchWatchlist,
} from "@/lib/watchlist/storage";
import { useWatchlistActions } from "../watchlist/WatchlistContext";
import { EdgeButton, EdgeEmptyState } from "../design-system";

export function ScreenerKeepersBody({
  onNavigateToReview,
  onOpenChart,
}: {
  onNavigateToReview?: () => void;
  onOpenChart?: () => void;
} = {}) {
  const router = useRouter();
  const { session } = useScreenerState();
  const watchlistCtx = useWatchlistActions();

  const rowsBySymbol = useMemo(() => {
    const map = new Map<string, { name?: string; exchange?: string }>();
    for (const row of session.lastRun?.rows ?? []) {
      map.set(row.symbol.trim().toUpperCase(), {
        name: row.name ?? undefined,
        exchange: row.exchange ?? undefined,
      });
    }
    return map;
  }, [session.lastRun?.rows]);

  const keeperEntries = useMemo(
    () =>
      session.keepers.map((symbol) => ({
        symbol,
        ...(rowsBySymbol.get(symbol) ?? {}),
      })),
    [session.keepers, rowsBySymbol],
  );

  const handleOpenWatchlist = useCallback(() => {
    if (keeperEntries.length === 0) return;

    watchlistCtx?.setState((prev) => {
      const { state: withKeepers, watchlistId } = ensureKeepersWatchlist(prev);
      const synced = addWatchlistItems(
        switchWatchlist(withKeepers, watchlistId),
        keeperEntries.map((entry) => ({
          symbol: entry.symbol,
          name: entry.name,
          exchange: entry.exchange,
        })),
      );
      return switchWatchlist(synced, watchlistId);
    });
    if (onOpenChart) {
      onOpenChart();
      return;
    }
    router.push("/chart");
  }, [keeperEntries, onOpenChart, router, watchlistCtx]);

  return (
    <div
      data-testid="screener-keepers-view"
      className="flex min-h-0 flex-1 flex-col overflow-hidden p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-sm font-semibold text-[var(--edge-text-strong)]">Keepers</h1>
        {keeperEntries.length > 0 ? (
          <EdgeButton
            type="button"
            data-testid="screener-keepers-open-watchlist"
            onClick={handleOpenWatchlist}
          >
            Open {REVIEW_KEEPERS_WATCHLIST_NAME} watchlist
          </EdgeButton>
        ) : null}
      </div>

      {keeperEntries.length === 0 ? (
        <EdgeEmptyState message="No kept symbols yet. Mark symbols as keepers during review." />
      ) : (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto" data-testid="screener-keepers-list">
          {keeperEntries.map((entry) => (
            <li
              key={entry.symbol}
              className="flex items-center justify-between rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)] px-3 py-2"
              data-testid={`screener-keeper-${entry.symbol}`}
            >
              <div>
                <span className="text-sm font-medium text-[var(--edge-text-strong)]">
                  {entry.symbol}
                </span>
                {entry.name ? (
                  <span className="ml-2 text-xs text-[var(--edge-text-secondary)]">
                    {entry.name}
                  </span>
                ) : null}
              </div>
              {onNavigateToReview ? (
                <button
                  type="button"
                  className="text-xs text-[var(--edge-accent-blue)] hover:underline"
                  data-testid={`screener-keeper-review-${entry.symbol}`}
                  onClick={onNavigateToReview}
                >
                  Review
                </button>
              ) : (
                <a
                  href="/screener/review"
                  className="text-xs text-[var(--edge-accent-blue)] hover:underline"
                  data-testid={`screener-keeper-review-${entry.symbol}`}
                >
                  Review
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
