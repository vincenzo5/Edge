"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addWatchlistItem,
  clearWatchlist,
  createWatchlist,
  deleteWatchlist,
  duplicateWatchlist,
  getActiveWatchlist,
  removeWatchlistItem,
  renameWatchlist,
  selectWatchlistSymbol,
  switchWatchlist,
} from "@/lib/watchlist/storage";
import type { FundamentalsSnapshot, QuoteSnapshot } from "@/lib/watchlist/types";
import { fetchFundamentals } from "@/lib/watchlist/fundamentalsClient";
import { fetchQuotes } from "@/lib/watchlist/quoteClient";
import { useChartActions } from "../ChartActionsContext";
import { useWatchlistActions } from "./WatchlistContext";
import WatchlistListMenu from "./WatchlistListMenu";
import WatchlistSearch from "./WatchlistSearch";
import WatchlistTable from "./WatchlistTable";
import SymbolDetailsPanel from "./SymbolDetailsPanel";

const QUOTE_POLL_MS = 30_000;

export function WatchlistPanel() {
  const chartActions = useChartActions();
  const watchlistCtx = useWatchlistActions();

  const [quotes, setQuotes] = useState<QuoteSnapshot[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);

  const [fundamentals, setFundamentals] = useState<FundamentalsSnapshot | null>(null);
  const [fundamentalsLoading, setFundamentalsLoading] = useState(false);
  const [fundamentalsError, setFundamentalsError] = useState<string | null>(null);
  const [addSymbolOpen, setAddSymbolOpen] = useState(false);

  const state = watchlistCtx?.state;
  const setState = watchlistCtx?.setState;

  const activeList = state ? getActiveWatchlist(state) : null;
  const symbolKey = activeList?.items.map((i) => i.symbol).join("\0") ?? "";
  const symbols = symbolKey ? symbolKey.split("\0") : [];

  const refreshQuotes = useCallback(async () => {
    if (symbols.length === 0) {
      setQuotes([]);
      setQuotesError(null);
      return;
    }
    setQuotesLoading(true);
    try {
      const next = await fetchQuotes(symbols);
      setQuotes(next);
      setQuotesError(null);
    } catch (err) {
      setQuotesError(err instanceof Error ? err.message : "Failed to load quotes");
    } finally {
      setQuotesLoading(false);
    }
  }, [symbolKey, symbols.length]);

  useEffect(() => {
    if (!state) return;
    refreshQuotes();
    if (symbols.length === 0) return;

    const interval = setInterval(refreshQuotes, QUOTE_POLL_MS);
    return () => clearInterval(interval);
  }, [refreshQuotes, symbolKey, state, symbols.length]);

  useEffect(() => {
    if (!state) return;
    const symbol = state.selectedSymbol;
    if (!symbol) {
      setFundamentals(null);
      setFundamentalsError(null);
      setFundamentalsLoading(false);
      return;
    }

    let cancelled = false;
    setFundamentalsLoading(true);
    setFundamentalsError(null);

    fetchFundamentals(symbol)
      .then((data) => {
        if (!cancelled) {
          setFundamentals(data);
          setFundamentalsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFundamentals(null);
          setFundamentalsError(
            err instanceof Error ? err.message : "Failed to load fundamentals",
          );
          setFundamentalsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [state?.selectedSymbol, state]);

  const handleAdd = useCallback(
    (result: { symbol: string; name: string; exchange: string }) => {
      setState?.((prev) =>
        addWatchlistItem(prev, {
          symbol: result.symbol,
          name: result.name,
          exchange: result.exchange,
        }),
      );
    },
    [setState],
  );

  const handleSelect = useCallback(
    (symbol: string) => {
      setState?.((prev) => selectWatchlistSymbol(prev, symbol));
    },
    [setState],
  );

  const handleRemove = useCallback(
    (symbol: string) => {
      setState?.((prev) => removeWatchlistItem(prev, symbol));
    },
    [setState],
  );

  const handleLoadChart = useCallback(
    (item: { symbol: string; name?: string; exchange?: string }) => {
      if (!chartActions) return;
      chartActions.loadSymbolIntoActiveChart({
        symbol: item.symbol,
        name: item.name ?? item.symbol,
        exchange: item.exchange ?? "",
      });
    },
    [chartActions],
  );

  const handleSwitchList = useCallback(
    (watchlistId: string) => {
      setState?.((prev) => switchWatchlist(prev, watchlistId));
    },
    [setState],
  );

  const handleCreateList = useCallback(
    (name: string) => {
      setState?.((prev) => createWatchlist(prev, name));
    },
    [setState],
  );

  const handleRenameList = useCallback(
    (name: string) => {
      setState?.((prev) => renameWatchlist(prev, prev.activeWatchlistId, name));
    },
    [setState],
  );

  const handleDuplicateList = useCallback(() => {
    setState?.((prev) => duplicateWatchlist(prev, prev.activeWatchlistId));
  }, [setState]);

  const handleClearList = useCallback(() => {
    setState?.((prev) => clearWatchlist(prev, prev.activeWatchlistId));
  }, [setState]);

  const handleDeleteList = useCallback(() => {
    setState?.((prev) => deleteWatchlist(prev, prev.activeWatchlistId));
  }, [setState]);

  if (!state || !setState || !activeList) {
    return null;
  }

  return (
    <div data-testid="watchlist-panel" className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-2 py-1.5">
          <WatchlistListMenu
            watchlists={state.watchlists}
            activeWatchlistId={state.activeWatchlistId}
            activeListName={activeList.name}
            onSwitch={handleSwitchList}
            onCreate={handleCreateList}
            onRename={handleRenameList}
            onDuplicate={handleDuplicateList}
            onClear={handleClearList}
            onDelete={handleDeleteList}
          />
          <button
            type="button"
            data-testid="watchlist-add-symbol-trigger"
            aria-label={`Add symbol to ${activeList.name}`}
            onClick={() => setAddSymbolOpen(true)}
            className="grid h-7 w-7 place-items-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <WatchlistSearch
          open={addSymbolOpen}
          activeListName={activeList.name}
          onAdd={handleAdd}
          onClose={() => setAddSymbolOpen(false)}
        />
      </div>

      <div className="min-h-0 shrink-0 overflow-auto max-h-[45%] border-b border-gray-100 dark:border-gray-800">
        <WatchlistTable
          items={activeList.items}
          quotes={quotes}
          selectedSymbol={state.selectedSymbol}
          quotesError={quotesError}
          quotesLoading={quotesLoading}
          onSelect={handleSelect}
          onLoadChart={handleLoadChart}
          onRemove={handleRemove}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <SymbolDetailsPanel
          symbol={state.selectedSymbol}
          data={fundamentals}
          loading={fundamentalsLoading}
          error={fundamentalsError}
        />
      </div>
    </div>
  );
}
