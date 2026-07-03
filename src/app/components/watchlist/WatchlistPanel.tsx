"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  setWatchlistItemNote,
  setWatchlistItemTags,
  setWatchlistViewPrefs,
  switchWatchlist,
  toggleWatchlistItemPin,
} from "@/lib/watchlist/storage";
import type { FundamentalsSnapshot, WatchlistSortSpec, WatchlistViewPrefs } from "@/lib/watchlist/types";
import { fetchFundamentals } from "@/lib/watchlist/fundamentalsClient";
import { buildWatchlistDisplayModel, normalizeTagInput } from "@/lib/watchlist/viewModel";
import { useChartActions } from "../ChartActionsContext";
import { useWatchlistActions } from "./WatchlistContext";
import WatchlistListMenu from "./WatchlistListMenu";
import WatchlistSearch from "./WatchlistSearch";
import WatchlistTable from "./WatchlistTable";
import SymbolDetailsPanel from "./SymbolDetailsPanel";
import { useWatchlistQuoteStream } from "./useWatchlistQuoteStream";
import { useWatchlistFundamentalsCache } from "./useWatchlistFundamentalsCache";

export function WatchlistPanel() {
  const chartActions = useChartActions();
  const watchlistCtx = useWatchlistActions();

  const [fundamentals, setFundamentals] = useState<FundamentalsSnapshot | null>(null);
  const [fundamentalsLoading, setFundamentalsLoading] = useState(false);
  const [fundamentalsError, setFundamentalsError] = useState<string | null>(null);
  const [addSymbolOpen, setAddSymbolOpen] = useState(false);

  const state = watchlistCtx?.state;
  const setState = watchlistCtx?.setState;

  const activeList = state ? getActiveWatchlist(state) : null;
  const symbolKey = activeList?.items.map((i) => i.symbol).join("\0") ?? "";
  const symbols = symbolKey ? symbolKey.split("\0") : [];

  const {
    quotes,
    loading: quotesLoading,
    error: quotesError,
  } = useWatchlistQuoteStream(symbols);
  const fundamentalsCache = useWatchlistFundamentalsCache(symbols);

  const displayModel = useMemo(() => {
    if (!activeList) {
      return buildWatchlistDisplayModel([], [], {}, undefined);
    }
    return buildWatchlistDisplayModel(
      activeList.items,
      quotes,
      fundamentalsCache,
      activeList.viewPrefs,
    );
  }, [activeList, quotes, fundamentalsCache]);

  useEffect(() => {
    if (!state) return;
    const symbol = state.selectedSymbol;
    if (!symbol) {
      setFundamentals(null);
      setFundamentalsError(null);
      setFundamentalsLoading(false);
      return;
    }

    const cached = fundamentalsCache[symbol];
    if (cached) {
      setFundamentals(cached);
      setFundamentalsLoading(false);
      setFundamentalsError(null);
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
  }, [state?.selectedSymbol, state, fundamentalsCache]);

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

  const handleTogglePin = useCallback(
    (symbol: string) => {
      setState?.((prev) => toggleWatchlistItemPin(prev, symbol));
    },
    [setState],
  );

  const handleEditTags = useCallback(
    (symbol: string) => {
      if (!state) return;
      const active = getActiveWatchlist(state);
      const item = active.items.find((entry) => entry.symbol === symbol);
      const current = (item?.tags ?? []).join(", ");
      const next = window.prompt(`Tags for ${symbol} (comma-separated):`, current);
      if (next === null) return;
      const tags = next
        .split(",")
        .map((tag) => normalizeTagInput(tag))
        .filter((tag): tag is string => tag !== null);
      setState?.((prev) => setWatchlistItemTags(prev, symbol, tags));
    },
    [setState, state],
  );

  const handleNoteChange = useCallback(
    (note: string) => {
      if (!state?.selectedSymbol) return;
      setState?.((prev) => setWatchlistItemNote(prev, state.selectedSymbol!, note));
    },
    [setState, state?.selectedSymbol],
  );

  const handleViewPrefsChange = useCallback(
    (patch: Partial<WatchlistViewPrefs>) => {
      if (!state) return;
      setState?.((prev) =>
        setWatchlistViewPrefs(prev, prev.activeWatchlistId, patch),
      );
    },
    [setState, state],
  );

  const handleSortChange = useCallback(
    (sort: WatchlistSortSpec) => {
      handleViewPrefsChange({ sort });
    },
    [handleViewPrefsChange],
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

  const selectedItem = activeList?.items.find(
    (item) => item.symbol === state?.selectedSymbol,
  );

  if (!watchlistCtx) {
    return (
      <div
        data-testid="watchlist-panel-missing-context"
        className="flex min-h-0 flex-1 items-center justify-center px-3 py-6 text-xs text-[var(--edge-text-muted)]"
      >
        Watchlist unavailable
      </div>
    );
  }

  if (!state || !setState || !activeList) {
    return null;
  }

  return (
    <div data-testid="watchlist-panel" className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[var(--edge-border)]">
        <div className="flex items-center justify-between px-1.5 py-1">
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
            className="edge-icon-button edge-focus-ring grid h-6 w-6 place-items-center"
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

      <div className="min-h-0 max-h-[55%] shrink-0 overflow-auto border-b border-[var(--edge-border)]">
        <WatchlistTable
          displayModel={displayModel}
          itemCount={activeList.items.length}
          quotes={quotes}
          selectedSymbol={state.selectedSymbol}
          quotesError={quotesError}
          quotesLoading={quotesLoading && quotes.length === 0}
          onSelect={handleSelect}
          onLoadChart={handleLoadChart}
          onRemove={handleRemove}
          onTogglePin={handleTogglePin}
          onEditTags={handleEditTags}
          onViewPrefsChange={handleViewPrefsChange}
          onSortChange={handleSortChange}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <SymbolDetailsPanel
          symbol={state.selectedSymbol}
          data={fundamentals}
          note={selectedItem?.note}
          loading={fundamentalsLoading}
          error={fundamentalsError}
          onNoteChange={handleNoteChange}
        />
      </div>
    </div>
  );
}
